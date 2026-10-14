import "server-only";
import { and, asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { clientPackages, clients, coachingSessions, contacts, packages, pipelineStages } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { addMoney, type MoneyByCurrency } from "@/lib/format";
import { segmentLabel } from "@/lib/jg";
import { DISCOVERY_TYPE } from "@/lib/validations/coaching";

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
        currency: sql<string>`coalesce(${clientPackages.currency}, ${packages.currency})`,
        n: count(),
        revenue: sql<string>`coalesce(sum(case when ${clientPackages.paymentStatus} in ('paid','partial') then coalesce(${clientPackages.price}, ${packages.price}) else 0 end), 0)`,
      })
      .from(clientPackages)
      .innerJoin(packages, eq(clientPackages.packageId, packages.id))
      .groupBy(packages.name, sql`coalesce(${clientPackages.currency}, ${packages.currency})`),
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

  const [segments, partners, [echange]] = await Promise.all([
    // Contacts and clients per type of client (« Pour qui ? »).
    db
      .select({
        segment: contacts.segment,
        contacts: count(),
        clients: sql<number>`count(${clients.id})::int`,
      })
      .from(contacts)
      .leftJoin(clients, eq(clients.contactId, contacts.id))
      .groupBy(contacts.segment),
    // Partners (HR firms, schools…) and what their referrals became.
    db.execute<{ id: string; name: string; referred: number; became_clients: number }>(sql`
      select p.id, coalesce(p.organization, trim(p.first_name || ' ' || p.last_name)) as name,
             count(c.id)::int as referred, count(cl.id)::int as became_clients
      from contacts c
      join contacts p on p.id = c.referred_by_contact_id
      left join clients cl on cl.contact_id = c.id
      group by p.id, p.organization, p.first_name, p.last_name
      order by referred desc
      limit 6`),
    // Échange stratégique → client: contacts who had one done, and how many became clients.
    db
      .select({
        held: sql<number>`count(distinct ${coachingSessions.contactId})::int`,
        converted: sql<number>`count(distinct ${clients.contactId})::int`,
      })
      .from(coachingSessions)
      .leftJoin(clients, eq(clients.contactId, coachingSessions.contactId))
      .where(and(eq(coachingSessions.type, DISCOVERY_TYPE), eq(coachingSessions.status, "done"))),
  ]);

  // « Transformations »: finished coachings written up as case studies, with the client's consent.
  const transformations = await db.query.clients.findMany({
    where: and(eq(clients.status, "finished"), eq(clients.testimonialConsent, true), isNotNull(clients.caseStudy)),
    orderBy: desc(clients.closedAt),
    limit: 6,
    columns: { id: true, positioningStatement: true, caseStudy: true, closedAt: true },
    with: { contact: { columns: { id: true, firstName: true, organization: true, stake: true, segment: true } } },
  });

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
  // Per currency: EUR and CHF are never converted or summed together.
  const revenueTotal: MoneyByCurrency = {};
  const soldByCurrency: Record<string, number> = {};
  const byOffer = new Map<string, { label: string; value: MoneyByCurrency; count: number }>();
  for (const r of revenueByPackage) {
    addMoney(revenueTotal, r.revenue, r.currency);
    soldByCurrency[r.currency] = (soldByCurrency[r.currency] ?? 0) + r.n;
    const o = byOffer.get(r.name) ?? { label: r.name, value: {}, count: 0 };
    addMoney(o.value, r.revenue, r.currency);
    o.count += r.n;
    byOffer.set(r.name, o);
  }
  const averagePackage: MoneyByCurrency = Object.fromEntries(
    Object.entries(revenueTotal).map(([c, v]) => [c, soldByCurrency[c] ? (v ?? 0) / soldByCurrency[c] : 0]),
  );
  // Bars are proportional within the main currency (the one with the most sales).
  const mainCurrency = Object.entries(soldByCurrency).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "EUR";
  const clientCount = (st: string) => clientStatuses.find((s) => s.status === st)?.n ?? 0;

  return {
    staleProspects: stale.n,
    kpis: {
      conversionRate: totals.contacts ? Number(totals.clients) / totals.contacts : 0,
      averagePackage,
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
    mainCurrency,
    transformations,
    echange: { held: echange?.held ?? 0, converted: echange?.converted ?? 0 },
    segments: segments
      .map((s) => ({ label: segmentLabel(s.segment) ?? "Non précisé", contacts: s.contacts, clients: s.clients }))
      .sort((a, b) => b.contacts - a.contacts),
    partners: [...partners].map((p) => ({ id: p.id, name: p.name, referred: p.referred, clients: p.became_clients })),
    revenueByPackage: [...byOffer.values()].sort(
      (a, b) => (b.value[mainCurrency] ?? 0) - (a.value[mainCurrency] ?? 0) || b.count - a.count,
    ),
  };
}
