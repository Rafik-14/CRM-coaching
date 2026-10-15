"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { activityLog, coachingSessions, tasks } from "@/server/db/schema";
import { extendManageTokens } from "@/server/access-tokens";
import { getAvailability, lockAndCheckSlot } from "@/server/booking";
import { getManagedBooking } from "@/server/manage-booking";
import { clientIp, rateLimited } from "@/server/rate-limit";
import { appUrl } from "@/server/email/config";
import { sendEmail } from "@/server/email/send";
import { bookingCancelled, bookingMoved, coachBookingChanged, coachNotificationAddress } from "@/server/email/messages";

/** Public actions of /rdv/<token>: the token is the only key, re-checked on every call. */
export type ManageState = { error?: string; done?: "moved" | "cancelled" };

const TOO_LATE = "Le délai pour modifier ce rendez-vous en ligne est passé. Répondez à l’e-mail reçu pour me prévenir.";

async function guard(token: string) {
  if (rateLimited(`manage:${await clientIp()}`, 10, 10 * 60_000)) {
    return { error: "Trop de tentatives en peu de temps. Merci de réessayer un peu plus tard." } as const;
  }
  const booking = await getManagedBooking(token);
  if (!booking) return { error: "Ce lien n’est plus valide." } as const;
  if (!booking.canChange) return { error: TOO_LATE } as const;
  return { booking } as const;
}

export async function moveBooking(token: string, _prev: ManageState, formData: FormData): Promise<ManageState> {
  const g = await guard(token);
  if ("error" in g) return { error: g.error };
  const { session, config } = g.booking;

  const parsed = z.iso.datetime().safeParse(formData.get("slot"));
  if (!parsed.success) return { error: "Choisissez un nouvel horaire." };
  const startsAt = new Date(parsed.data);
  const { days } = await getAvailability(new Date(), { durationMin: session.durationMin, excludeSessionId: session.id });
  if (!days.some((d) => d.slots.includes(startsAt.toISOString()))) {
    return { error: "Ce créneau vient d’être pris ou n’est plus disponible. Merci d’en choisir un autre." };
  }

  const moved = await db.transaction(async (tx) => {
    const free = await lockAndCheckSlot(tx, {
      startsAt,
      durationMin: session.durationMin,
      bufferMinutes: config.bufferMinutes,
      excludeSessionId: session.id,
    });
    if (!free) return false;
    const rows = await tx
      .update(coachingSessions)
      // New date → new reminders.
      .set({ startsAt, reminder24hSentAt: null, reminder1hSentAt: null })
      .where(and(eq(coachingSessions.id, session.id), eq(coachingSessions.status, "planned")))
      .returning({ id: coachingSessions.id });
    return rows.length === 1;
  });
  if (!moved) return { error: "Ce créneau vient d’être pris. Merci d’en choisir un autre." };

  await extendManageTokens(db, session.id, startsAt);
  await db.insert(activityLog).values({ entity: "contact", entityId: session.contactId, action: "booking_moved_online" });

  after(async () => {
    const name = `${session.contact.firstName} ${session.contact.lastName}`.trim();
    if (session.contact.email) {
      const mail = bookingMoved({
        sessionId: session.id,
        firstName: session.contact.firstName,
        type: session.type,
        startsAt,
        durationMin: session.durationMin,
        location: session.location,
        manageUrl: `${appUrl()}/rdv/${token}`,
      });
      await sendEmail({ ...mail, to: session.contact.email, contactId: session.contactId, templateKey: "booking_moved" });
    }
    const coach = await coachNotificationAddress();
    if (coach) {
      const notice = coachBookingChanged({
        contactId: session.contactId,
        name,
        type: session.type,
        change: "moved",
        oldStartsAt: session.startsAt,
        newStartsAt: startsAt,
      });
      await sendEmail({ ...notice, to: coach, contactId: session.contactId, templateKey: "coach_booking_moved" });
    }
  });
  refresh();
  return { done: "moved" };
}

export async function cancelBooking(token: string, _prev: ManageState, formData: FormData): Promise<ManageState> {
  const g = await guard(token);
  if ("error" in g) return { error: g.error };
  const { session } = g.booking;
  const reason = z.string().trim().max(500).catch("").parse(formData.get("reason") ?? "") || null;

  const rows = await db
    .update(coachingSessions)
    .set({ status: "cancelled" })
    .where(and(eq(coachingSessions.id, session.id), eq(coachingSessions.status, "planned")))
    .returning({ id: coachingSessions.id });
  if (!rows.length) return { error: "Ce rendez-vous est déjà annulé." };

  const name = `${session.contact.firstName} ${session.contact.lastName}`.trim();
  await db.insert(activityLog).values({ entity: "contact", entityId: session.contactId, action: "booking_cancelled_online" });
  await db.insert(tasks).values({
    title: `Recontacter ${name} : rendez-vous annulé en ligne`,
    dueAt: new Date(),
    contactId: session.contactId,
  });

  after(async () => {
    if (session.contact.email) {
      const mail = bookingCancelled({ firstName: session.contact.firstName, type: session.type, startsAt: session.startsAt });
      await sendEmail({ ...mail, to: session.contact.email, contactId: session.contactId, templateKey: "booking_cancelled" });
    }
    const coach = await coachNotificationAddress();
    if (coach) {
      const notice = coachBookingChanged({
        contactId: session.contactId,
        name,
        type: session.type,
        change: "cancelled",
        oldStartsAt: session.startsAt,
        reason,
      });
      await sendEmail({ ...notice, to: coach, contactId: session.contactId, templateKey: "coach_booking_cancelled" });
    }
  });
  refresh();
  return { done: "cancelled" };
}
