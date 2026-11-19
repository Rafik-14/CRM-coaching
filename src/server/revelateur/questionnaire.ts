import "server-only";

/**
 * Texts of the Révélateur shown around the 30 statements. Server-only.
 * The statements themselves are in ./question-texts.ts (server code only too).
 */

/** Optional open question after Q30 (annexe 02 §4) — not scored, never changes a result. */
export const OPEN_QUESTION =
  "Et maintenant, qu'aimeriez-vous faire évoluer ou mieux comprendre dans votre parcours, vos projets ou votre manière de faire reconnaître votre valeur ?";

/** Opening sequence lines (cahier des charges §2.1), shown one after the other (≈ 11 s, skippable). */
export const INTRO_LINES = [
  "JG® — UNE EXCLUSIVITÉ JG® — PRÉSENTE",
  "Vous avez une valeur.",
  "Savez-vous ce qui vous rend unique ?",
  "5 dimensions. 5 regards pour mieux vous comprendre.",
  "LE RÉVÉLATEUR",
  "Test Signature JG®",
  "Une expérience pour révéler ce qui vous distingue.",
  "Prêt à porter un autre regard sur vous ?",
  "30 questions · Environ 9 minutes · Rapport personnalisé",
] as const;

/** Validated texts from the dossier maître v2.0 §2 (16 Nov 2026). */
export const WELCOME_TEXT = {
  title: "Bienvenue dans votre exploration.",
  paragraphs: [
    "Prenez quelques instants pour vous. Ici, il ne s'agit pas de réussir un test, de vous évaluer ou de vous comparer aux autres.",
    "Il s'agit de porter un autre regard sur vous-même, de mieux reconnaître ce qui fait votre valeur et de découvrir comment vous la mobilisez aujourd'hui.",
    "30 questions. 5 dimensions. Un regard nouveau sur votre valeur.",
    "Répondez spontanément, avec sincérité. Il n'y a ni bonne ni mauvaise réponse. Seule compte votre perception actuelle.",
    "Votre rapport personnalisé vous sera envoyé par e-mail. Votre adresse vous sera demandée à la fin du parcours.",
  ],
  closing: "Bonne exploration.",
} as const;

export const END_TEXT = {
  title: "Votre rapport vous attend.",
  lead: "Il vient d'être envoyé à votre adresse e-mail.",
  question: "Et si ce n'était qu'un début ?",
  body: "Prendre conscience de sa valeur est une première étape. Apprendre à la comprendre, à l'affirmer et à l'incarner peut ouvrir de nouvelles perspectives.",
  closing: "La suite reste à révéler.",
  signature: "JÉRÉMY GALÉA · MÉTHODE JG®",
} as const;

/** Report-preparation animation (dossier maître v2.0 §3). */
export const PREPARATION_TEXT = {
  title: "Votre valeur prend forme.",
  lead: "Votre exploration révèle déjà de nouveaux repères. Votre rapport personnalisé se prépare…",
} as const;

/**
 * Save notice (cahier des charges §2.5). The original text said 24 hours; v2.0 §4 sets the resume
 * period to 30 days, so the duration is updated here — to be confirmed by Jérémy.
 */
export const SAVE_NOTICE =
  "Votre progression est automatiquement sauvegardée. Vous pourrez reprendre votre expérience sur ce même appareil pendant 30 jours.";

/** Ownership notice for every questionnaire screen and the PDF (dossier maître v2.0 §5). */
export const OWNERSHIP_NOTICE =
  "© Jérémy Galéa – Méthode JG® · Outil propriétaire. Toute reproduction, extraction, diffusion ou exploitation commerciale non autorisée est interdite.";
