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
    tagline: "Vous avez de la valeur. Découvrez ce qui vous rend unique.",
    description:
      "Prenez du recul sur votre parcours, identifiez vos forces distinctives et mettez des mots sur ce qui fait réellement votre singularité. Repartez avec une vision plus claire de votre identité professionnelle, de vos atouts et de votre prochaine direction.",
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
    tagline: "Vous avez quelque chose à prouver. Faites en sorte que ça se voie.",
    description:
      "Entretien, prise de poste, négociation, présentation ou prise de parole : préparez les moments où votre capacité à convaincre peut tout changer. Structurez votre discours, affirmez votre positionnement et apprenez à faire comprendre ce qui vous distingue.",
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
    tagline: "Ne vous contentez plus de montrer ce que vous savez faire. Incarnez ce qui vous rend unique.",
    description:
      "Un parcours approfondi pour clarifier votre identité professionnelle, construire un positionnement distinctif et apprendre à exprimer votre valeur avec justesse et assurance. De la prise de conscience à l'affirmation de soi, faites de votre singularité une véritable force dans votre trajectoire professionnelle.",
    sessionsCount: 6,
    price: "840.00",
    priceChf: "930.00",
    includes: ["Workbook Signature JG®", "Exercices interséances", "Accompagnement individualisé"],
    goalPresets: [...SIGNATURE_AXES],
    template: TEMPLATE_SIGNATURE,
  },
];
