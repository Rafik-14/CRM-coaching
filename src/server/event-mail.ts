import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { contacts } from "@/server/db/schema";
import { currentToken, issueToken } from "@/server/access-tokens";
import { appUrl } from "@/server/email/config";
import { sendEmail } from "@/server/email/send";
import { getTemplate } from "@/server/email/templates";
import { COACH_NAME, coachNotificationAddress } from "@/server/email/messages";
import { unsubscribeUrl } from "@/server/sequences";
import type { EventRow, RegistrationRow } from "@/server/events";
import { icsEvent } from "@/lib/ics";
import { APP_TIME_ZONE } from "@/lib/format";
import { EVENT_KIND_LABEL, type EventKind } from "@/lib/events";
import { fillTemplateText, type TemplateKey } from "@/lib/email-templates";
import type { EmailContent } from "@/server/email/layout";

/** E-mails of conferences & workshops (docs/technical/plans/EVENTS-PLAN.md §1, §5). Never throws (sendEmail logs failures). */

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const DAY = 86_400_000;

export type EventMailKind = "event_confirmation" | "event_waitlist" | "event_seat_available" | "event_reminder" | "event_cancelled" | "event_thanks";

/** Private link of a booking (/inscription/<token>): see it, add it to the agenda, cancel. Valid 30 days after the event. */
export async function registrationLink(registrationId: string, event: Pick<EventRow, "endsAt">) {
  const live =
    (await currentToken(db, "event_registration", { registrationId })) ??
    (await issueToken(db, { purpose: "event_registration", registrationId, expiresAt: new Date(event.endsAt.getTime() + 30 * DAY) }));
  return `${appUrl()}/inscription/${live.token}`;
}

export const eventPlace = (e: Pick<EventRow, "location" | "onlineUrl">) => e.location ?? (e.onlineUrl ? "En ligne" : null);

/** The event as a calendar file (attached to the confirmation, downloadable from the private page). */
export function eventIcs(e: EventRow, registrationId: string, cancelled = false) {
  return icsEvent({
    uid: `event-${registrationId}@jeremygalea`,
    start: e.startsAt,
    durationMin: Math.max(15, Math.round((e.endsAt.getTime() - e.startsAt.getTime()) / 60_000)),
    summary: `${EVENT_KIND_LABEL[e.kind as EventKind] ?? "Événement"} · ${e.title}`,
    description: [e.summary, e.onlineUrl && `Lien : ${e.onlineUrl}`].filter(Boolean).join("\n") || null,
    location: e.location ?? e.onlineUrl,
    status: cancelled ? "CANCELLED" : "CONFIRMED",
    updatedAt: e.updatedAt,
  });
}

export async function sendEventMail(kind: EventMailKind, event: EventRow, reg: RegistrationRow) {
  const tpl = await getTemplate(kind as TemplateKey);
  if (!tpl.enabled) return { ok: true, skipped: true };

  let unsubscribe: string | undefined;
  if (kind === "event_thanks") {
    // Optional e-mail: not sent to people who asked to stop, and it carries the « stop » link.
    if (reg.contactId) {
      const c = await db.query.contacts.findFirst({ where: eq(contacts.id, reg.contactId), columns: { emailOptOut: true } });
      if (c?.emailOptOut) return { ok: true, skipped: true };
      unsubscribe = await unsubscribeUrl(reg.contactId);
    }
  }

  const when = capitalize(dateFmt.format(event.startsAt));
  const time = `${timeFmt.format(event.startsAt)} – ${timeFmt.format(event.endsAt)}`;
  const place = eventPlace(event);
  const text = fillTemplateText(tpl.text, {
    prenom: reg.firstName,
    evenement: event.title,
    date: dateFmt.format(event.startsAt),
    heure: timeFmt.format(event.startsAt),
    lieu: place ?? "",
    lien_echange: `${appUrl()}/reserver?source=evenement`,
    nom_coach: COACH_NAME,
  });

  const showDetails = kind !== "event_thanks";
  const seatsLine: [string, string][] = reg.seats > 1 ? [["Places", String(reg.seats)]] : [];
  const details: [string, string][] = showDetails
    ? [
        ["Date", when],
        ["Heure (Paris / Genève)", time],
        ...(place ? ([["Lieu", place]] as [string, string][]) : []),
        // The video link only goes to people who have a seat.
        ...(event.onlineUrl && (kind === "event_confirmation" || kind === "event_seat_available" || kind === "event_reminder")
          ? ([["Lien de connexion", event.onlineUrl]] as [string, string][])
          : []),
        ...seatsLine,
      ]
    : [];

  const confirmed = kind === "event_confirmation" || kind === "event_seat_available" || kind === "event_reminder" || kind === "event_waitlist";
  const content: EmailContent = {
    preheader: text.subject,
    heading: text.heading,
    paragraphs: text.paragraphs,
    ...(details.length && { details }),
    ...(confirmed && {
      cta: { label: kind === "event_waitlist" ? "Voir mon inscription" : "Voir ou annuler mon inscription", url: await registrationLink(reg.id, event) },
      note: "Un empêchement ? Annulez depuis ce lien : votre place reviendra à quelqu’un d’autre.",
    }),
    ...(unsubscribe && { unsubscribeUrl: unsubscribe }),
  };
  const attach = kind === "event_confirmation" || kind === "event_seat_available" || kind === "event_cancelled";
  return sendEmail({
    to: reg.email,
    contactId: reg.contactId,
    templateKey: kind,
    subject: text.subject,
    content,
    ...(attach && {
      attachments: [{ filename: "evenement.ics", contentType: "text/calendar; charset=utf-8; method=PUBLISH", content: eventIcs(event, reg.id, kind === "event_cancelled") }],
    }),
  });
}

/** Notification to Jérémy: someone registered (or joined the waiting list) from the website. */
export async function notifyCoachOfRegistration(event: EventRow, reg: RegistrationRow, totals: { confirmed: number; capacity: number | null }) {
  const to = await coachNotificationAddress();
  if (!to) return;
  const name = `${reg.firstName} ${reg.lastName}`.trim();
  const waiting = reg.status === "waitlist";
  await sendEmail({
    to,
    contactId: reg.contactId,
    templateKey: "coach_event_registration",
    replyTo: reg.email,
    subject: `${waiting ? "Liste d’attente" : "Nouvelle inscription"} : ${name} — ${event.title}`,
    content: {
      preheader: `${name} · ${event.title}`,
      heading: waiting ? "Nouvelle personne sur la liste d’attente" : "Nouvelle inscription à un événement",
      paragraphs: [`${name} vient de s’inscrire depuis le site. La fiche contact est à jour dans le CRM.`],
      details: [
        ["Événement", event.title],
        ["Date", `${capitalize(dateFmt.format(event.startsAt))} à ${timeFmt.format(event.startsAt)}`],
        ["Places", String(reg.seats)],
        ["Inscrits", event.capacity ? `${totals.confirmed} / ${event.capacity}` : String(totals.confirmed)],
        ["E-mail", reg.email],
        ...(reg.phone ? ([["Téléphone", reg.phone]] as [string, string][]) : []),
        ...(reg.company ? ([["Structure", reg.company]] as [string, string][]) : []),
      ],
      cta: { label: "Voir les inscrits", url: `${appUrl()}/mes-evenements/${event.id}` },
      signature: ["CRM · Méthode JG®"],
    },
  });
}

/** Free message from the coach to everyone registered (e.g. « le lieu change »). */
export async function sendEventMessage(event: EventRow, reg: RegistrationRow, subject: string, body: string) {
  return sendEmail({
    to: reg.email,
    contactId: reg.contactId,
    templateKey: "event_message",
    subject,
    content: {
      preheader: subject,
      heading: `Bonjour ${reg.firstName},`,
      paragraphs: body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
      details: [
        ["Événement", event.title],
        ["Date", `${capitalize(dateFmt.format(event.startsAt))} à ${timeFmt.format(event.startsAt)}`],
      ],
      ...(reg.status !== "cancelled" && { cta: { label: "Voir mon inscription", url: await registrationLink(reg.id, event) } }),
    },
  });
}

/** The coach changed the date, time or place: everyone registered gets the new details and an updated calendar file. */
export async function sendEventChanged(event: EventRow, reg: RegistrationRow) {
  const when = capitalize(dateFmt.format(event.startsAt));
  const place = eventPlace(event);
  const confirmed = reg.status === "confirmed";
  return sendEmail({
    to: reg.email,
    contactId: reg.contactId,
    templateKey: "event_changed",
    subject: `Changement : ${event.title}`,
    content: {
      preheader: `Nouvelles informations : ${when} à ${timeFmt.format(event.startsAt)}`,
      heading: `Bonjour ${reg.firstName},`,
      paragraphs: [
        `Les informations de « ${event.title} » ont changé. Voici les détails à jour${confirmed ? " ; le fichier joint met à jour votre agenda" : ""}.`,
        "Si vous ne pouvez plus venir, annulez depuis le lien ci-dessous : votre place reviendra à quelqu’un d’autre.",
      ],
      details: [
        ["Date", when],
        ["Heure (Paris / Genève)", `${timeFmt.format(event.startsAt)} – ${timeFmt.format(event.endsAt)}`],
        ...(place ? ([["Lieu", place]] as [string, string][]) : []),
        ...(confirmed && event.onlineUrl ? ([["Lien de connexion", event.onlineUrl]] as [string, string][]) : []),
      ],
      cta: { label: "Voir ou annuler mon inscription", url: await registrationLink(reg.id, event) },
    },
    ...(confirmed && {
      attachments: [{ filename: "evenement.ics", contentType: "text/calendar; charset=utf-8; method=PUBLISH", content: eventIcs(event, reg.id) }],
    }),
  });
}
