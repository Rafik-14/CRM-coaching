import { and, eq, gte } from "drizzle-orm";
import { DIMENSION_NAMES, DIMENSIONS, LEVELS, type Dimension } from "@/lib/revelateur/scoring";
import type { AnyDb } from "@/server/db/types";
import { revelateurResults, revelateurSessions } from "@/server/db/schema";
import { configurationDistribution, counters } from "./crm";

/**
 * Global statistics of the test (v2.0 §8: five dimensions, configurations, resources), aggregated only —
 * no name, address or individual answer. Used by the CRM exports (XLSX and PDF).
 */
export type Stats = {
  periodLabel: string;
  generatedAt: Date;
  counters: { tests: number; callbacks: number; calls: number };
  configurations: { label: string; n: number }[];
  dimensions: { dimension: Dimension; name: string; average: number | null; levels: { label: string; n: number }[] }[];
  resources: { label: string; n: number }[];
  axes: { label: string; n: number }[];
};

const RESOURCE_LABEL: Record<string, string> = {
  RESOURCE_01: "Ressources affirmées",
  RESOURCE_02: "Ressources conscientes",
  RESOURCE_03: "Ressources émergentes",
  RESOURCE_04: "Ressources sous-exploitées",
};

export async function computeStats(db: AnyDb, periodLabel: string, from?: Date): Promise<Stats> {
  const rows = await db
    .select({ snapshot: revelateurResults.snapshot, interpretation: revelateurResults.interpretation })
    .from(revelateurResults)
    .innerJoin(revelateurSessions, eq(revelateurSessions.id, revelateurResults.sessionId))
    .where(and(eq(revelateurSessions.status, "complete"), from ? gte(revelateurSessions.confirmedAt, from) : undefined));

  const dimensions = DIMENSIONS.map((d) => {
    const ds = rows.map((r) => r.snapshot.dimensions.find((x) => x.dimension === d)!).filter(Boolean);
    return {
      dimension: d,
      name: DIMENSION_NAMES[d],
      average: ds.length ? Math.round((ds.reduce((s, x) => s + x.score, 0) / ds.length) * 10) / 10 : null,
      levels: LEVELS.map((label, i) => ({ label, n: ds.filter((x) => x.level === i).length })),
    };
  });
  const tally = (keys: string[]) => {
    const m = new Map<string, number>();
    for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, n }));
  };
  const resources = tally(rows.flatMap((r) => (r.interpretation?.resources ?? []).map((x) => `${RESOURCE_LABEL[x.resourceCode]} · ${DIMENSION_NAMES[x.dimension]}`)));
  const axes = tally(rows.flatMap((r) => (r.interpretation?.axes ?? []).map((x) => `${x.axisCode} · ${x.title}`)));
  const dist = await configurationDistribution(db, from);
  return {
    periodLabel,
    generatedAt: new Date(),
    counters: await counters(db, { from }),
    configurations: dist.map((d) => ({ label: d.label, n: d.n })),
    dimensions,
    resources,
    axes,
  };
}
