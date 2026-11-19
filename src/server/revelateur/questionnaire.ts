import "server-only";
import { QUESTION_DIMENSIONS, QUESTION_IDS, type QuestionId } from "@/lib/revelateur/scoring";

/**
 * Canonical wording of the 30 statements (annexe 02 §3, v1.0), reproduced exactly,
 * punctuation included. Server-only: the page receives one statement at a time,
 * never the whole list (dossier maître v2.0 §5).
 */
export const QUESTION_TEXTS: Record<QuestionId, string> = {
  Q01: "Je suis capable d'identifier précisément les qualités qui me distinguent des autres.",
  Q02: "Je sais reconnaître ce que j'apporte réellement dans les activités, les projets ou les environnements dans lesquels je m'investis.",
  Q03: "J'ai parfois du mal à identifier mes véritables points forts.",
  Q04: "Je sais expliquer ce qui fait ma singularité, au-delà de mes compétences techniques.",
  Q05: "Je suis à l'aise pour défendre mes idées, même lorsqu'elles ne font pas l'unanimité.",
  Q06: "Je sais prendre ma place sans avoir besoin de me comparer constamment aux autres.",
  Q07: "Il m'arrive de minimiser mes capacités pour ne pas donner l'impression de trop me mettre en avant.",
  Q08: "Je sais clairement ce que je souhaite et ce que je ne souhaite plus accepter dans mes activités, mes projets ou mon parcours.",
  Q09: "Lorsque je dois me présenter, je parviens à expliquer clairement ce qui me caractérise et ce qui me distingue.",
  Q10: "Je sais mettre en évidence ce que mes qualités, mes idées ou mes actions peuvent apporter concrètement aux autres.",
  Q11: "Il m'arrive de connaître ma valeur, mais de manquer de mots pour l'exprimer avec justesse.",
  Q12: "Je sais adapter ma manière de communiquer à mon interlocuteur sans dénaturer ce que je suis ni le message que je souhaite transmettre.",
  Q13: "Je sais contribuer à créer un climat de confiance dans un échange.",
  Q14: "Je suis attentif à la manière dont mes paroles et mon attitude sont perçues.",
  Q15: "Je parviens à faire comprendre l'intérêt de mes idées et de mes propositions.",
  Q16: "Je sais ajuster ma communication lorsque je sens que mon interlocuteur ne reçoit pas mon message comme je le souhaite.",
  Q17: "Lorsque l'enjeu d'une situation est important, je parviens à mobiliser mes ressources et à agir avec assurance.",
  Q18: "Je reste cohérent entre ce que je dis, ce que je pense et ce que je fais.",
  Q19: "Dans les situations où je suis évalué, je peux perdre une partie de mes moyens.",
  Q20: "Je sais transformer mes intentions et mes ambitions en actions concrètes.",
  Q21: "Lorsque je repense aux différentes expériences de mon parcours, je remarque que certaines qualités et façons d'agir reviennent régulièrement.",
  Q22: "Je suis capable d'identifier ce qui fait ma valeur indépendamment de mon métier, de mon poste ou de ma fonction actuelle.",
  Q23: "Je me sens légitime à prendre ma place, à exprimer mes idées et à proposer ma contribution, quel que soit le statut ou le niveau d'expérience des personnes avec lesquelles j'échange.",
  Q24: "Je suis capable de faire des choix qui correspondent à mes priorités, même lorsqu'ils diffèrent de ce que les autres attendent de moi.",
  Q25: "Je suis capable de faire comprendre ce qui distingue ma manière de penser, d'agir ou de contribuer, au-delà de la simple description de mes compétences.",
  Q26: "Je suis capable de présenter l'essentiel de ce que je souhaite transmettre de manière concise, structurée et compréhensible.",
  Q27: "Dans un échange, je prends le temps de comprendre le point de vue de mon interlocuteur avant de chercher à faire passer le mien.",
  Q28: "Je suis capable de faire évoluer un échange de manière naturelle, en tenant compte des réactions et des contributions de mon interlocuteur.",
  Q29: "Lorsque je ressens une émotion forte dans une situation importante, je parviens à prendre du recul pour choisir la manière dont je souhaite réagir.",
  Q30: "Même lorsque je rencontre des difficultés ou des imprévus, je parviens généralement à poursuivre les actions importantes pour moi en ajustant ma manière de faire.",
};

/** Optional open question after Q30 (annexe 02 §4) — not scored, never changes a result. */
export const OPEN_QUESTION =
  "Et maintenant, qu'aimeriez-vous faire évoluer ou mieux comprendre dans votre parcours, vos projets ou votre manière de faire reconnaître votre valeur ?";

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

/** Ownership notice for every questionnaire screen and the PDF (dossier maître v2.0 §5). */
export const OWNERSHIP_NOTICE =
  "© Jérémy Galéa – Méthode JG® · Outil propriétaire. Toute reproduction, extraction, diffusion ou exploitation commerciale non autorisée est interdite.";

/** One statement for the page: only what the current screen needs. */
export function questionForScreen(index: number) {
  const id = QUESTION_IDS[index];
  if (!id) return null;
  return { id, number: index + 1, total: QUESTION_IDS.length, text: QUESTION_TEXTS[id], dimension: QUESTION_DIMENSIONS[id] };
}
