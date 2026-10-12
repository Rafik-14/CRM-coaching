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
      "Le point de départ pour prendre du recul, révéler votre singularité et faire émerger le fil conducteur de votre parcours.",
    sessionsCount: 1,
    price: "170.00",
    priceChf: "190.00",
    includes: [] as string[],
    goalPresets: [] as string[],
    template: TEMPLATE_ARCHITECTURE,
  },
  {
    position: 2,
    name: "Accompagnement Décisif JG®",
    tagline: "Réussir un moment qui compte.",
    description:
      "Un accompagnement court et ciblé pour préparer un enjeu professionnel précis et faire percevoir votre valeur lorsque la décision se prend.",
    sessionsCount: 3,
    price: "470.00",
    priceChf: "490.00",
    includes: [] as string[],
    goalPresets: [] as string[],
    template: TEMPLATE_DECISIF,
  },
  {
    position: 3,
    name: "Parcours Signature JG®",
    tagline: "Transformer durablement votre manière d'incarner votre valeur.",
    description:
      "L'accompagnement de référence pour construire une identité professionnelle plus claire, plus assumée et plus cohérente avec votre potentiel.",
    sessionsCount: 8,
    price: "1090.00",
    priceChf: "1190.00",
    includes: ["8 séances individuelles", "Workbook Signature JG®", "Exercices entre les séances"],
    goalPresets: [...SIGNATURE_AXES],
    template: TEMPLATE_SIGNATURE,
  },
];
