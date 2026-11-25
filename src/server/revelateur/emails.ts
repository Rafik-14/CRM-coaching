import "server-only";
import type { EmailContent } from "@/server/email/layout";

/** Delivery e-mail: text validated in dossier v2.0 §8 (no score, no profile, no offer). */
export const DELIVERY_SUBJECT = "Votre rapport personnalisé – Test Signature JG®";
export const REPORT_FILENAME = "Rapport_Test_Signature_JG.pdf";

export function deliveryEmail(): EmailContent {
  return {
    preheader: "Votre rapport personnalisé est en pièce jointe.",
    heading: "Votre rapport personnalisé",
    paragraphs: [
      "Bonjour,",
      "Avant toute chose, merci d'avoir pris le temps de répondre aux 30 questions et d'avoir choisi le Révélateur de la Méthode JG® pour explorer votre rapport à votre valeur.",
      "Votre démarche constitue déjà une première occasion de prendre du recul, de porter un autre regard sur vous-même et de mieux comprendre certaines de vos ressources.",
      "Vous trouverez votre rapport personnalisé en pièce jointe de cet e-mail.",
      "Quelques mots avant de le découvrir…",
      "Les résultats présentés dans ce rapport ne sont ni une définition définitive de votre personne, ni une photographie immuable de ce que vous êtes.",
      "Ils reflètent une représentation de votre situation actuelle, à travers vos réponses, vos perceptions et la manière dont vous estimez mobiliser votre valeur aujourd'hui.",
      "Votre parcours, vos expériences, vos prises de conscience et vos choix peuvent faire évoluer cette représentation. Ce rapport constitue donc un point de repère, une première cartographie pour mieux comprendre où vous en êtes, et non une limite à ce que vous pouvez devenir.",
      "Prenez le temps de le découvrir, de vous interroger et surtout de vous approprier ce qui résonne avec vous.",
      "Je vous souhaite une belle découverte.",
    ],
    signature: ["Jérémy Galéa", "Méthode JG®", "Révéler votre potentiel"],
  };
}

/** Address confirmation (decision of 18 Nov: the address is confirmed by a link). DRAFT wording. */
export const VERIFY_SUBJECT = "Confirmez votre adresse – Test Signature JG®";

export function verifyEmail(link: string, firstName: string | null, hours: number): EmailContent {
  return {
    preheader: "Un clic pour recevoir votre rapport personnalisé.",
    heading: "Confirmez votre adresse",
    paragraphs: [
      firstName ? `Bonjour ${firstName},` : "Bonjour,",
      "Pour recevoir votre rapport personnalisé du Test Signature JG®, confirmez votre adresse e-mail.",
      `Ce lien est valable ${hours} heures. Votre adresse sert uniquement à l'envoi de votre rapport.`,
    ],
    cta: { label: "Confirmer mon adresse", url: link },
    note: "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.",
    signature: ["Jérémy Galéa", "Méthode JG®"],
  };
}
