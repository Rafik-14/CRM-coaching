import { z } from "zod";

/**
 * Automatic e-mails the coach can reword in Paramètres › E-mails (PHASE-2-PLAN §10).
 * Each one has an editable subject, heading and text with {{variables}}; the details box, button and
 * small print stay in code because they depend on the situation (date, link, cancellation window).
 */
export const TEMPLATE_KEYS = [
  "booking_confirmation",
  "session_reminder_24h",
  "session_reminder_1h",
  "discovery_follow_up",
  "welcome_client",
  "package_last_session",
  "coaching_finished",
  "questionnaire_invite",
  "invoice_issued",
  "payment_reminder",
  "payment_received",
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const VARIABLES = {
  prenom: "Prénom de la personne",
  nom_coach: "Votre nom",
  date: "Date du rendez-vous (« jeudi 16 octobre 2026 »)",
  heure: "Heure du rendez-vous (« 10:00 »)",
  jour: "« aujourd’hui », « demain » ou la date",
  rendez_vous: "« votre séance », « votre échange stratégique »…",
  suite: "Phrase selon le lieu (visio, téléphone, cabinet)",
  accompagnement: "Nom de l’accompagnement",
  lien_reservation: "Lien pour réserver (lien personnel pour un client)",
  lien_accompagnements: "Page « Accompagnements » du site",
  lien_questionnaire: "Lien du questionnaire de départ",
  numero_facture: "Numéro de la facture",
  montant: "Montant à payer (« 490,00 € »)",
  echeance: "Date d’échéance",
  lien_paiement: "Lien pour payer en ligne (vide si le paiement en ligne n’est pas activé)",
} as const;
export type VariableName = keyof typeof VARIABLES;
export type TemplateVars = Partial<Record<VariableName, string>>;

export type TemplateText = { subject: string; heading: string; body: string };

export type TemplateDef = TemplateText & {
  label: string;
  /** When it is sent, in the coach's words. */
  trigger: string;
  variables: VariableName[];
  /** Transactional (confirmations, reminders, welcome): sent even when the contact refused other e-mails. */
  essential: boolean;
  /** Offered in « Envoyer un e-mail » on the contact file. */
  manual: boolean;
};

export const TEMPLATE_DEFS: Record<TemplateKey, TemplateDef> = {
  booking_confirmation: {
    label: "Confirmation de réservation",
    trigger: "Dès qu’un échange stratégique est réservé sur le site.",
    variables: ["prenom", "date", "heure", "suite", "nom_coach"],
    essential: true,
    manual: false,
    subject: "Votre échange stratégique du {{date}} à {{heure}}",
    heading: "Merci {{prenom}}, c’est réservé.",
    body: [
      "Votre échange stratégique est bien enregistré. Ces 20 minutes nous permettront de comprendre votre situation, ce que vous cherchez à faire évoluer, et de voir ensemble quel point de départ est le plus pertinent.",
      "{{suite}} Le rendez-vous est joint à cet e-mail pour l’ajouter à votre agenda.",
    ].join("\n\n"),
  },
  session_reminder_24h: {
    label: "Rappel la veille",
    trigger: "24 h avant chaque rendez-vous prévu.",
    variables: ["prenom", "rendez_vous", "jour", "date", "heure", "nom_coach"],
    essential: true,
    manual: false,
    subject: "Rappel : {{rendez_vous}} {{jour}} à {{heure}}",
    heading: "Bonjour {{prenom}},",
    body: "Petit rappel : nous avons rendez-vous {{jour}} à {{heure}} pour {{rendez_vous}}.",
  },
  session_reminder_1h: {
    label: "Rappel 1 h avant",
    trigger: "1 h avant chaque rendez-vous prévu.",
    variables: ["prenom", "rendez_vous", "heure", "nom_coach"],
    essential: true,
    manual: false,
    subject: "Rappel : {{rendez_vous}} commence à {{heure}}",
    heading: "À tout à l’heure, {{prenom}}.",
    body: "Petit rappel : {{rendez_vous}} commence à {{heure}}.",
  },
  discovery_follow_up: {
    label: "Suivi après l’échange stratégique",
    trigger: "Le lendemain d’un échange stratégique marqué « effectué », si la personne n’est pas devenue cliente.",
    variables: ["prenom", "lien_accompagnements", "nom_coach"],
    essential: false,
    manual: true,
    subject: "Suite à notre échange",
    heading: "Merci {{prenom}} pour notre échange.",
    body: [
      "J’espère que ces 20 minutes vous ont aidé à y voir plus clair sur votre situation et sur ce que vous souhaitez faire évoluer.",
      "Si vous voulez aller plus loin, les accompagnements de la Méthode JG® sont présentés ici : {{lien_accompagnements}}",
      "Une question, une hésitation ? Répondez simplement à cet e-mail, je vous réponds personnellement.",
    ].join("\n\n"),
  },
  welcome_client: {
    label: "Bienvenue au nouveau client",
    trigger: "Dès qu’un contact devient client.",
    variables: ["prenom", "lien_reservation", "lien_questionnaire", "nom_coach"],
    essential: true,
    manual: true,
    subject: "Bienvenue dans votre accompagnement",
    heading: "Bienvenue {{prenom}} !",
    body: [
      "Je suis heureux de commencer cet accompagnement avec vous.",
      "Pour préparer notre première séance, prenez quelques minutes pour répondre à ce court questionnaire : {{lien_questionnaire}}",
      "Vous pouvez réserver vos séances directement dans mon agenda, au créneau qui vous convient : {{lien_reservation}}",
      "À très vite,",
    ].join("\n\n"),
  },
  package_last_session: {
    label: "Dernière séance de l’accompagnement",
    trigger: "Quand il ne reste plus qu’une séance dans l’accompagnement du client.",
    variables: ["prenom", "accompagnement", "lien_reservation", "nom_coach"],
    essential: false,
    manual: true,
    subject: "Votre dernière séance approche",
    heading: "Bonjour {{prenom}},",
    body: [
      "Il nous reste une séance dans votre {{accompagnement}}. C’est le moment de faire le point sur le chemin parcouru et sur la suite.",
      "Si vous n’avez pas encore réservé cette dernière séance : {{lien_reservation}}",
      "Et si vous souhaitez continuer après, parlons-en ensemble lors de notre prochain rendez-vous.",
    ].join("\n\n"),
  },
  coaching_finished: {
    label: "Merci et demande de témoignage",
    trigger: "2 jours après un accompagnement clôturé « terminé ».",
    variables: ["prenom", "nom_coach"],
    essential: false,
    manual: true,
    subject: "Merci pour votre confiance",
    heading: "Merci {{prenom}}.",
    body: [
      "Notre accompagnement est terminé, et je tenais à vous remercier pour votre confiance et votre engagement.",
      "Votre retour me serait précieux : en quelques lignes, qu’est-ce qui vous a amené, et qu’est-ce qui a changé pour vous ? Répondez simplement à cet e-mail. Avec votre accord, je pourrai le partager de façon anonyme.",
      "Je vous souhaite le meilleur pour la suite.",
    ].join("\n\n"),
  },
  questionnaire_invite: {
    label: "Questionnaire de départ",
    trigger: "Quand vous l’envoyez depuis la fiche client (il est aussi inclus dans l’e-mail de bienvenue).",
    variables: ["prenom", "lien_questionnaire", "nom_coach"],
    essential: true,
    manual: true,
    subject: "Quelques questions avant notre première séance",
    heading: "Bonjour {{prenom}},",
    body: [
      "Pour que notre première séance soit la plus utile possible, prenez quelques minutes pour répondre à ce court questionnaire : {{lien_questionnaire}}",
      "Le lien reste valable 30 jours. Vos réponses ne sont lues que par moi.",
    ].join("\n\n"),
  },
  invoice_issued: {
    label: "Envoi d’une facture",
    trigger: "Quand vous émettez une facture (la facture PDF est jointe).",
    variables: ["prenom", "numero_facture", "montant", "echeance", "lien_paiement", "nom_coach"],
    essential: true,
    manual: false,
    subject: "Votre facture n° {{numero_facture}}",
    heading: "Bonjour {{prenom}},",
    body: [
      "Vous trouverez ci-joint votre facture n° {{numero_facture}}, d’un montant de {{montant}}, à régler avant le {{echeance}}.",
      "Vous pouvez la régler par virement (coordonnées sur la facture) ou en ligne : {{lien_paiement}}",
      "Merci pour votre confiance.",
    ].join("\n\n"),
  },
  payment_reminder: {
    label: "Relance de paiement",
    trigger: "Après l’échéance d’une facture non réglée, aux jours choisis dans Paramètres › Facturation.",
    variables: ["prenom", "numero_facture", "montant", "echeance", "lien_paiement", "nom_coach"],
    essential: true,
    manual: false,
    subject: "Rappel : facture n° {{numero_facture}}",
    heading: "Bonjour {{prenom}},",
    body: [
      "Sauf erreur de ma part, la facture n° {{numero_facture}} ({{montant}}), arrivée à échéance le {{echeance}}, n’est pas encore réglée.",
      "Vous pouvez la régler par virement ou en ligne : {{lien_paiement}}",
      "Si le paiement est déjà parti, merci de ne pas tenir compte de ce message.",
    ].join("\n\n"),
  },
  payment_received: {
    label: "Paiement reçu",
    trigger: "Quand une facture est entièrement réglée.",
    variables: ["prenom", "numero_facture", "montant", "nom_coach"],
    essential: true,
    manual: false,
    subject: "Paiement reçu · facture n° {{numero_facture}}",
    heading: "Merci {{prenom}} !",
    body: "J’ai bien reçu votre paiement de {{montant}} pour la facture n° {{numero_facture}}. Merci beaucoup.",
  },
};

/** Example values for the preview in Paramètres. */
export const SAMPLE_VARS: Required<TemplateVars> = {
  prenom: "Claire",
  nom_coach: "Jérémy Galéa",
  date: "jeudi 16 octobre 2026",
  heure: "10:00",
  jour: "demain",
  rendez_vous: "votre séance",
  suite: "Je vous envoie le lien de la visio avant notre échange.",
  accompagnement: "Parcours Signature JG®",
  lien_reservation: "https://www.exemple.ch/reserver/seance/…",
  lien_accompagnements: "https://www.exemple.ch/accompagnements",
  lien_questionnaire: "https://www.exemple.ch/questionnaire/…",
  numero_facture: "2026-0001",
  montant: "490,00 €",
  echeance: "1 novembre 2026",
  lien_paiement: "https://www.exemple.ch/paiement/…",
};

const VAR_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Replaces {{variables}}; an unknown or missing one becomes empty text (the save form rejects unknown ones). */
export function fillTemplate(text: string, vars: TemplateVars) {
  return text.replace(VAR_PATTERN, (_, name: string) => vars[name as VariableName] ?? "").replace(/[ \t]+\n/g, "\n");
}

export function unknownVariables(text: string, allowed: readonly VariableName[]) {
  return [...text.matchAll(VAR_PATTERN)].map((m) => m[1]).filter((name) => !(allowed as readonly string[]).includes(name));
}

/** The coach's wording when saved, else the default. */
export function resolveTemplate(key: TemplateKey, saved?: Partial<TemplateText> | null): TemplateText {
  const def = TEMPLATE_DEFS[key];
  return { subject: saved?.subject || def.subject, heading: saved?.heading || def.heading, body: saved?.body || def.body };
}

/** Subject, heading and paragraphs (blank lines separate paragraphs) with the variables filled in. */
export function fillTemplateText(text: TemplateText, vars: TemplateVars) {
  return {
    subject: fillTemplate(text.subject, vars).replace(/\s+/g, " ").trim(),
    heading: fillTemplate(text.heading, vars).trim(),
    paragraphs: fillTemplate(text.body, vars)
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
  };
}

/** Paramètres › E-mails › Modifier: lengths and only the variables this e-mail knows. */
export function templateFormSchema(key: TemplateKey) {
  const allowed = TEMPLATE_DEFS[key].variables;
  const field = (max: number, label: string) =>
    z
      .string()
      .trim()
      .min(1, `${label} : obligatoire.`)
      .max(max, `${label} : ${max} caractères maximum.`)
      .superRefine((text, ctx) => {
        const unknown = unknownVariables(text, allowed);
        if (unknown.length) {
          ctx.addIssue({ code: "custom", message: `Variable inconnue pour cet e-mail : ${unknown.map((u) => `{{${u}}}`).join(", ")}` });
        }
      });
  return z.object({ subject: field(200, "Objet"), heading: field(200, "Titre"), body: field(5000, "Texte") });
}
