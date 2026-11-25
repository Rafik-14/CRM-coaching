import { correctedValue, DIMENSIONS, QUESTION_DIMENSIONS, QUESTION_IDS, type Dimension, type QuestionId, type RawAnswers, type ScoringResult } from "@/lib/revelateur/scoring";
import {
  AXES,
  band,
  CLOSE_AXES,
  CROSSING_RULE,
  CROSSINGS,
  FACETS,
  GAP_MARKED,
  GAP_MODERATE,
  INTERPRETATION_ENGINE_VERSION,
  MAX_AXES,
  MAX_CROSSINGS,
  MAX_RESOURCES,
  NEED_TAGS,
  PARAMS_STATUS,
  RECOGNITION_QUESTIONS,
  RESOURCE_CATEGORY_ORDER,
  type Axis,
  type Facet,
} from "./interpretation-params";

/**
 * Interpretation engine (annexe 03). Deterministic: same answers + same versions ⇒ same output. It never
 * changes a score or the configuration, attributes nothing on a score or a single answer, and every
 * element it keeps cites the statements that support it. It may keep nothing at all.
 */

export type ProofLevel = "SUFFISANT" | "NUANCE";
export type ResourceCode = (typeof RESOURCE_CATEGORY_ORDER)[number];

export type ResourceDecision = {
  resourceCode: ResourceCode;
  dimension: Dimension;
  facet: string;
  family: string;
  evidence: QuestionId[];
  proofLevel: ProofLevel;
  interpretationKey: string; // e.g. RESOURCE_02.D1 — editorial variant (annexe 04 §5.1)
  rationale: string;
};
export type AxisDecision = {
  axisCode: string;
  title: string;
  dimension: Dimension;
  priority: "primary" | "complementary";
  evidence: QuestionId[];
  proofLevel: ProofLevel;
  needRelevance: boolean;
  supportingResource: string | null;
  rationale: string;
};
export type CrossingDecision = {
  crossingCode: string;
  dimensions: [Dimension, Dimension];
  scores: [number, number];
  signedGap: number;
  absoluteGap: number;
  direction: "positive" | "negative";
  evidence: QuestionId[];
  proofLevel: ProofLevel;
};
export type Excluded = { kind: "resource" | "axis" | "crossing"; code: string; reason: string };

export type Interpretation = {
  meta: { interpretationEngineVersion: string; paramsStatus: string; questionnaireVersion: string; scoringEngineVersion: string };
  configuration: ScoringResult["configuration"];
  resources: ResourceDecision[];
  axes: AxisDecision[];
  crossings: CrossingDecision[];
  openNeed: { present: boolean; tags: Dimension[] };
  qualityControl: { status: "ok" | "incomplete"; checks: Record<string, boolean>; warnings: string[]; excluded: Excluded[] };
};

type Ctx = {
  c: Record<QuestionId, number>; // corrected answers
  b: Record<QuestionId, ReturnType<typeof band>>;
  result: ScoringResult;
  hetero: Set<Dimension>;
  excluded: Excluded[];
  warnings: string[];
};

const RANK: Record<ProofLevel, number> = { SUFFISANT: 2, NUANCE: 1 };
const uniq = <T,>(xs: T[]) => [...new Set(xs)];

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

function evaluateFacet(f: Facet, x: Ctx): ResourceDecision | null {
  const B = (q: QuestionId) => x.b[q];
  const linked = [...f.direct, ...f.corroborating];
  const all = [...linked, ...f.contextual];
  const exclude = (reason: string) => (x.excluded.push({ kind: "resource", code: f.code, reason }), null);

  // An isolated direct answer never suffices (no corroboration and a single direct question).
  if (f.corroborating.length === 0 && f.direct.length < 2) return exclude("une seule réponse directe, sans corroboration");

  const recogHigh = f.direct.filter((q) => RECOGNITION_QUESTIONS.has(q) && B(q) === "H");
  const directHigh = f.direct.filter((q) => B(q) === "H");
  const corrHigh = f.corroborating.filter((q) => B(q) === "H");
  const linkedLow = linked.filter((q) => B(q) === "L");
  const make = (code: ResourceCode, evidence: QuestionId[], level: ProofLevel, why: string): ResourceDecision => ({
    resourceCode: code,
    dimension: f.dimension,
    facet: f.code,
    family: f.family,
    evidence: uniq(evidence),
    proofLevel: x.hetero.has(f.dimension) ? "NUANCE" : level, // heterogeneous dimension: caution
    interpretationKey: `${code}.${f.dimension}`,
    rationale: why,
  });

  // RESOURCE_01 — affirmed
  if (recogHigh.length && directHigh.length === f.direct.length && (f.corroborating.length === 0 ? f.direct.length >= 2 : corrHigh.length >= 1) && !linkedLow.length) {
    const allHigh = linked.every((q) => B(q) === "H");
    return make("RESOURCE_01", linked.filter((q) => B(q) === "H"), allHigh ? "SUFFISANT" : "NUANCE", "reconnaissance explicite, présence convergente, aucune réponse basse");
  }
  // RESOURCE_02 — conscious, variable mobilisation (two answers show it, never a single 3)
  if (recogHigh.length) {
    const others = all.filter((q) => !recogHigh.includes(q) && B(q) !== "H");
    if (others.length >= 2 && others.some((q) => linked.includes(q))) {
      return make("RESOURCE_02", [recogHigh[0], ...others], "NUANCE", "reconnaissance explicite, mobilisation variable sur deux réponses au moins");
    }
  }
  // RESOURCE_04 — present (corroborated) but limited in some situations
  if (directHigh.length && corrHigh.length) {
    const low = all.filter((q) => B(q) === "L");
    if (low.length) return make("RESOURCE_04", [directHigh[0], corrHigh[0], ...low], "NUANCE", "présence corroborée, expression limitée dans certaines situations");
  }
  // RESOURCE_03 — emerging (never a fallback: needs positive convergence)
  const linkedHigh = linked.filter((q) => B(q) === "H");
  if (linkedHigh.length >= 2 && directHigh.length && f.direct.some((q) => B(q) === "M") && !linkedLow.length) {
    return make("RESOURCE_03", [...linkedHigh, ...f.direct.filter((q) => B(q) === "M")], "NUANCE", "indices positifs, stabilisation encore partielle");
  }
  return exclude("preuve insuffisante");
}

function selectResources(x: Ctx): ResourceDecision[] {
  const cands = FACETS.map((f) => evaluateFacet(f, x)).filter((r): r is ResourceDecision => r !== null);
  cands.sort(
    (a, b) =>
      RANK[b.proofLevel] - RANK[a.proofLevel] ||
      RESOURCE_CATEGORY_ORDER.indexOf(a.resourceCode) - RESOURCE_CATEGORY_ORDER.indexOf(b.resourceCode) ||
      b.evidence.filter((q) => x.b[q] === "H").length - a.evidence.filter((q) => x.b[q] === "H").length ||
      FACETS.findIndex((f) => f.code === a.facet) - FACETS.findIndex((f) => f.code === b.facet),
  );
  const kept: ResourceDecision[] = [];
  for (const r of cands) {
    const reason =
      kept.length >= MAX_RESOURCES
        ? "plafond de deux ressources"
        : kept.some((k) => k.dimension === r.dimension)
          ? "une ressource par dimension (non-redondance)"
          : kept.some((k) => k.evidence.some((q) => r.evidence.includes(q)))
            ? "preuves partagées avec une ressource retenue"
            : null;
    if (reason) x.excluded.push({ kind: "resource", code: r.facet, reason });
    else kept.push(r);
  }
  return kept;
}

// ---------------------------------------------------------------------------
// Axes
// ---------------------------------------------------------------------------

function evaluateAxis(a: Axis, x: Ctx, needTags: Dimension[], developedOr06: boolean): Omit<AxisDecision, "priority" | "supportingResource"> | null {
  const B = (q: QuestionId) => x.b[q];
  const exclude = (reason: string) => (x.excluded.push({ kind: "axis", code: a.code, reason }), null);
  if (a.central.some((q) => B(q) === "H")) return null; // no signal: not even a candidate
  const centralLow = a.central.filter((q) => B(q) === "L");
  if (!centralLow.length) return null;
  const support = a.complementary.filter((q) => B(q) !== "H");
  const contra = a.complementary.filter((q) => B(q) === "H");
  const needed = a.central.length === 1 ? 2 : 1;
  if (support.length < needed) return exclude(a.central.length === 1 ? "question centrale unique sans confirmation indépendante" : "aucune confirmation complémentaire");
  if (contra.length > support.length) return exclude("réponses complémentaires divergentes (contradiction)");
  let level: ProofLevel = centralLow.length === a.central.length && contra.length === 0 && support.length >= 2 ? "SUFFISANT" : "NUANCE";
  if (x.hetero.has(a.dimension)) level = "NUANCE";
  if (developedOr06 && level !== "SUFFISANT") return exclude("configuration développée / Profil 06 : preuve suffisante exigée");
  return {
    axisCode: a.code,
    title: a.title,
    dimension: a.dimension,
    evidence: uniq([...a.central, ...support]),
    proofLevel: level,
    needRelevance: needTags.includes(a.dimension),
    rationale: `${centralLow.length}/${a.central.length} réponse(s) centrale(s) basse(s), ${support.length} confirmation(s), ${contra.length} divergence(s)`,
  };
}

function selectAxes(x: Ctx, needTags: Dimension[], resources: ResourceDecision[]): AxisDecision[] {
  const cfg = x.result.configuration.code;
  const strict = cfg === "DEVELOPED" || cfg === "VALUE_EMBODIED";
  const score = (d: Dimension) => x.result.dimensions.find((r) => r.dimension === d)!.correctedTotal;
  const resourceEvidence = new Set(resources.flatMap((r) => r.evidence));
  const cands = AXES.map((a) => evaluateAxis(a, x, needTags, strict))
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .filter((a) => {
      // A dimension may hold a resource and an axis only on distinct evidence.
      const ax = AXES.find((z) => z.code === a.axisCode)!;
      if (ax.central.some((q) => resourceEvidence.has(q))) {
        x.excluded.push({ kind: "axis", code: a.axisCode, reason: "mêmes preuves qu'une ressource retenue" });
        return false;
      }
      return true;
    });
  cands.sort(
    (a, b) =>
      RANK[b.proofLevel] - RANK[a.proofLevel] ||
      Number(b.needRelevance) - Number(a.needRelevance) ||
      score(a.dimension) - score(b.dimension) ||
      AXES.findIndex((z) => z.code === a.axisCode) - AXES.findIndex((z) => z.code === b.axisCode),
  );
  const kept: AxisDecision[] = [];
  for (const a of cands) {
    const central = AXES.find((z) => z.code === a.axisCode)!.central;
    const reason =
      kept.length >= MAX_AXES
        ? "plafond de deux axes"
        : kept.some((k) => CLOSE_AXES.some(([p, q]) => (p === k.axisCode && q === a.axisCode) || (q === k.axisCode && p === a.axisCode)))
          ? "axe proche d'un axe retenu"
          : kept.some((k) => AXES.find((z) => z.code === k.axisCode)!.central.some((q) => central.includes(q)))
            ? "question centrale partagée avec l'axe retenu"
            : null;
    if (reason) {
      x.excluded.push({ kind: "axis", code: a.axisCode, reason });
      continue;
    }
    const support = resources.find((r) => r.dimension === a.dimension) ?? resources[0] ?? null;
    kept.push({ ...a, priority: kept.length === 0 ? "primary" : "complementary", supportingResource: support ? support.facet : null });
  }
  return kept;
}

// ---------------------------------------------------------------------------
// Crossings
// ---------------------------------------------------------------------------

function selectCrossings(x: Ctx): CrossingDecision[] {
  const dim = (d: Dimension) => x.result.dimensions.find((r) => r.dimension === d)!;
  const answersOf = (d: Dimension) => QUESTION_IDS.filter((q) => QUESTION_DIMENSIONS[q] === d);
  const cands: CrossingDecision[] = [];
  for (const k of CROSSINGS) {
    const A = dim(k.a), B = dim(k.b);
    const dTotal = A.correctedTotal - B.correctedTotal; // gap in points = dTotal × 100 / 24 (exact)
    const abs100 = Math.abs(dTotal) * 100;
    if (abs100 < GAP_MODERATE * 24) continue; // < 10 points: proximity, not a contrast
    const [hi, lo] = dTotal > 0 ? [k.a, k.b] : [k.b, k.a];
    const hiQ = answersOf(hi), loQ = answersOf(lo);
    const n = (qs: QuestionId[], v: "L" | "H") => qs.filter((q) => x.b[q] === v);
    const confirms =
      n(hiQ, "H").length >= CROSSING_RULE.highMinHigh &&
      n(hiQ, "L").length <= CROSSING_RULE.highMaxLow &&
      n(loQ, "L").length >= CROSSING_RULE.lowMinLow &&
      n(loQ, "H").length <= CROSSING_RULE.lowMaxHigh;
    if (!confirms) {
      x.excluded.push({ kind: "crossing", code: k.code, reason: "écart non confirmé par les réponses des deux dimensions" });
      continue;
    }
    cands.push({
      crossingCode: k.code,
      dimensions: [k.a, k.b],
      scores: [A.score, B.score],
      signedGap: A.score - B.score,
      absoluteGap: Math.abs(A.score - B.score),
      direction: dTotal > 0 ? "positive" : "negative",
      evidence: [...n(hiQ, "H"), ...n(loQ, "L")],
      proofLevel: abs100 >= GAP_MARKED * 24 && !x.hetero.has(hi) && !x.hetero.has(lo) ? "SUFFISANT" : "NUANCE",
    });
  }
  const lowerOf = (c: CrossingDecision) => (c.direction === "positive" ? c.dimensions[1] : c.dimensions[0]);
  cands.sort((a, b) => Number(b.absoluteGap >= GAP_MARKED) - Number(a.absoluteGap >= GAP_MARKED) || RANK[b.proofLevel] - RANK[a.proofLevel] || b.absoluteGap - a.absoluteGap);
  const kept: CrossingDecision[] = [];
  for (const c of cands) {
    const reason = kept.length >= MAX_CROSSINGS ? "plafond de deux croisements" : kept.some((k) => lowerOf(k) === lowerOf(c)) ? "même dimension basse qu'un croisement retenu" : null;
    if (reason) x.excluded.push({ kind: "crossing", code: c.crossingCode, reason });
    else kept.push(c);
  }
  return kept;
}

// ---------------------------------------------------------------------------

export function needTagsOf(open: string | null | undefined): Dimension[] {
  const t = (open ?? "").toLowerCase();
  if (t.trim().length < 8) return [];
  return DIMENSIONS.filter((d) => NEED_TAGS[d].some((k) => t.includes(k)));
}

/** Runs the engine on a frozen result. Returns « incomplete » (and nothing attributed) if inputs are not valid. */
export function interpret(answers: RawAnswers, result: ScoringResult, openAnswer: string | null): Interpretation {
  const warnings: string[] = [];
  const meta = {
    interpretationEngineVersion: INTERPRETATION_ENGINE_VERSION,
    paramsStatus: PARAMS_STATUS,
    questionnaireVersion: result.questionnaireVersion,
    scoringEngineVersion: result.scoringEngineVersion,
  };
  const valid = QUESTION_IDS.every((q) => Number.isInteger(answers[q]) && answers[q] >= 1 && answers[q] <= 5);
  const empty = (status: "incomplete") => ({
    meta,
    configuration: result.configuration,
    resources: [],
    axes: [],
    crossings: [],
    openNeed: { present: false, tags: [] },
    qualityControl: { status, checks: { COM01: false }, warnings, excluded: [] },
  });
  if (!valid) return (warnings.push("COM01 : réponses incomplètes ou invalides"), empty("incomplete"));

  const c = Object.fromEntries(QUESTION_IDS.map((q) => [q, correctedValue(q, answers[q])])) as Record<QuestionId, number>;
  const x: Ctx = {
    c,
    b: Object.fromEntries(QUESTION_IDS.map((q) => [q, band(c[q])])) as Ctx["b"],
    result,
    hetero: new Set(result.dimensions.filter((d) => d.heterogeneous).map((d) => d.dimension)),
    excluded: [],
    warnings,
  };
  const tags = needTagsOf(openAnswer);
  const resources = selectResources(x);
  const axes = selectAxes(x, tags, resources);
  const crossings = selectCrossings(x);
  for (const d of x.hetero) warnings.push(`Réponses hétérogènes en ${d} : lecture prudente (niveau nuancé au plus).`);

  const traced = [...resources, ...axes, ...crossings].every((e) => e.evidence.length >= 2);
  const checks = {
    COM01: true,
    COM02: true, // configuration copied from the deterministic engine, never recomputed here
    COM03: resources.length <= MAX_RESOURCES,
    COM04: axes.length <= MAX_AXES && axes.filter((a) => a.priority === "primary").length <= 1,
    COM05: crossings.length <= MAX_CROSSINGS,
    COM06: traced,
    COM09: true, // the open answer only ranks axes; scores and configuration are untouched
    COM10: traced,
    COM12: true, // no recommendation is mandatory
  };
  return {
    meta,
    configuration: result.configuration,
    resources,
    axes,
    crossings,
    openNeed: { present: !!openAnswer?.trim(), tags },
    qualityControl: { status: "ok", checks, warnings, excluded: x.excluded },
  };
}
