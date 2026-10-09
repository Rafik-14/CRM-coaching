import "server-only";
import { asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { clientPackages, clients, coachingSessions, contacts, packages, pipelineStages } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";

export async function getAnalytics() {
  await requireCoach();

  const [stages, perStage, [totals], sessionStatuses, revenueByPackage, clientStatuses, [stale]] = await Promise.all([
    db.query.pipelineStages.findMany({ orderBy: asc(pipelineStages.position) }),
    db
      .select({
        stageId: contacts.stageId,
        n: count(),
        avgDays: sql<string>`avg(extract(epoch from (now() - ${contacts.stageChangedAt})) / 86400)`,
      })
      .from(contacts)
      .groupBy(contacts.stageId),
    db
      .select({
        contacts: count(),
        clients: sql<number>`(select count(*)::int from ${clients})`,
      })
      .from(contacts),
    db.select({ status: coachingSessions.status, n: count() }).from(coachingSessions).groupBy(coachingSessions.status),
    db
      .select({
        name: packages.name,
        n: count(),
        revenue: sql<string>`coalesce(sum(case when ${clientPackages.paymentStatus} in ('paid','partial') then ${packages.price} else 0 end), 0)`,
      })
      .from(clientPackages)
      .innerJoin(packages, eq(clientPackages.packageId, packages.id))
      .groupBy(packages.name),
    db.select({ status: clients.status, n: count() }).from(clients).groupBy(clients.status),
    // Prospects (not yet clients) sitting in the same stage for 14+ days
    db
      .select({ n: count() })
      .from(contacts)
      .leftJoin(pipelineStages, eq(contacts.stageId, pipelineStages.id))
      .where(
        sql`coalesce(${pipelineStages.isClient}, false) = false and ${contacts.stageChangedAt} < now() - interval '14 days'`,
      ),
  ]);

  const byStage = new Map(perStage.map((r) => [r.stageId, r]));
  // Funnel: contacts that reached each stage = contacts currently at that stage or any later one.
  const funnel = stages.map((s, i) => ({
    name: s.name,
    color: s.color,
    reached: stages.slice(i).reduce((n, later) => n + (byStage.get(later.id)?.n ?? 0), 0),
    current: byStage.get(s.id)?.n ?? 0,
    avgDays: Math.round(Number(byStage.get(s.id)?.avgDays ?? 0)),
  }));

  const sessionCount = (st: string) => sessionStatuses.find((s) => s.status === st)?.n ?? 0;
  const finishedSessions = sessionCount("done") + sessionCount("no_show") + sessionCount("cancelled");
  const revenueTotal = revenueByPackage.reduce((n, r) => n + Number(r.revenue), 0);
  const soldPackages = revenueByPackage.reduce((n, r) => n + r.n, 0);
  const clientCount = (st: string) => clientStatuses.find((s) => s.status === st)?.n ?? 0;

  return {
    staleProspects: stale.n,
    kpis: {
      conversionRate: totals.contacts ? Number(totals.clients) / totals.contacts : 0,
      averagePackage: soldPackages ? revenueTotal / soldPackages : 0,
      revenueTotal,
      noShowRate: finishedSessions ? sessionCount("no_show") / finishedSessions : 0,
      successRate:
        clientCount("finished") + clientCount("stopped")
          ? clientCount("finished") / (clientCount("finished") + clientCount("stopped"))
          : null,
    },
    funnel,
    sessions: [
      { label: "Effectuées", value: sessionCount("done") },
      { label: "Prévues", value: sessionCount("planned") },
      { label: "Annulées", value: sessionCount("cancelled") },
      { label: "Absences", value: sessionCount("no_show") },
    ].filter((s) => s.value > 0),
    revenueByPackage: revenueByPackage
      .map((r) => ({ label: r.name, value: Number(r.revenue), count: r.n }))
      .sort((a, b) => b.value - a.value),
  };
}
