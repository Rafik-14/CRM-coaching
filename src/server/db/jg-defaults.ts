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
export const TEMPLATE_DECISIF = "Focus Décisif JG®";
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
    name: "Focus Décisif JG®",
    tagline: "Prenez votre place. Maîtrisez votre message. Faites la différence.",
    description:
      "Une échéance approche ? Un entretien important, une négociation ou une prise de parole se prépare. Concentrez-vous sur l'essentiel : identifiez vos arguments différenciants, structurez votre message et ajustez votre posture. Repartez avec des repères concrets pour aborder votre objectif avec davantage de clarté, d'assurance et d'impact.",
    sessionsCount: 1,
    price: "160.00",
    priceChf: "180.00",
    includes: [] as string[],
    goalPresets: [] as string[],
    template: TEMPLATE_DECISIF,
  },
  {
    position: 2,
    name: "Architecture Identitaire JG®",
    tagline: "Comprendre ce qui fait réellement votre valeur.",
    description:
      "Votre parcours vous a construit. Encore faut-il savoir ce qu'il révèle de vous. À travers un travail structuré, explorez vos expériences, identifiez vos forces distinctives et faites émerger ce qui vous caractérise réellement. Construisez une identité professionnelle cohérente, clarifiez votre positionnement et apprenez à exprimer ce qui fait votre singularité.",
    sessionsCount: 3,
    price: "450.00",
    priceChf: "480.00",
    includes: [] as string[],
    goalPresets: [] as string[],
    template: TEMPLATE_ARCHITECTURE,
  },
  {
    position: 3,
    name: "Parcours Signature JG®",
    tagline: "Révélez votre potentiel. Incarnez votre identité.",
    description:
      "Vous souhaitez franchir un véritable cap professionnel ? Engagez un travail approfondi pour comprendre vos mécanismes, révéler vos ressources et construire une identité pleinement assumée. De la clarification de votre potentiel à son incarnation concrète, avancez étape par étape pour aligner qui vous êtes, ce que vous apportez et la manière dont vous le faites percevoir.",
    sessionsCount: 6,
    price: "840.00",
    priceChf: "930.00",
    includes: [
      "Accompagnement individuel approfondi",
      "Workbook Signature JG®",
      "Exercices et travaux interséances",
      "Construction et affirmation du positionnement",
      "Mise en pratique et consolidation des acquis",
    ],
    goalPresets: [...SIGNATURE_AXES],
    template: TEMPLATE_SIGNATURE,
  },
];
