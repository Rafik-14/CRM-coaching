import type { Dimension, QuestionId } from "@/lib/revelateur/scoring";

/**
 * Parameter table of the interpretation engine (annexe 03 + dossier v2.0 §6).
 *
 * The documents define the evidence qualitatively and forbid invented thresholds; the locking note
 * (§5) asks for a parameter table to be validated instead. Everything below that is NOT a verbatim
 * copy of the documents is marked PROPOSÉ and must be validated in writing by Jérémy Galéa before
 * production. Server-only data: never sent to the browser, never printed in the report.
 */
export const INTERPRETATION_ENGINE_VERSION = "0.1-propose";
export const PARAMS_STATUS = "PROPOSÉ — à valider par Jérémy Galéa" as const;

/** Reading bands of a corrected answer (annexe 03 §4): 1–2 low, 3 variable, 4–5 high. */
export type Band = "L" | "M" | "H";
export const band = (corrected: number): Band => (corrected <= 2 ? "L" : corrected === 3 ? "M" : "H");

// ---------------------------------------------------------------------------
// Resources — evidence matrix (VERBATIM from dossier v2.0 §6.1–6.2)
// ---------------------------------------------------------------------------

export type Facet = {
  code: string; // F1 … F24
  family: string; // D1-R01 …
  dimension: Dimension;
  direct: QuestionId[];
  corroborating: QuestionId[];
  contextual: QuestionId[];
};

export const FACETS: Facet[] = [
  { code: "F1", family: "D1-R01", dimension: "D1", direct: ["Q01", "Q04"], corroborating: ["Q03"], contextual: ["Q25"] },
  { code: "F4", family: "D1-R01", dimension: "D1", direct: ["Q22"], corroborating: ["Q02"], contextual: ["Q04", "Q21"] },
  { code: "F2", family: "D1-R02", dimension: "D1", direct: ["Q02"], corroborating: ["Q04"], contextual: ["Q10", "Q21"] },
  { code: "F3", family: "D1-R02", dimension: "D1", direct: ["Q21"], corroborating: ["Q01"], contextual: ["Q02", "Q22"] },
  { code: "F5", family: "D2-R01", dimension: "D2", direct: ["Q05"], corroborating: ["Q07"], contextual: ["Q23", "Q24"] },
  { code: "F6", family: "D2-R01", dimension: "D2", direct: ["Q23"], corroborating: ["Q06", "Q07"], contextual: ["Q05"] },
  { code: "F7", family: "D2-R02", dimension: "D2", direct: ["Q08"], corroborating: ["Q24"], contextual: ["Q06"] },
  { code: "F8", family: "D2-R02", dimension: "D2", direct: ["Q24"], corroborating: ["Q08"], contextual: ["Q05", "Q06"] },
  { code: "F9", family: "D3-R01", dimension: "D3", direct: ["Q09", "Q25"], corroborating: ["Q04"], contextual: ["Q11", "Q26"] },
  { code: "F11", family: "D3-R01", dimension: "D3", direct: ["Q11"], corroborating: ["Q09", "Q25"], contextual: ["Q26"] },
  { code: "F10", family: "D3-R02", dimension: "D3", direct: ["Q10"], corroborating: ["Q02", "Q25"], contextual: ["Q09", "Q12"] },
  { code: "F12", family: "D3-R03", dimension: "D3", direct: ["Q12"], corroborating: ["Q16"], contextual: ["Q14", "Q26"] },
  { code: "F13", family: "D3-R03", dimension: "D3", direct: ["Q26"], corroborating: ["Q09"], contextual: ["Q10", "Q12"] },
  { code: "F14", family: "D4-R01", dimension: "D4", direct: ["Q13"], corroborating: [], contextual: ["Q14", "Q28"] },
  { code: "F15", family: "D4-R02", dimension: "D4", direct: ["Q14"], corroborating: ["Q16"], contextual: ["Q28"] },
  { code: "F18", family: "D4-R02", dimension: "D4", direct: ["Q27"], corroborating: ["Q28"], contextual: ["Q16"] },
  { code: "F16", family: "D4-R03", dimension: "D4", direct: ["Q15"], corroborating: ["Q10"], contextual: ["Q28"] },
  { code: "F17", family: "D4-R03", dimension: "D4", direct: ["Q16"], corroborating: ["Q12"], contextual: ["Q14"] },
  { code: "F19", family: "D4-R03", dimension: "D4", direct: ["Q28"], corroborating: ["Q27", "Q16"], contextual: ["Q14"] },
  { code: "F20", family: "D5-R01", dimension: "D5", direct: ["Q17", "Q19"], corroborating: [], contextual: ["Q29", "Q18"] },
  { code: "F21", family: "D5-R02", dimension: "D5", direct: ["Q18"], corroborating: ["Q24"], contextual: ["Q20", "Q30"] },
  { code: "F22", family: "D5-R02", dimension: "D5", direct: ["Q29"], corroborating: [], contextual: ["Q18", "Q17"] },
  { code: "F23", family: "D5-R03", dimension: "D5", direct: ["Q20"], corroborating: ["Q30"], contextual: ["Q24"] },
  { code: "F24", family: "D5-R03", dimension: "D5", direct: ["Q30"], corroborating: ["Q20"], contextual: [] },
];

/**
 * PROPOSÉ. Statements that bear on RECOGNISING / IDENTIFYING a resource (v2.0 §6: « au moins une
 * réponse directe portant sur la reconnaissance ou l'identification » for RESOURCE_01/02; a
 * behavioural answer alone does not prove awareness). Other statements describe behaviour.
 */
export const RECOGNITION_QUESTIONS: ReadonlySet<QuestionId> = new Set<QuestionId>(["Q01", "Q02", "Q03", "Q04", "Q08", "Q11", "Q14", "Q21", "Q22"]);

/**
 * PROPOSÉ — rules per resource category, tested in this order on each facet (one category per facet
 * at most, so RESOURCE_02 and RESOURCE_04 can never share the same evidence). « linked » = direct +
 * corroborating answers; contextual answers can show variation but never replace a direct proof.
 *
 * RESOURCE_01 affirmée: a recognition-type direct answer is high, every direct answer is high, at least
 *   one corroborating answer is high, nothing linked is low. SUFFISANT if all linked answers are high,
 *   otherwise NUANCÉ.
 * RESOURCE_02 consciente: a recognition-type direct answer is high, and at least two OTHER answers of the
 *   facet (linked or contextual, at least one linked) are 3 or lower: the variation is shown by two
 *   answers, never by a single 3. NUANCÉ.
 * RESOURCE_04 sous-exploitée: presence corroborated (one direct AND one corroborating answer high) and at
 *   least one answer of the facet low (1–2) showing a limit in some situations. NUANCÉ.
 * RESOURCE_03 émergente: at least two linked answers high including a direct one, at least one direct
 *   answer at 3 (stabilisation partial), nothing linked low. NUANCÉ. Never a fallback.
 * Facets without any corroborating answer (F14, F20, F22) need two direct answers; with a single direct
 *   answer they are never attributed (isolated answer, v2.0 « prudence renforcée »).
 */
export const RESOURCE_RULES_NOTE = "voir commentaire";

/** PROPOSÉ — ranking: proof level, then category (01 > 02 > 04 > 03), then number of high answers. One resource per dimension; two at most. */
export const RESOURCE_CATEGORY_ORDER = ["RESOURCE_01", "RESOURCE_02", "RESOURCE_04", "RESOURCE_03"] as const;
export const MAX_RESOURCES = 2;

// ---------------------------------------------------------------------------
// Axes — catalogue (VERBATIM from annexe 03 §6.4)
// ---------------------------------------------------------------------------

export type Axis = { code: string; title: string; dimension: Dimension; central: QuestionId[]; complementary: QuestionId[] };

export const AXES: Axis[] = [
  { code: "D1.01", title: "Identifier ce qui vous distingue", dimension: "D1", central: ["Q01", "Q03", "Q04"], complementary: ["Q21", "Q22", "Q02"] },
  { code: "D1.02", title: "Objectiver sa valeur à partir de ses expériences", dimension: "D1", central: ["Q02", "Q21"], complementary: ["Q22", "Q01", "Q04"] },
  { code: "D1.03", title: "Reconnaître pleinement sa contribution", dimension: "D1", central: ["Q02", "Q04"], complementary: ["Q01", "Q21", "Q22"] },
  { code: "D1.04", title: "Dépasser les limites de son statut actuel", dimension: "D1", central: ["Q22", "Q02"], complementary: ["Q21", "Q04", "Q01"] },
  { code: "D2.01", title: "Affirmer ses convictions", dimension: "D2", central: ["Q05", "Q07"], complementary: ["Q23", "Q24"] },
  { code: "D2.02", title: "Assumer ses choix", dimension: "D2", central: ["Q08", "Q24"], complementary: ["Q06", "Q23"] },
  { code: "D2.03", title: "Prendre pleinement sa place", dimension: "D2", central: ["Q06", "Q23"], complementary: ["Q05", "Q07"] },
  { code: "D2.04", title: "Clarifier et préserver ses limites", dimension: "D2", central: ["Q08", "Q24"], complementary: ["Q06", "Q05"] },
  { code: "D3.01", title: "Clarifier ce que vous souhaitez transmettre", dimension: "D3", central: ["Q09", "Q25"], complementary: ["Q10", "Q11", "Q26"] },
  { code: "D3.02", title: "Rendre votre contribution concrète", dimension: "D3", central: ["Q10"], complementary: ["Q02", "Q25", "Q09"] },
  { code: "D3.03", title: "Exprimer ce qui vous distingue", dimension: "D3", central: ["Q04", "Q25"], complementary: ["Q09", "Q21", "Q11"] },
  { code: "D3.04", title: "Structurer et adapter votre message", dimension: "D3", central: ["Q12", "Q26"], complementary: ["Q09", "Q10"] },
  { code: "D4.01", title: "Créer une relation de confiance", dimension: "D4", central: ["Q13"], complementary: ["Q14", "Q12", "Q27"] },
  { code: "D4.02", title: "Comprendre véritablement votre interlocuteur", dimension: "D4", central: ["Q27"], complementary: ["Q28", "Q16", "Q14"] },
  { code: "D4.03", title: "Créer de la résonance dans vos échanges", dimension: "D4", central: ["Q15"], complementary: ["Q10", "Q12", "Q28"] },
  { code: "D4.04", title: "Faire évoluer l'interaction", dimension: "D4", central: ["Q28", "Q16"], complementary: ["Q14", "Q27"] },
  { code: "D5.01", title: "Aligner vos convictions et vos actions", dimension: "D5", central: ["Q18"], complementary: ["Q24", "Q20", "Q30"] },
  { code: "D5.02", title: "Mobiliser pleinement vos ressources lorsque l'enjeu augmente", dimension: "D5", central: ["Q17", "Q19"], complementary: ["Q18", "Q29"] },
  { code: "D5.03", title: "Prendre du recul pour choisir votre réponse", dimension: "D5", central: ["Q29"], complementary: ["Q17", "Q19", "Q18"] },
  { code: "D5.04", title: "Transformer vos intentions en actions durables", dimension: "D5", central: ["Q20", "Q30"], complementary: ["Q18", "Q24"] },
];

/** Close axes (annexe 03 §6.5): never both in one report. */
export const CLOSE_AXES: [string, string][] = [
  ["D1.02", "D1.03"],
  ["D2.02", "D2.04"],
  ["D3.01", "D3.04"],
  ["D3.01", "D3.03"],
  ["D5.01", "D5.04"],
];

/**
 * PROPOSÉ — axis rules. « Signal » = a central answer at 1–2.
 * Candidate: no central answer high; at least one central answer low; complementary answers at 3 or lower
 *   ≥ 1 (≥ 2 when the axis has a single central question — independent confirmation, annexe 03 §6.4);
 *   high complementary answers must not outnumber the supporting ones (otherwise: contradiction → excluded).
 * SUFFISANT: every central answer low, no complementary answer high, ≥ 2 supporting. Otherwise NUANCÉ.
 * Profil 06 and « configuration développée »: SUFFISANT only (no axis by default).
 * Ranking: proof level, then relevance to the open answer (tie-break only), then the dimension's score
 *   (final tie-break, annexe 03 §6.2 step 6), then catalogue order. Primary + complementary at most; the
 *   complementary axis must not share a central question with the primary nor be its close axis.
 */
export const MAX_AXES = 2;

// ---------------------------------------------------------------------------
// Crossings — VERBATIM formulas and bands (annexe 03 §7)
// ---------------------------------------------------------------------------

export const CROSSINGS = [
  { code: "C01", a: "D1", b: "D3" },
  { code: "C02", a: "D2", b: "D4" },
  { code: "C03", a: "D3", b: "D5" },
  { code: "C04", a: "D1", b: "D5" },
] as const satisfies readonly { code: string; a: Dimension; b: Dimension }[];
export const GAP_MODERATE = 10;
export const GAP_MARKED = 20;
export const MAX_CROSSINGS = 2;

/**
 * PROPOSÉ — confirmation by the answers of both dimensions (6 answers each):
 * the higher dimension has at least 4 high answers and at most 1 low; the lower one has at least 2 low
 * answers and at most 2 high. If either side does not confirm, the crossing is not kept (whatever the gap).
 * SUFFISANT when the gap is ≥ 20 and both confirm; NUANCÉ when the gap is 10 to < 20 and both confirm.
 * Two at most: marked gaps first, then proof, then gap size; two crossings must not share their lower
 * dimension (non-redundancy).
 */
export const CROSSING_RULE = { highMinHigh: 4, highMaxLow: 1, lowMinLow: 2, lowMaxHigh: 2 } as const;

// ---------------------------------------------------------------------------
// Open answer — PROPOSÉ keyword tags, used only to break ties between equally supported axes
// ---------------------------------------------------------------------------

export const NEED_TAGS: Record<Dimension, string[]> = {
  D1: ["singularit", "qualit", "valeur", "point fort", "forces", "qui je suis", "reconna", "parcours", "identit"],
  D2: ["place", "légitim", "legitim", "affirm", "convict", "choix", "limite", "oser", "confiance en moi"],
  D3: ["exprim", "présent", "present", "pitch", "entretien", "mots", "communiqu", "expliqu", "message", "valoris"],
  D4: ["relation", "équipe", "equipe", "échange", "echange", "écoute", "ecoute", "client", "convaincre", "influence"],
  D5: ["action", "agir", "stress", "pression", "émotion", "emotion", "enjeu", "cohéren", "coheren", "passer à l", "décision", "decision"],
};
