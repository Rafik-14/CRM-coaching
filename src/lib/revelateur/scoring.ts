/**
 * Test Signature JG® — Le Révélateur · scoring engine (annexe 02, v1.0).
 *
 * Deterministic and server-side only in use: validates the 30 raw answers,
 * corrects the four reversed items, computes the five dimension scores,
 * levels, heterogeneity flags and the configuration.
 *
 * Every threshold decision uses exact integer arithmetic on the corrected
 * totals, never the rounded display value:
 *   score = (total − 6) × 100 / 24
 *   score ≥ 60          ⇔ (total − 6) × 100 ≥ 1440
 *   score < 40 / 80     ⇔ (total − 6) × 100 < 960 / 1920
 *   gap ≤ 5 points      ⇔ Δtotal × 100 ≤ 120
 *   amplitude ≤ 20      ⇔ Δtotal × 100 ≤ 480
 *   gap ≥ 10 points     ⇔ Δtotal × 100 ≥ 240
 *
 * This file holds no question wording (that stays on the server, see
 * src/server/revelateur/questionnaire.ts) so it can be unit-tested freely.
 */

export const QUESTIONNAIRE_VERSION = "1.0";
export const SCORING_ENGINE_VERSION = "1.0";

export const DIMENSIONS = ["D1", "D2", "D3", "D4", "D5"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_NAMES: Record<Dimension, string> = {
  D1: "Conscience de soi",
  D2: "Positionnement",
  D3: "Expression",
  D4: "Impact relationnel",
  D5: "Incarnation",
};

/** Canonical order Q01 → Q30 and the dimension of each question (annexe 02 §3 and §5). */
export const QUESTION_DIMENSIONS = {
  Q01: "D1", Q02: "D1", Q03: "D1", Q04: "D1",
  Q05: "D2", Q06: "D2", Q07: "D2", Q08: "D2",
  Q09: "D3", Q10: "D3", Q11: "D3", Q12: "D3",
  Q13: "D4", Q14: "D4", Q15: "D4", Q16: "D4",
  Q17: "D5", Q18: "D5", Q19: "D5", Q20: "D5",
  Q21: "D1", Q22: "D1",
  Q23: "D2", Q24: "D2",
  Q25: "D3", Q26: "D3",
  Q27: "D4", Q28: "D4",
  Q29: "D5", Q30: "D5",
} as const satisfies Record<string, Dimension>;

export type QuestionId = keyof typeof QUESTION_DIMENSIONS;
export const QUESTION_IDS = Object.keys(QUESTION_DIMENSIONS) as QuestionId[];

/** Reversed items (annexe 02 §6): corrected value = 6 − raw value. */
export const REVERSED_QUESTIONS: ReadonlySet<QuestionId> = new Set<QuestionId>(["Q03", "Q07", "Q11", "Q19"]);

/** The five answer labels, value 1 to 5 (annexe 02 §2). */
export const SCALE_LABELS = [
  "Pas du tout vrai pour moi",
  "Plutôt faux",
  "Cela dépend des situations",
  "Plutôt vrai",
  "Tout à fait vrai",
] as const;

export const LEVELS = [
  "Ressource à explorer",
  "Ressource en développement",
  "Ressource bien mobilisée",
  "Ressource fortement mobilisée",
] as const;
export type LevelIndex = 0 | 1 | 2 | 3;

export const PROFILE_BY_DIMENSION: Record<Dimension, ProfileCode> = {
  D1: "P01", D2: "P02", D3: "P03", D4: "P04", D5: "P05",
};
export type ProfileCode = "P01" | "P02" | "P03" | "P04" | "P05" | "P06";

export const PROFILE_NAMES: Record<ProfileCode, string> = {
  P01: "Le potentiel à révéler",
  P02: "Le positionnement à affirmer",
  P03: "La valeur à exprimer",
  P04: "L'impact à développer",
  P05: "L'incarnation à consolider",
  P06: "La Valeur incarnée",
};

export type RawAnswers = Record<QuestionId, number>;

// ---------------------------------------------------------------------------
// Validation (annexe 02 §10)
// ---------------------------------------------------------------------------

export type ValidationResult =
  | { status: "COMPLETE"; answers: RawAnswers }
  | { status: "INCOMPLETE"; missing: QuestionId[] }
  | { status: "INVALID"; errors: string[] };

const isQuestionId = (id: string): id is QuestionId => Object.hasOwn(QUESTION_DIMENSIONS, id);

/**
 * Checks a set of raw answers. Accepts either an object keyed by question id or a
 * list of { questionId, value } rows (so a duplicated id can be detected).
 * Never fills a missing answer: incomplete stays incomplete.
 */
export function validateAnswers(
  input: Record<string, unknown> | ReadonlyArray<{ questionId: string; value: unknown }>,
): ValidationResult {
  const rows = Array.isArray(input)
    ? input
    : Object.entries(input as Record<string, unknown>).map(([questionId, value]) => ({ questionId, value }));

  const errors: string[] = [];
  const seen = new Map<QuestionId, number>();
  for (const { questionId, value } of rows) {
    if (!isQuestionId(questionId)) {
      errors.push(`Identifiant inconnu : ${String(questionId)}`);
      continue;
    }
    if (seen.has(questionId)) {
      errors.push(`Réponse en double : ${questionId}`);
      continue;
    }
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
      errors.push(`Valeur hors plage pour ${questionId}`);
      continue;
    }
    seen.set(questionId, value);
  }
  if (errors.length) return { status: "INVALID", errors };

  const missing = QUESTION_IDS.filter((id) => !seen.has(id));
  if (missing.length) return { status: "INCOMPLETE", missing };
  return { status: "COMPLETE", answers: Object.fromEntries(seen) as RawAnswers };
}

/** Corrected value of one answer; the reversal is applied here and only here. */
export function correctedValue(questionId: QuestionId, raw: number): number {
  return REVERSED_QUESTIONS.has(questionId) ? 6 - raw : raw;
}

// ---------------------------------------------------------------------------
// Scores, levels, configuration (annexe 02 §7 – §11)
// ---------------------------------------------------------------------------

export type ConfigurationCode = "SINGLE_PROFILE" | "JOINT" | "PLURAL" | "VALUE_EMBODIED" | "DEVELOPED";

export interface Configuration {
  code: ConfigurationCode;
  /** Profile 01–05 for a single profile, P06 for "La Valeur incarnée", otherwise null. */
  profile: ProfileCode | null;
  /** Complementary profile, only ever set with a single profile (annexe 02 §11.3). */
  secondaryProfile: ProfileCode | null;
  /** Dimensions within 5 points of the minimum (single, joint or plural); empty otherwise. */
  dimensions: Dimension[];
}

export interface DimensionResult {
  dimension: Dimension;
  correctedTotal: number;
  /** Exact score 0–100 — use for nothing but display after rounding; decisions use totals. */
  score: number;
  /** Rounded to one decimal, for display only. */
  displayScore: number;
  level: LevelIndex;
  heterogeneous: boolean;
}

export interface ScoringResult {
  questionnaireVersion: string;
  scoringEngineVersion: string;
  dimensions: DimensionResult[];
  minScore: number;
  maxScore: number;
  amplitude: number;
  configuration: Configuration;
}

const toScore = (total: number) => ((total - 6) * 100) / 24;
const levelOf = (total: number): LevelIndex => {
  const x = (total - 6) * 100;
  if (x < 960) return 0;
  if (x < 1440) return 1;
  if (x < 1920) return 2;
  return 3;
};
const atLeast60 = (total: number) => (total - 6) * 100 >= 1440;

/**
 * Heterogeneity flag (annexe 02 §9): at least two corrected answers in 1–2 AND
 * at least two in 4–5. A caution signal only — it never changes a score.
 */
export function isHeterogeneous(correctedValues: readonly number[]): boolean {
  const low = correctedValues.filter((v) => v <= 2).length;
  const high = correctedValues.filter((v) => v >= 4).length;
  return low >= 2 && high >= 2;
}

/** Configuration from the five corrected totals, in the imperative priority order (annexe 02 §11.1). */
export function configurationFromTotals(totals: Record<Dimension, number>): Configuration {
  const values = DIMENSIONS.map((d) => totals[d]);
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (values.every(atLeast60)) {
    return (max - min) * 100 <= 480
      ? { code: "VALUE_EMBODIED", profile: "P06", secondaryProfile: null, dimensions: [] }
      : { code: "DEVELOPED", profile: null, secondaryProfile: null, dimensions: [] };
  }

  const near = DIMENSIONS.filter((d) => (totals[d] - min) * 100 <= 120);
  if (near.length >= 3) return { code: "PLURAL", profile: null, secondaryProfile: null, dimensions: near };
  if (near.length === 2) return { code: "JOINT", profile: null, secondaryProfile: null, dimensions: near };

  const lowest = near[0];
  const ascending = [...DIMENSIONS].sort((a, b) => totals[a] - totals[b]);
  const below60 = values.filter((t) => !atLeast60(t)).length;
  const second = ascending[1];
  const third = ascending[2];
  const secondaryProfile =
    below60 >= 2 && (totals[third] - totals[second]) * 100 >= 240 ? PROFILE_BY_DIMENSION[second] : null;

  return { code: "SINGLE_PROFILE", profile: PROFILE_BY_DIMENSION[lowest], secondaryProfile, dimensions: [lowest] };
}

/** Full computation from 30 validated raw answers. Same answers + same versions ⇒ same result. */
export function scoreAnswers(answers: RawAnswers): ScoringResult {
  const corrected: Record<Dimension, number[]> = { D1: [], D2: [], D3: [], D4: [], D5: [] };
  for (const id of QUESTION_IDS) corrected[QUESTION_DIMENSIONS[id]].push(correctedValue(id, answers[id]));

  const totals = Object.fromEntries(
    DIMENSIONS.map((d) => [d, corrected[d].reduce((a, b) => a + b, 0)]),
  ) as Record<Dimension, number>;

  const dimensions: DimensionResult[] = DIMENSIONS.map((d) => {
    const score = toScore(totals[d]);
    return {
      dimension: d,
      correctedTotal: totals[d],
      score,
      displayScore: Math.round(score * 10) / 10,
      level: levelOf(totals[d]),
      heterogeneous: isHeterogeneous(corrected[d]),
    };
  });

  const scores = dimensions.map((r) => r.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  return {
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    scoringEngineVersion: SCORING_ENGINE_VERSION,
    dimensions,
    minScore,
    maxScore,
    amplitude: maxScore - minScore,
    configuration: configurationFromTotals(totals),
  };
}

/** French display of a score with one decimal, e.g. 41,7. */
export const formatScore = (score: number) => (Math.round(score * 10) / 10).toFixed(1).replace(".", ",");
