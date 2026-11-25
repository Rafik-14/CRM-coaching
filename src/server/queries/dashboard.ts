import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { clientPackages, clients, coachingSessions, contacts, packages, pipelineStages, tasks } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { addMoney, type MoneyByCurrency } from "@/lib/format";

const DAY = 86_400_000;

/**
 * The home screen, in the order Jérémy reads it (Nov. 2026, « CRM simplifié »):
 * 1. his clients (active ones with their programme, then the newest contacts), 2. his earnings, 3. today and to-dos.
 * No charts: the 12-month activity, weekly sessions and sources graphs were removed from the home screen.
 */
export async function getHome() {
  const user = await requireCoach();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const in7Days = new Date(startOfDay.getTime() + 7 * DAY);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [activeClients, newContacts, revenueRows, [activeCount], upcoming, dueTasks] = await Promise.all([
    // Active clients, each with their latest programme and how far along it is.
    db
      .select({
        contactId: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        packageName: packages.name,
        sessionsUsed: clientPackages.sessionsUsed,
        sessionsCount: packages.sessionsCount,
      })
      .from(clients)
      .innerJoin(contacts, eq(clients.contactId, contacts.id))
      .leftJoin(
        clientPackages,
        eq(
          clientPackages.id,
          sql`(select cp.id from client_packages cp where cp.client_id = ${clients.id} order by cp.purchased_at desc limit 1)`,
        ),
      )
      .leftJoin(packages, eq(clientPackages.packageId, packages.id))
      .where(eq(clients.status, "active"))
      .orderBy(desc(clients.startDate))
      .limit(8),
    // The newest contacts who are not clients yet, with their status.
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        source: contacts.source,
        createdAt: contacts.createdAt,
        stageName: pipelineStages.name,
        stageColor: pipelineStages.color,
      })
      .from(contacts)
      .leftJoin(clients, eq(clients.contactId, contacts.id))
      .leftJoin(pipelineStages, eq(contacts.stageId, pipelineStages.id))
      .where(isNull(clients.id))
      .orderBy(desc(contacts.createdAt))
      .limit(5),
    db
      .select({
        // Price/currency frozen on the sale (fallback: package list price for old rows).
        price: sql<string>`coalesce(${clientPackages.price}, ${packages.price})`,
        currency: sql<string>`coalesce(${clientPackages.currency}, ${packages.currency})`,
        purchasedAt: clientPackages.purchasedAt,
      })
      .from(clientPackages)
      .innerJoin(packages, eq(clientPackages.packageId, packages.id))
      .where(and(inArray(clientPackages.paymentStatus, ["paid", "partial"]), gte(clientPackages.purchasedAt, startOfYear))),
    db.select({ n: count() }).from(clients).where(eq(clients.status, "active")),
    db.query.coachingSessions.findMany({
      where: and(
        eq(coachingSessions.status, "planned"),
        gte(coachingSessions.startsAt, now),
        lt(coachingSessions.startsAt, in7Days),
      ),
      orderBy: asc(coachingSessions.startsAt),
      limit: 6,
      with: { contact: true },
    }),
    db.query.tasks.findMany({
      where: eq(tasks.done, false),
      orderBy: asc(tasks.dueAt),
      limit: 6,
      with: { contact: true },
    }),
  ]);

  // Earnings per currency (EUR and CHF are never converted or summed together).
  const month: MoneyByCurrency = {};
  const year: MoneyByCurrency = {};
  for (const r of revenueRows) {
    addMoney(year, r.price, r.currency);
    if (r.purchasedAt >= startOfMonth) addMoney(month, r.price, r.currency);
  }

  return {
    firstName: user.name.split(" ")[0],
    sessionsToday: upcoming.filter((s) => s.startsAt < new Date(startOfDay.getTime() + DAY)).length,
    activeClients,
    newContacts,
    earnings: { month, year, activeClients: activeCount.n },
    upcoming,
    dueTasks,
  };
}
