import "server-only";
import { and, asc, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  clientPackages,
  clients,
  coachingSessions,
  contacts,
  packages,
  pipelineStages,
  tasks,
} from "@/server/db/schema";
import { requireCoach } from "@/server/dal";

const DAY = 86_400_000;

/** Relative change, or null when there is no previous value to compare with. */
const trend = (current: number, previous: number) => (previous > 0 ? (current - previous) / previous : null);

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
}

export async function getDashboard() {
  const user = await requireCoach();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const in7Days = new Date(startOfDay.getTime() + 7 * DAY);
  const d30 = new Date(now.getTime() - 30 * DAY);
  const d60 = new Date(now.getTime() - 60 * DAY);
  const weeksStart = new Date(startOfWeek(now).getTime() - 7 * 7 * DAY); // 8 weeks incl. current

  const [
    [activeClients],
    [newLeads30],
    [newLeadsPrev],
    [done30],
    [donePrev],
    revenueRows,
    upcoming,
    dueTasks,
    recentContacts,
    sessionsForChart,
    sources,
  ] = await Promise.all([
    db.select({ n: count() }).from(clients).where(eq(clients.status, "active")),
    db.select({ n: count() }).from(contacts).where(gte(contacts.createdAt, d30)),
    db.select({ n: count() }).from(contacts).where(and(gte(contacts.createdAt, d60), lt(contacts.createdAt, d30))),
    db
      .select({ n: count() })
      .from(coachingSessions)
      .where(and(eq(coachingSessions.status, "done"), gte(coachingSessions.startsAt, d30), lt(coachingSessions.startsAt, now))),
    db
      .select({ n: count() })
      .from(coachingSessions)
      .where(and(eq(coachingSessions.status, "done"), gte(coachingSessions.startsAt, d60), lt(coachingSessions.startsAt, d30))),
    db
      .select({ price: packages.price, purchasedAt: clientPackages.purchasedAt })
      .from(clientPackages)
      .innerJoin(packages, eq(clientPackages.packageId, packages.id))
      .where(and(inArray(clientPackages.paymentStatus, ["paid", "partial"]), gte(clientPackages.purchasedAt, d60))),
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
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        source: contacts.source,
        createdAt: contacts.createdAt,
        estimatedValue: contacts.estimatedValue,
        stageName: pipelineStages.name,
        stageColor: pipelineStages.color,
      })
      .from(contacts)
      .leftJoin(pipelineStages, eq(contacts.stageId, pipelineStages.id))
      .orderBy(desc(contacts.createdAt))
      .limit(5),
    db
      .select({ startsAt: coachingSessions.startsAt, status: coachingSessions.status })
      .from(coachingSessions)
      .where(and(gte(coachingSessions.startsAt, weeksStart), sql`${coachingSessions.status} in ('done', 'planned')`)),
    db
      .select({ source: sql<string>`coalesce(${contacts.source}, 'Inconnue')`, n: count() })
      .from(contacts)
      .groupBy(sql`coalesce(${contacts.source}, 'Inconnue')`)
      .orderBy(desc(count())),
  ]);

  const revenue30 = revenueRows.filter((r) => r.purchasedAt >= d30).reduce((s, r) => s + Number(r.price), 0);
  const revenuePrev = revenueRows.filter((r) => r.purchasedAt < d30).reduce((s, r) => s + Number(r.price), 0);

  // Sessions per week (last 8 weeks, current week included)
  const currentWeek = startOfWeek(now).getTime();
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = weeksStart.getTime() + i * 7 * DAY;
    return { start: new Date(start), done: 0, planned: 0, current: start === currentWeek };
  });
  for (const s of sessionsForChart) {
    const idx = Math.floor((startOfWeek(s.startsAt).getTime() - weeksStart.getTime()) / (7 * DAY));
    if (idx >= 0 && idx < 8) weeks[idx][s.status === "done" ? "done" : "planned"]++;
  }

  // Top 4 sources + "Autres"
  const top = sources.slice(0, 4);
  const others = sources.slice(4).reduce((n, s) => n + s.n, 0);
  const sourceSlices = others ? [...top, { source: "Autres", n: others }] : top;

  return {
    firstName: user.name.split(" ")[0],
    sessionsToday: upcoming.filter((s) => s.startsAt < new Date(startOfDay.getTime() + DAY)).length,
    stats: {
      activeClients: activeClients.n,
      newLeads: { value: newLeads30.n, trend: trend(newLeads30.n, newLeadsPrev.n) },
      sessionsDone: { value: done30.n, trend: trend(done30.n, donePrev.n) },
      revenue: { value: revenue30, trend: trend(revenue30, revenuePrev) },
    },
    weeks,
    sourceSlices,
    upcoming,
    dueTasks,
    recentContacts,
  };
}
