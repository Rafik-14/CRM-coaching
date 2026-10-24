/**
 * Reference data for Jérémy Galéa's CRM (Méthode JG®): pipeline stages, note templates, offers.
 * Used by the seed for a new installation (with or without demo data). Everything stays editable in Paramètres.
 * Offer texts come from Jérémy's own site content (« Accompagnements »).
 */
import { DISCOVERY_TYPE } from "@/lib/validations/coaching";
import { SIGNATURE_AXES } from "@/lib/jg";

export const DEFAULT_STAGES = [
  { name: "Nouveau contact", color: "slate", isClient: false },
  { name: "Échange stratégique planifié", color: "blue", isClient: false },
  { name: "Échange réalisé", color: "blue", isClient: false },
  { name: "Offre recommandée", color: "amber", isClient: false },
  { name: "En accompagnement", color: "emerald", isClient: true },
  { name: "Terminé", color: "violet", isClient: true },
] as const;

export const TEMPLATE_DEFAULT = "Séance Méthode JG®";
export const TEMPLATE_ECHANGE = "Échange stratégique";
export const TEMPLATE_ARCHITECTURE = "Architecture Identitaire JG®";
export const TEMPLATE_DECISIF = "Accompagnement Décisif JG®";
export const TEMPLATE_SIGNATURE = "Parcours Signature JG®";

export const DEFAULT_TEMPLATES: { name: string; fields: string[]; isDefault?: boolean; sessionType?: string }[] = [
  {
    name: TEMPLATE_DEFAULT,
    isDefault: true,
    fields: [
      "Clarifier · situation et enjeux",
      "Révéler · ce qui distingue",
      "Incarner · posture, discours, décisions",
      "Le déclic",
      "Prochaine étape",
    ],
  },
  {
    name: TEMPLATE_ECHANGE,
    sessionType: DISCOVERY_TYPE,
    fields: ["Situation actuelle", "Enjeu / moment visé", "Ce qui freine", "Accompagnement recommandé", "Prochaine étape"],
  },
  {
    name: TEMPLATE_ARCHITECTURE,
    fields: ["Relier · expériences et choix", "Constantes et motivations", "Fil conducteur", "Ce qui distingue", "Direction"],
  },
  {
    name: TEMPLATE_DECISIF,
    fields: ["Moment visé et date", "Message clé", "Posture", "Mise en situation", "Points à travailler"],
  },
  {
    name: TEMPLATE_SIGNATURE,
    fields: [
      "Axe travaillé (Identité, Valeur, Positionnement, Posture, Impact)",
      "Clarifier",
      "Révéler",
      "Incarner",
      "Le déclic",
      "Exercices entre les séances",
      "Prochaine étape",
    ],
  },
];

export const DEFAULT_OFFERS = [
  {
    position: 1,
    name: "Architecture Identitaire JG®",
    tagline: "Comprendre ce qui fait réellement votre valeur.",
    description:
      "Prenez du recul sur votre parcours, identifiez ce qui vous distingue et clarifiez ce qui donne du sens à votre évolution professionnelle.",
    sessionsCount: 1,
    price: "160.00",
    priceChf: "180.00",
    includes: [] as string[],
    goalPresets: [] as string[],
    template: TEMPLATE_ARCHITECTURE,
  },
  {
    position: 2,
    name: "Accompagnement Décisif JG®",
    tagline: "Réussir un moment qui compte.",
    description:
      "Préparez un enjeu professionnel précis, structurez votre message et apprenez à exprimer votre valeur avec clarté et justesse lorsque la décision se prend.",
    sessionsCount: 3,
    price: "450.00",
    priceChf: "480.00",
    includes: [] as string[],
    goalPresets: [] as string[],
    template: TEMPLATE_DECISIF,
  },
  {
    position: 3,
    name: "Parcours Signature JG®",
    tagline: "Transformer durablement votre manière d'incarner votre valeur.",
    description:
      "Un accompagnement approfondi pour mieux comprendre ce qui vous distingue, affirmer votre identité professionnelle et la traduire concrètement dans votre discours, votre posture et vos choix.",
    sessionsCount: 6,
    price: "840.00",
    priceChf: "930.00",
    includes: ["6 séances individuelles", "Workbook Signature JG®", "Exercices interséances"],
    goalPresets: [...SIGNATURE_AXES],
    template: TEMPLATE_SIGNATURE,
  },
];
