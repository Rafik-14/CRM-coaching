import { DIMENSIONS, LEVELS, PROFILE_NAMES, type Dimension, type ProfileCode, type ScoringResult } from "@/lib/revelateur/scoring";
import { CONFIGURATION_TEXTS, DIMENSION_LABEL, DRAFTS_STATUS, EMPTY_TEXTS, NEXT_STEP_TEXTS, OFFERS, SECONDARY_PROFILE_LINE, SIGNATURE_FRAGMENTS, SIGNATURE_TEXTS, type OfferKey } from "./editorial-drafts";
import type { Interpretation } from "./interpretation";
import { LIBRARY, LIBRARY_VERSION, type ProfileKey } from "./library";

/**
 * Editorial engine (annexe 04): turns the deterministic result and the interpretation decisions into the
 * report's texts, section by section (annexe 05 §4). It chooses nothing: every conditional block exists
 * only because the engines kept an element; wording comes from the library (verbatim) or, for the gaps
 * the library leaves, from the drafts file. No AI. The PDF step only lays this out.
 */
export const EDITORIAL_ENGINE_VERSION = "0.1";

export type Block =
  | { t: "p"; text: string }
  | { t: "lead"; text: string }
  | { t: "note"; text: string }
  | { t: "scores"; rows: { dimension: Dimension; name: string; score: number; level: string }[] }
  | { t: "card"; kicker?: string; title: string; parts: { label?: string; text: string }[] }
  | { t: "sub"; title: string; parts: { label?: string; text: string }[] }
  | { t: "quote"; text: string }
  | { t: "cta"; label: string; url: string; note: string };

export type Section = { code: string; title: string; blocks: Block[] };
export type ReportContent = {
  versions: { editorial: string; library: string; drafts: string };
  firstName: string | null;
  opening: Block[];
  sections: Section[];
  recommendation: OfferKey | null;
  draftsUsed: string[];
  qc: { ok: boolean; issues: string[] };
};

export const SECTION_TITLES = [
  ["01", "Votre configuration"],
  ["02", "Votre cartographie de valeur"],
  ["03", "Les ressources sur lesquelles vous appuyer"],
  ["04", "Ce qui mérite votre attention"],
  ["05", "Ce que vos résultats révèlent entre les lignes"],
  ["06", "Votre signature de valeur"],
  ["07", "Votre prochaine étape"],
  ["08", "La suite commence ici."],
] as const;

const PROFILE_KEY: Record<ProfileCode, ProfileKey> = { P01: "P01", P02: "P02", P03: "P03", P04: "P04", P05: "P05", P06: "P06" };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Recommendation (annexe 04 §9): one at most, none without an expressed need. Keyword rules are DRAFT. */
export function chooseRecommendation(open: string | null, interp: Interpretation): OfferKey | null {
  const text = norm(open ?? "").trim();
  if (text.length < 8) return null;
  for (const key of ["BILAN", "DECISIF", "ARCHITECTURE"] as const) if (OFFERS[key].keywords.some((k) => text.includes(norm(k)))) return key;
  if (interp.openNeed.tags.length >= 3) return "PARCOURS";
  if (interp.configuration.code === "VALUE_EMBODIED") return null; // Profil 06: no offer without a precise need
  return "ECHANGE";
}

export function composeReport(input: {
  result: ScoringResult;
  interpretation: Interpretation;
  firstName: string | null;
  openAnswer: string | null;
  bookingUrl: string;
}): ReportContent {
  const { result, interpretation: it } = input;
  const drafts: string[] = [];
  const draft = <T,>(key: string, v: T) => (drafts.push(key), v);
  const cfg = result.configuration;
  const dimScore = (d: Dimension) => result.dimensions.find((r) => r.dimension === d)!;

  // Opening (fixed texts 3.1 and 3.3)
  const opening: Block[] = [
    { t: "lead", text: LIBRARY.fixed.intro },
    { t: "note", text: LIBRARY.fixed.method },
  ];

  // 01 — configuration
  const s01: Block[] = [];
  const profile = cfg.profile ? LIBRARY.profiles[PROFILE_KEY[cfg.profile]] : null;
  if (profile) {
    s01.push({ t: "card", kicker: cfg.code === "VALUE_EMBODIED" ? "Profil 06" : `Profil ${cfg.profile!.slice(1)}`, title: profile.title, parts: [{ text: profile.text }] });
    if (cfg.secondaryProfile) s01.push({ t: "p", text: draft("secondaryProfile", SECONDARY_PROFILE_LINE(PROFILE_NAMES[cfg.secondaryProfile])) });
  } else {
    const c = draft(`configuration.${cfg.code}`, CONFIGURATION_TEXTS[cfg.code as "JOINT" | "PLURAL" | "DEVELOPED"]);
    const dims = cfg.dimensions.length ? ` Dimensions concernées : ${cfg.dimensions.map((d) => DIMENSION_LABEL[d]).join(", ")}.` : "";
    s01.push({ t: "card", title: c.title, parts: [{ text: c.text + dims }] });
  }

  // 02 — cartography
  const s02: Block[] = [
    { t: "p", text: LIBRARY.fixed.dimensions },
    { t: "scores", rows: DIMENSIONS.map((d) => ({ dimension: d, name: DIMENSION_LABEL[d], score: dimScore(d).displayScore, level: LEVELS[dimScore(d).level] })) },
  ];

  // 03 — resources
  // The library has one text per category: two resources of the same category share one card.
  const byCategory = new Map<string, Dimension[]>();
  for (const r of it.resources) byCategory.set(r.resourceCode, [...(byCategory.get(r.resourceCode) ?? []), r.dimension]);
  const s03: Block[] = byCategory.size
    ? [...byCategory].map(([code, dims]) => {
        const lib = LIBRARY.resources[code as keyof typeof LIBRARY.resources];
        return { t: "card", kicker: dims.map((d) => DIMENSION_LABEL[d]).join(" · "), title: lib.title, parts: [{ text: lib.text }, { label: "Piste de mobilisation", text: lib.lead }] } as Block;
      })
    : [{ t: "p", text: LIBRARY.fixed.noEvidence }];

  // 04 — axes (Constat → Enjeu → Levier → Perspective)
  const s04: Block[] = it.axes.length
    ? it.axes.map((a) => {
        const lib = LIBRARY.axes[a.axisCode as keyof typeof LIBRARY.axes];
        const kicker = `${a.priority === "primary" ? "Axe prioritaire" : "Axe complémentaire"}${a.proofLevel === "NUANCE" ? " · piste à explorer" : ""}`;
        return {
          t: "card",
          kicker,
          title: lib.title,
          parts: [
            { label: "Constat", text: lib.constat },
            { label: "Enjeu", text: lib.enjeu },
            { label: "Levier", text: lib.levier },
            { label: "Perspective", text: lib.perspective },
          ],
        } as Block;
      })
    : [{ t: "p", text: draft("empty.axes", EMPTY_TEXTS.axes) }];

  // 05 — crossings
  const s05: Block[] = it.crossings.length
    ? it.crossings.map((c) => ({
        t: "card",
        kicker: `${DIMENSION_LABEL[c.dimensions[0]]} × ${DIMENSION_LABEL[c.dimensions[1]]}`,
        title: c.absoluteGap >= 20 ? "Un écart marqué" : "Un écart modéré",
        parts: [{ text: LIBRARY.crossings[c.crossingCode as keyof typeof LIBRARY.crossings][c.direction] }],
      }) as Block)
    : [{ t: "p", text: draft("empty.crossings", EMPTY_TEXTS.crossings) }];

  // 06 — signature: at least two converging, supported elements (resources first, then well-mobilised dimensions)
  const supported: Dimension[] = [];
  for (const r of it.resources) if (!supported.includes(r.dimension)) supported.push(r.dimension);
  for (const d of [...result.dimensions].filter((x) => x.level >= 2 && !x.heterogeneous).sort((a, b) => b.correctedTotal - a.correctedTotal))
    if (!supported.includes(d.dimension)) supported.push(d.dimension);
  const s06: Block[] = [];
  if (supported.length >= 2) {
    const [a, b, c] = supported.map((d) => SIGNATURE_FRAGMENTS[d]);
    drafts.push("signature");
    s06.push(
      { t: "sub", title: "Votre signature personnelle", parts: [{ text: SIGNATURE_TEXTS.personal(a.maniere, b.repere) }] },
      { t: "sub", title: "Votre dynamique d’action", parts: [{ text: SIGNATURE_TEXTS.dynamics([a.dynamique, b.dynamique]) }] },
      { t: "sub", title: "Votre contribution", parts: [{ text: SIGNATURE_TEXTS.contribution(a.contribution) }] },
      { t: "sub", title: "Votre expression personnelle", parts: [] },
      { t: "quote", text: `J’apporte ${a.contribution} grâce à ${b.maniere}${c ? `, avec une attention particulière à ${c.repere}` : ""}.` },
      { t: "note", text: LIBRARY.fixed.afterSignature },
    );
  } else {
    s06.push({ t: "p", text: draft("signature.open", SIGNATURE_TEXTS.openTemplate) }, { t: "note", text: LIBRARY.fixed.afterSignature });
  }

  // 07 — next step: an autonomous action, and one recommendation at most
  const reco = chooseRecommendation(input.openAnswer, it);
  const s07: Block[] = [{ t: "p", text: LIBRARY.fixed.transition }, { t: "p", text: draft("nextStep.autonomous", NEXT_STEP_TEXTS.autonomous) }];
  if (reco) s07.push({ t: "card", kicker: "Une piste d’accompagnement JG®", title: OFFERS[reco].name, parts: [{ text: draft(`offer.${reco}`, OFFERS[reco].text) }] });

  // 08 — closing: déclic · prochaine action · et si vous alliez plus loin ?
  const primary = it.axes.find((a) => a.priority === "primary");
  const s08: Block[] = [];
  if (profile) s08.push({ t: "sub", title: "Votre déclic", parts: [{ text: profile.declic }] });
  s08.push({
    t: "sub",
    title: "Votre prochaine action",
    parts: [{ text: primary ? draft("nextStep.axis", NEXT_STEP_TEXTS.fromAxis(primary.title)) : profile ? profile.perspective : draft("nextStep.chooseFacet", NEXT_STEP_TEXTS.chooseFacet) }],
  });
  if (reco) {
    s08.push({ t: "sub", title: "Et si vous alliez plus loin ?", parts: [] });
    s08.push({ t: "cta", label: draft("cta", NEXT_STEP_TEXTS.ctaLabel), url: input.bookingUrl, note: NEXT_STEP_TEXTS.ctaNote });
  }

  const bodies = [s01, s02, s03, s04, s05, s06, s07, s08];
  const sections: Section[] = SECTION_TITLES.map(([code, title], i) => ({ code, title, blocks: bodies[i] }));
  const content: ReportContent = {
    versions: { editorial: EDITORIAL_ENGINE_VERSION, library: LIBRARY_VERSION, drafts: DRAFTS_STATUS },
    firstName: input.firstName?.trim() || null,
    opening,
    sections,
    recommendation: reco,
    draftsUsed: [...new Set(drafts)],
    qc: { ok: true, issues: [] },
  };
  content.qc = editorialCheck(content);
  return content;
}

/** Annexe 04 §12 — automated part of the editorial control, run before any PDF is produced. */
const FORBIDDEN = [/vous devez/i, /il faut absolument/i, /vous devriez/i, /faiblesse principale/i, /vous manquez/i, /vous n.êtes pas capable/i, /coaching/i, /€|\bprix\b/i, /\{[a-z_]+\}/i];

export function editorialCheck(c: ReportContent): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const texts: string[] = [];
  const walk = (b: Block) => {
    if ("text" in b) texts.push(b.text);
    if ("parts" in b) b.parts.forEach((p) => texts.push(p.text));
    if (b.t === "card" || b.t === "sub") texts.push(b.title);
  };
  [...c.opening, ...c.sections.flatMap((s) => s.blocks)].forEach(walk);
  for (const t of texts) for (const f of FORBIDDEN) if (f.test(t)) issues.push(`Formulation interdite (${f}) : « ${t.slice(0, 60)}… »`);
  if (c.sections.length !== 8) issues.push("Le rapport doit compter huit sections.");
  if (c.sections.some((s) => s.blocks.length === 0)) issues.push("Section vide.");
  if (c.sections[6].blocks.filter((b) => b.t === "card").length > 1) issues.push("Plus d’une recommandation.");
  const seen = new Map<string, number>();
  for (const t of texts.filter((t) => t.length > 80)) seen.set(t, (seen.get(t) ?? 0) + 1);
  for (const [t, n] of seen) if (n > 1) issues.push(`Texte répété : « ${t.slice(0, 50)}… »`);
  return { ok: issues.length === 0, issues };
}
