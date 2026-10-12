/**
 * Jérémy Galéa's business vocabulary (site « Pour qui ? », offers, Méthode JG®).
 * Shared by forms, filters, analytics and the demo seed.
 */

export const SEGMENTS = [
  { value: "particulier", label: "Particulier" },
  { value: "entrepreneur", label: "Entrepreneur" },
  { value: "entreprise", label: "Entreprise" },
  { value: "cabinet_rh", label: "Cabinet RH / chasseur de têtes" },
  { value: "ecole", label: "École / université" },
] as const;
export type Segment = (typeof SEGMENTS)[number]["value"];
export const SEGMENT_VALUES = SEGMENTS.map((s) => s.value) as [Segment, ...Segment[]];

/** Organisations that can send contacts to Jérémy (shown in « Recommandé par »). */
export const PARTNER_SEGMENTS: readonly Segment[] = ["cabinet_rh", "ecole", "entreprise"];

export const SUB_SEGMENTS = [
  { value: "etudiant", label: "Étudiant / jeune diplômé" },
  { value: "recherche_emploi", label: "En recherche d'emploi" },
  { value: "reconversion", label: "En reconversion ou en évolution" },
] as const;
export type SubSegment = (typeof SUB_SEGMENTS)[number]["value"];
export const SUB_SEGMENT_VALUES = SUB_SEGMENTS.map((s) => s.value) as [SubSegment, ...SubSegment[]];

export const segmentLabel = (v: string | null | undefined) => SEGMENTS.find((s) => s.value === v)?.label ?? null;
export const subSegmentLabel = (v: string | null | undefined) => SUB_SEGMENTS.find((s) => s.value === v)?.label ?? null;

/** « Enjeux » from the offers: a decisive moment (Accompagnement Décisif) or a direction (Architecture Identitaire). */
export const STAKES = [
  "Entretien",
  "Stage",
  "Alternance",
  "Oral",
  "Pitch",
  "Négociation",
  "Prise de poste",
  "Clarification",
  "Repositionnement",
  "Orientation",
  "Reconversion",
  "Évolution",
  "Leadership",
  "Recrutement",
] as const;

export const COUNTRIES = [
  { value: "FR", label: "France", currency: "EUR" },
  { value: "CH", label: "Suisse", currency: "CHF" },
] as const;
export const countryLabel = (v: string | null | undefined) => COUNTRIES.find((c) => c.value === v)?.label ?? null;

/** Méthode JG® steps (home page wording; the method page says « Relier » for step 1). */
export const METHOD_STEPS = ["Clarifier", "Révéler", "Incarner"] as const;
/** Parcours Signature JG® axes. */
export const SIGNATURE_AXES = ["Identité", "Valeur", "Positionnement", "Posture", "Impact"] as const;
