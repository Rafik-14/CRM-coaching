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

/** Settings row « email » (Paramètres › E-mails). Reminders are on unless the coach turns them off. */
export type EmailSettings = { notifyTo: string | null; reminder24h: boolean; reminder1h: boolean };

export async function getEmailSettings(): Promise<EmailSettings> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, EMAIL_SETTINGS_KEY) });
  const v = (row?.value ?? {}) as Partial<EmailSettings>;
  return { notifyTo: v.notifyTo ?? null, reminder24h: v.reminder24h ?? true, reminder1h: v.reminder1h ?? true };
}

/** Where the coach receives notifications: Paramètres › E-mails, else the coach account's address. */
export async function coachNotificationAddress(): Promise<string | null> {
  const { notifyTo } = await getEmailSettings();
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
  /** /rdv/<token>: move or cancel. */
  manageUrl: string;
  cancellationHours: number;
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
      cta: { label: "Déplacer ou annuler", url: b.manageUrl },
      note: `Un empêchement ? Vous pouvez déplacer ou annuler depuis ce lien jusqu’à ${b.cancellationHours} h avant le rendez-vous, ou simplement répondre à cet e-mail.`,
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

// ------------------------------------------------------------------ session reminders

/** « l’échange stratégique » / « la séance » / « le bilan »… for sentences about the appointment (`e`: feminine ending). */
function appointmentName(type: string) {
  if (type === "Échange stratégique") return { the: "l’échange stratégique", your: "votre échange stratégique", e: "" };
  if (type === "Bilan") return { the: "le bilan", your: "votre bilan", e: "" };
  if (type === "Intervention") return { the: "l’intervention", your: "votre intervention", e: "e" };
  return { the: "la séance", your: "votre séance", e: "e" };
}

const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(d);

/** « aujourd’hui », « demain » or « le jeudi 16 octobre » (coach's time zone). */
function relativeDay(startsAt: Date, now: Date) {
  if (dayKey(startsAt) === dayKey(now)) return "aujourd’hui";
  if (dayKey(startsAt) === dayKey(new Date(now.getTime() + 86_400_000))) return "demain";
  return `le ${new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, weekday: "long", day: "numeric", month: "long" }).format(startsAt)}`;
}

const LOCATION_LINE: Record<string, string> = {
  Visio: "Nous nous retrouvons en visio.",
  Téléphone: "Je vous appelle au numéro que vous m’avez indiqué.",
  Cabinet: "Nous nous retrouvons au cabinet.",
};

export function sessionReminder(r: {
  kind: "24h" | "1h";
  firstName: string;
  startsAt: Date;
  durationMin: number;
  type: string;
  location: string | null;
  manageUrl: string;
  cancellationHours: number;
  now: Date;
}): Mail {
  const name = appointmentName(r.type);
  const time = timeFmt.format(r.startsAt);
  const day = relativeDay(r.startsAt, r.now);
  const canStillChange = r.startsAt.getTime() - r.now.getTime() > r.cancellationHours * 3_600_000;
  const soon = r.kind === "1h";
  return {
    subject: soon ? `${capitalize(name.your)} commence à ${time}` : `Rappel : ${name.your} ${day} à ${time}`,
    content: {
      preheader: soon ? `Rendez-vous à ${time}.` : `${capitalize(day)} à ${time} · ${r.durationMin} minutes.`,
      heading: soon ? `À tout à l’heure, ${r.firstName}.` : `Bonjour ${r.firstName},`,
      paragraphs: [
        soon
          ? `Petit rappel : ${name.the} commence à ${time}.`
          : `Petit rappel : nous avons rendez-vous ${day} à ${time} pour ${name.your}.`,
        ...(r.location && LOCATION_LINE[r.location] ? [LOCATION_LINE[r.location]] : []),
      ],
      details: [
        ["Date", capitalize(dateFmt.format(r.startsAt))],
        ["Heure (Paris / Genève)", time],
        ["Durée", `${r.durationMin} minutes`],
        ...(r.location ? ([["Lieu", r.location]] as [string, string][]) : []),
      ],
      cta: { label: canStillChange ? "Déplacer ou annuler" : "Voir mon rendez-vous", url: r.manageUrl },
      note: canStillChange
        ? `Un empêchement ? Vous pouvez déplacer ou annuler depuis ce lien jusqu’à ${r.cancellationHours} h avant le rendez-vous.`
        : "Un imprévu ? Répondez simplement à cet e-mail pour me prévenir.",
    },
  };
}

// ------------------------------------------------------------------ moved / cancelled from /rdv

export function bookingMoved(b: {
  sessionId: string;
  firstName: string;
  type: string;
  startsAt: Date;
  durationMin: number;
  location: string | null;
  manageUrl: string;
}): Mail {
  const name = appointmentName(b.type);
  const when = capitalize(dateFmt.format(b.startsAt));
  const time = timeFmt.format(b.startsAt);
  return {
    subject: `Nouvel horaire : ${name.your} le ${dateFmt.format(b.startsAt)} à ${time}`,
    content: {
      preheader: `C’est noté : ${when} à ${time}.`,
      heading: `C’est noté, ${b.firstName}.`,
      paragraphs: [
        `${capitalize(name.your)} est déplacé${name.e} au nouvel horaire ci-dessous. Le rendez-vous mis à jour est joint à cet e-mail pour votre agenda.`,
      ],
      details: [
        ["Date", when],
        ["Heure (Paris / Genève)", time],
        ["Durée", `${b.durationMin} minutes`],
        ...(b.location ? ([["Lieu", b.location]] as [string, string][]) : []),
      ],
      cta: { label: "Gérer mon rendez-vous", url: b.manageUrl },
    },
    attachments: [
      {
        filename: "rendez-vous.ics",
        contentType: "text/calendar; charset=utf-8; method=PUBLISH",
        content: icsEvent({
          uid: `${b.sessionId}@jeremygalea`,
          start: b.startsAt,
          durationMin: b.durationMin,
          summary: `${b.type} avec Jérémy Galéa`,
          location: b.location,
          updatedAt: new Date(),
        }),
      },
    ],
  };
}

export function bookingCancelled(b: { firstName: string; type: string; startsAt: Date }): Mail {
  const name = appointmentName(b.type);
  const when = `${dateFmt.format(b.startsAt)} à ${timeFmt.format(b.startsAt)}`;
  return {
    subject: `Annulation confirmée : ${name.your} du ${when}`,
    content: {
      preheader: "Votre rendez-vous est bien annulé.",
      heading: `C’est annulé, ${b.firstName}.`,
      paragraphs: [
        `${capitalize(name.your)} du ${when} est bien annulé${name.e}. Pensez à le retirer de votre agenda.`,
        "Quand vous le souhaitez, vous pouvez réserver un nouveau rendez-vous en ligne.",
      ],
      cta: { label: "Réserver un nouveau rendez-vous", url: `${appUrl()}/reserver?source=email-annulation` },
    },
  };
}

export function coachBookingChanged(b: {
  contactId: string;
  name: string;
  type: string;
  change: "moved" | "cancelled";
  oldStartsAt: Date;
  newStartsAt?: Date;
  reason?: string | null;
}): Mail {
  const fmt = (d: Date) => `${capitalize(dateFmt.format(d))} à ${timeFmt.format(d)}`;
  const moved = b.change === "moved";
  return {
    subject: moved ? `Rendez-vous déplacé : ${b.name} — ${fmt(b.newStartsAt!)}` : `Rendez-vous annulé : ${b.name} — ${fmt(b.oldStartsAt)}`,
    content: {
      preheader: moved ? `${b.name} a déplacé son rendez-vous.` : `${b.name} a annulé son rendez-vous.`,
      heading: moved ? "Un rendez-vous a été déplacé en ligne" : "Un rendez-vous a été annulé en ligne",
      paragraphs: [
        moved
          ? `${b.name} a déplacé ${appointmentName(b.type).the} depuis le lien de ses e-mails. Le calendrier du CRM est à jour.`
          : `${b.name} a annulé ${appointmentName(b.type).the} depuis le lien de ses e-mails. Le créneau est de nouveau libre sur le site.`,
        ...(b.reason ? [`Son message : ${b.reason}`] : []),
      ],
      details: moved
        ? [
            ["Ancien horaire", fmt(b.oldStartsAt)],
            ["Nouvel horaire", fmt(b.newStartsAt!)],
          ]
        : [["Horaire annulé", fmt(b.oldStartsAt)]],
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
