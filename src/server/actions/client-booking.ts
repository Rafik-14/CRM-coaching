"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { accessTokens, activityLog, coachingSessions, contacts } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { currentToken, issueToken, manageToken, revokeTokens } from "@/server/access-tokens";
import { getAvailability, getBookingSettings, lockAndCheckSlot } from "@/server/booking";
import { clientBookingUrl, resolveClientBooking } from "@/server/client-booking";
import { clientIp, rateLimited } from "@/server/rate-limit";
import { appUrl } from "@/server/email/config";
import { sendEmail } from "@/server/email/send";
import { clientBookingLink, clientSessionConfirmation, coachNewClientBooking, coachNotificationAddress } from "@/server/email/messages";
import type { ActionState } from "./coaching";

// ------------------------------------------------------------------ CRM › fiche client

const NOT_ACTIVE = "Réservé aux clients dont l’accompagnement est en cours.";

async function activeClient(contactId: string) {
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, z.uuid().parse(contactId)),
    columns: { id: true, firstName: true, email: true },
    with: { client: { columns: { status: true } } },
  });
  return contact?.client?.status === "active" ? contact : null;
}

export async function createClientBookingLink(contactId: string): Promise<ActionState> {
  await requireCoach();
  const contact = await activeClient(contactId);
  if (!contact) return { error: NOT_ACTIVE };
  if (!(await currentToken(db, "client_booking", { contactId: contact.id }))) {
    await issueToken(db, { purpose: "client_booking", contactId: contact.id });
  }
  refresh();
  return { ok: true };
}

/** New link: the old one stops working at once. */
export async function regenerateClientBookingLink(contactId: string): Promise<ActionState> {
  await requireCoach();
  const contact = await activeClient(contactId);
  if (!contact) return { error: NOT_ACTIVE };
  await db.transaction(async (tx) => {
    await revokeTokens(tx, "client_booking", { contactId: contact.id });
    await issueToken(tx, { purpose: "client_booking", contactId: contact.id });
  });
  refresh();
  return { ok: true };
}

export async function sendClientBookingLink(contactId: string): Promise<ActionState> {
  await requireCoach();
  const contact = await activeClient(contactId);
  if (!contact) return { error: NOT_ACTIVE };
  if (!contact.email) return { error: "Ajoutez d’abord une adresse e-mail à la fiche." };
  const link =
    (await currentToken(db, "client_booking", { contactId: contact.id })) ??
    (await issueToken(db, { purpose: "client_booking", contactId: contact.id }));
  const { sessionMinutes } = await getBookingSettings();
  const mail = clientBookingLink({ firstName: contact.firstName, url: clientBookingUrl(link.token), sessionMinutes });
  const result = await sendEmail({ ...mail, to: contact.email, contactId: contact.id, templateKey: "client_booking_link" });
  refresh();
  return result.ok ? { ok: true, message: `Lien envoyé à ${contact.email}.` } : { error: "L’envoi a échoué (voir Paramètres › E-mails)." };
}

// ------------------------------------------------------------------ public /reserver/seance/<token>

export type ClientBookingState = { error?: string };

export async function bookClientSession(token: string, _prev: ClientBookingState, formData: FormData): Promise<ClientBookingState> {
  if (rateLimited(`client-booking:${await clientIp()}`, 5, 10 * 60_000)) {
    return { error: "Trop de réservations en peu de temps. Merci de réessayer un peu plus tard." };
  }
  const booking = await resolveClientBooking(token);
  if (!booking?.active) return { error: "Ce lien n’est plus actif. Écrivez-moi pour convenir d’un rendez-vous." };
  const { contact, client } = booking;

  const parsed = z
    .object({ slot: z.iso.datetime("Choisissez un horaire."), message: z.string().trim().max(1000).optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const startsAt = new Date(parsed.data.slot);
  const message = parsed.data.message || null;

  const { sessionMinutes } = await getBookingSettings();
  const { config, days } = await getAvailability(new Date(), { durationMin: sessionMinutes });
  if (!days.some((d) => d.slots.includes(startsAt.toISOString()))) {
    return { error: "Ce créneau vient d’être pris ou n’est plus disponible. Merci d’en choisir un autre." };
  }

  const sessionId = await db.transaction(async (tx) => {
    const free = await lockAndCheckSlot(tx, { startsAt, durationMin: sessionMinutes, bufferMinutes: config.bufferMinutes });
    if (!free) return null;
    const [row] = await tx
      .insert(coachingSessions)
      .values({
        contactId: contact.id,
        clientId: client.id,
        startsAt,
        durationMin: sessionMinutes,
        type: "Séance individuelle",
        status: "planned",
        location: config.location,
        bookedVia: "online",
        agenda: ["Réservée en ligne par le client.", message && `Son message : ${message}`].filter(Boolean).join("\n"),
      })
      .returning({ id: coachingSessions.id });
    return row.id;
  });
  if (!sessionId) return { error: "Ce créneau vient d’être pris. Merci d’en choisir un autre." };

  await db.insert(activityLog).values({ entity: "contact", entityId: contact.id, action: "session_booked_online" });
  await db.update(accessTokens).set({ lastUsedAt: new Date() }).where(eq(accessTokens.id, booking.token.id));
  const manage = await manageToken(db, sessionId, startsAt);

  after(async () => {
    if (contact.email) {
      const mail = clientSessionConfirmation({
        sessionId,
        firstName: contact.firstName,
        startsAt,
        durationMin: sessionMinutes,
        location: config.location,
        manageUrl: `${appUrl()}/rdv/${manage}`,
        cancellationHours: config.cancellationHours,
      });
      await sendEmail({ ...mail, to: contact.email, contactId: contact.id, templateKey: "client_session_confirmation" });
    }
    const coach = await coachNotificationAddress();
    if (coach) {
      const notice = coachNewClientBooking({
        contactId: contact.id,
        name: `${contact.firstName} ${contact.lastName}`.trim(),
        startsAt,
        durationMin: sessionMinutes,
        message,
      });
      await sendEmail({ ...notice, to: coach, contactId: contact.id, templateKey: "coach_new_client_booking", replyTo: contact.email });
    }
  });

  redirect(`/rdv/${manage}?nouveau=1`);
}
