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
import { addMoney, APP_TIME_ZONE, type MoneyByCurrency } from "@/lib/format";
import { DISCOVERY_TYPE } from "@/lib/validations/coaching";

const DAY = 86_400_000;

/** Relative change, or null when there is no previous value to compare with. */
const trend = (current: number, previous: number) => (previous > 0 ? (current - previous) / previous : null);

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
}

/**
 * Calendar month key in the app's time zone (« 2026-10 »), used to bucket the 12-month activity chart.
 * The zone is written as a literal (not a bound parameter) so the SELECT and GROUP BY expressions are identical.
 */
const TZ_LITERAL = /^[A-Za-z0-9_/+-]+$/.test(APP_TIME_ZONE) ? APP_TIME_ZONE : "Europe/Zurich";
const monthKey = (col: unknown) => sql<string>`to_char(${col} at time zone ${sql.raw(`'${TZ_LITERAL}'`)}, 'YYYY-MM')`;
const keyOf = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: APP_TIME_ZONE }).format(d).slice(0, 7);

export type ActivityMonth = { key: string; start: Date; contacts: number; calls: number; clients: number };

export async function getDashboard() {
  const user = await requireCoach();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const in7Days = new Date(startOfDay.getTime() + 7 * DAY);
  const d30 = new Date(now.getTime() - 30 * DAY);
  const d60 = new Date(now.getTime() - 60 * DAY);
  const weeksStart = new Date(startOfWeek(now).getTime() - 7 * 7 * DAY); // 8 weeks incl. current
  // 12 calendar months, current month included (a few hours of margin for the time-zone shift).
  const monthsStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const monthsQueryStart = new Date(monthsStart.getTime() - DAY);

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
    contactsByMonth,
    callsByMonth,
    clientsByMonth,
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
      .select({
        // Price/currency frozen on the sale (fallback: package list price for old rows).
        price: sql<string>`coalesce(${clientPackages.price}, ${packages.price})`,
        currency: sql<string>`coalesce(${clientPackages.currency}, ${packages.currency})`,
        purchasedAt: clientPackages.purchasedAt,
      })
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
        currency: contacts.currency,
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
    // 12-month activity: new contacts, strategy calls held, new clients.
    db
      .select({ key: monthKey(contacts.createdAt), n: count() })
      .from(contacts)
      .where(gte(contacts.createdAt, monthsQueryStart))
      .groupBy(monthKey(contacts.createdAt)),
    db
      .select({ key: monthKey(coachingSessions.startsAt), n: count() })
      .from(coachingSessions)
      .where(
        and(
          eq(coachingSessions.type, DISCOVERY_TYPE),
          eq(coachingSessions.status, "done"),
          gte(coachingSessions.startsAt, monthsQueryStart),
          lt(coachingSessions.startsAt, now),
        ),
      )
      .groupBy(monthKey(coachingSessions.startsAt)),
    db
      .select({ key: monthKey(clients.createdAt), n: count() })
      .from(clients)
      .where(gte(clients.createdAt, monthsQueryStart))
      .groupBy(monthKey(clients.createdAt)),
  ]);

  // Revenue per currency (EUR and CHF are never converted or summed together).
  const revenue30: MoneyByCurrency = {};
  const revenuePrev: MoneyByCurrency = {};
  for (const r of revenueRows) addMoney(r.purchasedAt >= d30 ? revenue30 : revenuePrev, r.price, r.currency);
  const currencies = new Set([...Object.keys(revenue30), ...Object.keys(revenuePrev)]);
  const [only] = currencies;
  // A trend only makes sense within one currency.
  const revenueTrend = currencies.size === 1 ? trend(revenue30[only] ?? 0, revenuePrev[only] ?? 0) : null;

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

  const byKey = (rows: { key: string; n: number }[]) => new Map(rows.map((r) => [r.key, r.n]));
  const [c, k, cl] = [byKey(contactsByMonth), byKey(callsByMonth), byKey(clientsByMonth)];
  const months: ActivityMonth[] = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(monthsStart.getFullYear(), monthsStart.getMonth() + i, 15);
    const key = keyOf(start);
    return { key, start, contacts: c.get(key) ?? 0, calls: k.get(key) ?? 0, clients: cl.get(key) ?? 0 };
  });

  // Top 4 sources + "Autres"
  const top = sources.slice(0, 4);
  const others = sources.slice(4).reduce((n, s) => n + s.n, 0);
  const sourceSlices = others ? [...top, { source: "Autres", n: others }] : top;

  return {
    firstName: user.name.split(" ")[0],
    sessionsToday: upcoming.filter((s) => s.startsAt < new Date(startOfDay.getTime() + DAY)).length,
    stats: {
      activeClients: activeClients.n,
      newLeads: { value: newLeads30.n, previous: newLeadsPrev.n, trend: trend(newLeads30.n, newLeadsPrev.n) },
      sessionsDone: { value: done30.n, previous: donePrev.n, trend: trend(done30.n, donePrev.n) },
      revenue: { value: revenue30, trend: revenueTrend },
    },
    weeks,
    months,
    sourceSlices,
    upcoming,
    dueTasks,
    recentContacts,
  };
}
