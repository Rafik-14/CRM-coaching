import type { Dimension } from "@/lib/revelateur/scoring";

/**
 * Texts the report needs but annexe 04 does not provide. ALL ARE DRAFTS (« À VALIDER ») written to
 * the library's style rules (§2), kept apart from the verbatim library so they are easy to review and
 * replace. Nothing here is a business decision: the engine decides, these only word the gaps.
 */
export const DRAFTS_STATUS = "BROUILLON — à valider par Jérémy Galéa" as const;

/** Section 01 for the configurations that have no profile text in annexe 04. */
export const CONFIGURATION_TEXTS = {
  JOINT: {
    title: "Configuration conjointe",
    text: "Deux dimensions se situent à un niveau proche dans votre cartographie. Elles se lisent ensemble, comme une dynamique associée : l’une ne prend pas le pas sur l’autre, et chacune peut éclairer la manière dont l’autre trouve sa place.",
  },
  PLURAL: {
    title: "Configuration plurielle",
    text: "Plusieurs dimensions se situent à un niveau proche dans votre cartographie. Cette pluralité dessine un ensemble de facettes qui avancent de concert, sans qu’aucune ne doive être considérée comme prioritaire sur les autres.",
  },
  DEVELOPED: {
    title: "Configuration développée",
    text: "Les cinq dimensions de votre cartographie dépassent le seuil de 60, avec des écarts plus marqués entre elles. Cette configuration décrit un ensemble de ressources mobilisées ; la dimension la moins élevée n’y est pas une faiblesse, mais une facette qui peut trouver davantage de place.",
  },
} as const;

/** Complementary profile line (single profile + secondary). */
export const SECONDARY_PROFILE_LINE = (title: string) => `En complément, la dimension associée au profil « ${title} » mérite également votre attention.`;

/** Sections without an element kept by the engine (annexe 05 §4: a sober text, never an empty block). */
export const EMPTY_TEXTS = {
  axes: "Vos réponses ne font pas apparaître, à ce stade, d’axe suffisamment étayé pour être présenté ici. Plutôt que d’en proposer un par défaut, ce rapport vous laisse choisir la facette que vous souhaitez explorer à partir de votre cartographie.",
  crossings: "Les écarts entre vos dimensions ne dessinent pas de contraste suffisamment étayé par vos réponses pour être présenté ici. Votre cartographie se lit alors avant tout dimension par dimension.",
} as const;

/** Labels of the resource « families » (one per dimension) used in the resource cards. */
export const DIMENSION_LABEL: Record<Dimension, string> = {
  D1: "Conscience de soi",
  D2: "Positionnement",
  D3: "Expression",
  D4: "Impact relationnel",
  D5: "Incarnation",
};

/**
 * « Votre Signature de valeur » (annexe 04 §8): fragments per dimension, only used when that dimension is
 * actually supported (a resource kept by the engine, or a dimension well mobilised in the answers).
 * Vocabulary from the dimension lexical fields of annexe 04 §5.1.
 */
export const SIGNATURE_FRAGMENTS: Record<Dimension, { contribution: string; maniere: string; repere: string; dynamique: string }> = {
  D1: {
    contribution: "un regard clair sur ce qui distingue votre manière de contribuer",
    maniere: "la reconnaissance de vos qualités récurrentes",
    repere: "ce qui revient d’une expérience à l’autre",
    dynamique: "vous appuyer sur des repères que vous identifiez dans votre parcours",
  },
  D2: {
    contribution: "des choix et des convictions qui donnent une direction à votre contribution",
    maniere: "la place que vous accordez à vos priorités",
    repere: "ce qui compte pour vous dans vos décisions",
    dynamique: "orienter vos décisions à partir de vos priorités",
  },
  D3: {
    contribution: "une contribution exprimée avec des mots justes",
    maniere: "la clarté de votre message",
    repere: "ce que vous souhaitez faire comprendre",
    dynamique: "mettre en mots ce que vous apportez",
  },
  D4: {
    contribution: "une qualité d’échange qui aide à construire une compréhension commune",
    maniere: "l’écoute et l’ajustement dans l’échange",
    repere: "la place laissée à votre interlocuteur",
    dynamique: "faire évoluer les échanges en tenant compte de l’autre",
  },
  D5: {
    contribution: "une manière d’agir cohérente avec ce qui compte pour vous",
    maniere: "votre capacité à passer de l’intention à l’action",
    repere: "la cohérence entre ce que vous pensez, dites et faites",
    dynamique: "traduire vos intentions en actions, y compris lorsque l’enjeu augmente",
  },
};

export const SIGNATURE_TEXTS = {
  personal: (a: string, b: string) => `Vos réponses font converger deux repères : ${a} et ${b}. Ensemble, ils dessinent une première lecture de ce qui caractérise votre manière de contribuer.`,
  dynamics: (items: string[]) => `Dans les situations évoquées, vous déclarez ${items.join(", et ")}.`,
  contribution: (c: string) => `Votre contribution semble pouvoir s’exprimer à travers ${c}, dans vos activités, vos projets ou vos échanges.`,
  openTemplate:
    "Vos réponses ne réunissent pas encore assez d’éléments convergents pour proposer une formulation personnelle fidèle. Vous pouvez partir de cette amorce et la compléter avec vos propres exemples : « J’apporte … grâce à …, avec une attention particulière à … ».",
} as const;

/**
 * Recommendations (annexe 04 §9; offer names from dossier v2.0 §7 — « Accompagnement Décisif JG® »
 * replaces « Focus Décisif JG® »). At most one; none without an expressed need or when nothing fits.
 * Keyword triggers are DRAFT rules: the open answer is matched on these words only.
 */
export const OFFERS = {
  BILAN: {
    name: "Bilan de compétences via Ayrone",
    keywords: ["bilan", "reconversion", "projet professionnel", "orientation", "changer de métier", "changer de metier", "nouveau métier", "nouveau metier", "évolution professionnelle", "evolution professionnelle"],
    text: "Vous indiquez vouloir explorer votre parcours ou clarifier un projet professionnel. Un Bilan de compétences, réalisé avec l’organisme Ayrone, permet de faire le point sur vos compétences, vos motivations et vos pistes d’évolution, dans un cadre structuré.",
  },
  DECISIF: {
    name: "Accompagnement Décisif JG®",
    keywords: ["entretien", "présentation", "presentation", "comité", "comite", "prise de parole", "pitch", "soutenance", "négociation", "negociation", "oral", "réunion importante", "reunion importante", "promotion"],
    text: "Vous évoquez une situation précise à préparer. L’Accompagnement Décisif JG® est un accompagnement ciblé pour préparer ce moment et y présenter votre valeur avec clarté.",
  },
  ARCHITECTURE: {
    name: "Architecture Identitaire JG®",
    keywords: ["singularit", "ce qui me distingue", "ma valeur", "valoriser", "positionnement", "qui je suis", "mes forces", "points forts", "reconnaître ma", "reconnaitre ma"],
    text: "Vous souhaitez mieux comprendre ou mieux formuler ce qui vous caractérise. L’Architecture Identitaire JG® est un travail structuré pour reconnaître vos repères, préciser votre singularité et la mettre en mots.",
  },
  PARCOURS: {
    name: "Parcours Signature JG®",
    keywords: [],
    text: "Votre besoin touche plusieurs facettes de votre manière de faire reconnaître votre valeur. Le Parcours Signature JG® est un parcours approfondi et progressif pour clarifier, révéler et incarner votre valeur dans différents contextes, à votre rythme.",
  },
  ECHANGE: {
    name: "Échange de découverte",
    keywords: [],
    text: "Si vous souhaitez en parler avant de choisir une démarche, un échange de découverte vous permet de faire le point, sans engagement.",
  },
} as const;
export type OfferKey = keyof typeof OFFERS;

/** Sections 07–08 (annexe 05 §4 « Votre déclic · Votre prochaine action JG® · Et si vous alliez plus loin ? »). */
export const NEXT_STEP_TEXTS = {
  ctaLabel: "Prendre rendez-vous",
  ctaNote: "Une simple invitation, sans engagement : vous restez libre d’y donner suite.",
  /** Section 08 refers back to the primary axis instead of repeating its perspective word for word. */
  fromAxis: (title: string) => `Choisir une situation à venir pour mettre en œuvre la perspective proposée pour l’axe « ${title} », puis observer ce qu’elle rend possible.`,
  chooseFacet: "Choisir, dans votre cartographie, la facette que vous souhaitez explorer en premier, puis noter une situation récente où elle était en jeu.",
  autonomous: "Vous pouvez choisir une situation à venir dans laquelle mettre à l’épreuve une première piste de ce rapport, puis observer ce qu’elle rend possible.",
} as const;
