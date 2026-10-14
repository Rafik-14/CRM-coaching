import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { settings, user } from "@/server/db/schema";
import { APP_TIME_ZONE } from "@/lib/format";
import { icsEvent } from "@/lib/ics";
import { segmentLabel } from "@/lib/jg";
import { appUrl } from "./config";
import type { EmailContent } from "./layout";

/**
 * The e-mails of M1, in French. Wording is fixed for now; Phase 2 · M4 makes it editable in Paramètres.
 */

export const EMAIL_SETTINGS_KEY = "email";

/** Where the coach receives notifications: Paramètres › E-mails, else the coach account's address. */
export async function coachNotificationAddress(): Promise<string | null> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, EMAIL_SETTINGS_KEY) });
  const notifyTo = (row?.value as { notifyTo?: string } | undefined)?.notifyTo;
  if (notifyTo) return notifyTo;
  const coach = await db.query.user.findFirst({ where: eq(user.role, "coach"), orderBy: asc(user.createdAt) });
  return coach?.email ?? null;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: APP_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const NEXT_STEP: Record<string, string> = {
  Visio: "Je vous envoie le lien de la visio avant notre échange.",
  Téléphone: "Je vous appelle au numéro indiqué, à l’heure prévue.",
  Cabinet: "Je vous confirme l’adresse avant notre échange.",
};

type Mail = { subject: string; content: EmailContent; attachments?: { filename: string; content: string; contentType: string }[] };

// ------------------------------------------------------------------ online booking

export function bookingConfirmation(b: {
  sessionId: string;
  firstName: string;
  startsAt: Date;
  durationMin: number;
  location: string | null;
  token: string;
}): Mail {
  const when = capitalize(dateFmt.format(b.startsAt));
  const time = timeFmt.format(b.startsAt);
  return {
    subject: `Votre échange stratégique du ${dateFmt.format(b.startsAt)} à ${time}`,
    content: {
      preheader: `C’est réservé : ${when} à ${time}.`,
      heading: `Merci ${b.firstName}, c’est réservé.`,
      paragraphs: [
        "Votre échange stratégique est bien enregistré. Ces 20 minutes nous permettront de comprendre votre situation, ce que vous cherchez à faire évoluer, et de voir ensemble quel point de départ est le plus pertinent.",
        `${NEXT_STEP[b.location ?? ""] ?? "Je vous confirme les détails avant notre échange."} Le rendez-vous est joint à cet e-mail pour l’ajouter à votre agenda.`,
      ],
      details: [
        ["Date", when],
        ["Heure (Paris / Genève)", time],
        ["Durée", `${b.durationMin} minutes`],
        ...(b.location ? ([["Lieu", b.location]] as [string, string][]) : []),
      ],
      cta: { label: "Voir ma réservation", url: `${appUrl()}/reserver/confirmation?r=${encodeURIComponent(b.token)}` },
      note: "Un empêchement ? Répondez simplement à cet e-mail.",
    },
    attachments: [
      {
        filename: "echange-strategique.ics",
        contentType: "text/calendar; charset=utf-8; method=PUBLISH",
        content: icsEvent({
          uid: `${b.sessionId}@jeremygalea`,
          start: b.startsAt,
          durationMin: b.durationMin,
          summary: "Échange stratégique avec Jérémy Galéa",
          description: "20 minutes pour parler de votre situation. Sans engagement.",
          location: b.location,
        }),
      },
    ],
  };
}

export function coachNewBooking(b: {
  contactId: string;
  name: string;
  email: string;
  phone: string | null;
  segment: string | null;
  stake: string | null;
  message: string | null;
  startsAt: Date;
  durationMin: number;
  source: string | null;
}): Mail {
  const when = `${capitalize(dateFmt.format(b.startsAt))} à ${timeFmt.format(b.startsAt)}`;
  return {
    subject: `Nouvel échange stratégique : ${b.name} — ${when}`,
    content: {
      preheader: `${b.name} a réservé en ligne pour le ${when}.`,
      heading: "Nouvel échange stratégique réservé en ligne",
      paragraphs: [
        `${b.name} vient de réserver depuis le site. La séance, la tâche de préparation et la fiche sont dans le CRM.`,
        ...(b.message ? [`Sa situation : ${b.message}`] : []),
      ],
      details: [
        ["Rendez-vous", `${when} · ${b.durationMin} min`],
        ["E-mail", b.email],
        ...(b.phone ? ([["Téléphone", b.phone]] as [string, string][]) : []),
        ...(b.segment ? ([["Profil", segmentLabel(b.segment) ?? b.segment]] as [string, string][]) : []),
        ...(b.stake ? ([["Enjeu", b.stake]] as [string, string][]) : []),
        ...(b.source ? ([["Bouton du site", b.source]] as [string, string][]) : []),
      ],
      cta: { label: "Ouvrir la fiche", url: `${appUrl()}/contacts/${b.contactId}` },
      signature: ["CRM · Méthode JG®"],
    },
  };
}

// ------------------------------------------------------------------ contact form

export function contactAck(c: { firstName: string }): Mail {
  return {
    subject: "J’ai bien reçu votre message",
    content: {
      preheader: "Merci pour votre message, je reviens vers vous rapidement.",
      heading: `Merci ${c.firstName}.`,
      paragraphs: [
        "J’ai bien reçu votre message et je reviens vers vous rapidement.",
        "Si vous souhaitez en parler de vive voix, vous pouvez aussi réserver directement un échange stratégique : 20 minutes pour parler de votre situation, sans engagement.",
      ],
      cta: { label: "Réserver un échange stratégique", url: `${appUrl()}/reserver?source=email-accuse-reception` },
    },
  };
}

export function coachNewMessage(m: {
  contactId: string;
  name: string;
  email: string;
  phone: string | null;
  segment: string | null;
  message: string;
  created: boolean;
}): Mail {
  return {
    subject: `Nouveau message du site : ${m.name}`,
    content: {
      preheader: m.message.slice(0, 120),
      heading: m.created ? "Nouveau contact via le site" : "Nouveau message d’un contact existant",
      paragraphs: [m.message],
      details: [
        ["De", m.name],
        ["E-mail", m.email],
        ...(m.phone ? ([["Téléphone", m.phone]] as [string, string][]) : []),
        ...(m.segment ? ([["Profil", segmentLabel(m.segment) ?? m.segment]] as [string, string][]) : []),
      ],
      cta: { label: "Ouvrir la fiche", url: `${appUrl()}/contacts/${m.contactId}` },
      note: "Une tâche « Rappeler » a été ajoutée dans le CRM.",
      signature: ["CRM · Méthode JG®"],
    },
  };
}

// ------------------------------------------------------------------ test

export function testEmail(): Mail {
  return {
    subject: "E-mail de test · Méthode JG®",
    content: {
      preheader: "Si vous lisez ceci, l’envoi d’e-mails fonctionne.",
      heading: "L’envoi d’e-mails fonctionne.",
      paragraphs: [
        "Cet e-mail de test a été envoyé depuis Paramètres › E-mails du CRM.",
        "Les confirmations de réservation, les accusés de réception et les notifications utiliseront cette même mise en page.",
      ],
      signature: ["CRM · Méthode JG®"],
    },
  };
}
