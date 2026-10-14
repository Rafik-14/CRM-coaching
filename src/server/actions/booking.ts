"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { activityLog, coachingSessions, settings, tasks } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { advanceProspectAfterEchange } from "@/server/pipeline-automation";
import { clientIp, rateLimited } from "@/server/rate-limit";
import { findOrCreateSiteContact } from "@/server/site-leads";
import { BOOKING_SETTINGS_KEY, bookingToken, getAvailability, getBusyIntervals } from "@/server/booking";
import { bookingSettingsSchema } from "@/lib/booking";
import { bookingFormSchema, formValues, type SiteFormState } from "@/lib/validations/site";
import { DISCOVERY_TYPE } from "@/lib/validations/coaching";
import { formatDayTime } from "@/lib/format";
import { sendEmail } from "@/server/email/send";
import { bookingConfirmation, coachNewBooking, coachNotificationAddress } from "@/server/email/messages";
import type { ActionState } from "./coaching";

/** Any number; only used to serialise bookings so two visitors never get the same slot. */
const BOOKING_LOCK = 20_260_314;

/**
 * Public booking of the « Échange stratégique » (/reserver). The slot is re-checked on the server:
 * it must still be in the computed availability, and nothing may have been booked on it meanwhile.
 */
export async function bookEchange(_prev: SiteFormState, formData: FormData): Promise<SiteFormState> {
  const values = formValues(formData);
  if (rateLimited(`booking:${await clientIp()}`, 5, 10 * 60_000)) {
    return { error: "Trop de réservations en peu de temps. Merci de réessayer un peu plus tard.", values };
  }
  const parsed = bookingFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const v = parsed.data;
  if (v.website) return { error: "Ce créneau n’est plus disponible.", values };

  const { config, days } = await getAvailability();
  const startsAt = new Date(v.slot);
  if (!days.some((d) => d.slots.includes(startsAt.toISOString()))) {
    return { error: "Ce créneau vient d’être pris ou n’est plus disponible. Merci d’en choisir un autre.", values };
  }

  const extra = [v.stake && `Enjeu : ${v.stake}.`, v.message && `Sa situation : ${v.message}`]
    .filter(Boolean)
    .join("\n");

  const { contactId } = await findOrCreateSiteContact(
    {
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      phone: v.phone,
      segment: v.segment,
      subSegment: v.segment === "particulier" ? v.subSegment : null,
      stake: v.stake,
      cta: v.source ? `Réservation (${v.source})` : "Réservation",
    },
    [`Échange stratégique réservé en ligne pour le ${formatDayTime(startsAt)}.`, extra].filter(Boolean).join("\n"),
  );

  const end = new Date(startsAt.getTime() + config.slotMinutes * 60_000);
  const buffer = config.bufferMinutes * 60_000;
  const sessionId = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${BOOKING_LOCK})`);
    const busy = await getBusyIntervals(startsAt, end, tx);
    const taken = busy.some((b) => startsAt.getTime() < b.end.getTime() + buffer && end.getTime() > b.start.getTime() - buffer);
    if (taken) return null;
    const [session] = await tx
      .insert(coachingSessions)
      .values({
        contactId,
        startsAt,
        durationMin: config.slotMinutes,
        type: DISCOVERY_TYPE,
        status: "planned",
        location: config.location,
        agenda: ["Réservé en ligne depuis le site.", extra].filter(Boolean).join("\n"),
      })
      .returning({ id: coachingSessions.id });
    return session.id;
  });
  if (!sessionId) {
    return { error: "Ce créneau vient d’être pris. Merci d’en choisir un autre.", values };
  }

  await advanceProspectAfterEchange(contactId, null, "scheduled");
  await db.insert(tasks).values({
    title: `Préparer l’échange stratégique avec ${v.firstName} (réservé en ligne)`,
    dueAt: startsAt,
    contactId,
  });
  await db.insert(activityLog).values({ entity: "contact", entityId: contactId, action: "echange_booked_online" });

  // E-mails after the response: the visitor never waits for the mail server.
  const token = bookingToken(sessionId);
  after(async () => {
    const confirmation = bookingConfirmation({
      sessionId,
      firstName: v.firstName,
      startsAt,
      durationMin: config.slotMinutes,
      location: config.location,
      token,
    });
    await sendEmail({ ...confirmation, to: v.email, contactId, templateKey: "booking_confirmation" });
    const coach = await coachNotificationAddress();
    if (coach) {
      const notice = coachNewBooking({
        contactId,
        name: `${v.firstName} ${v.lastName}`.trim(),
        email: v.email,
        phone: v.phone,
        segment: v.segment,
        stake: v.stake,
        message: v.message,
        startsAt,
        durationMin: config.slotMinutes,
        source: v.source ?? null,
      });
      await sendEmail({ ...notice, to: coach, contactId, templateKey: "coach_new_booking", replyTo: v.email });
    }
  });

  redirect(`/reserver/confirmation?r=${token}`);
}

// ------------------------------------------------------------------ CRM › Paramètres

export async function saveBookingSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const parsed = bookingSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  }
  await db
    .insert(settings)
    .values({ key: BOOKING_SETTINGS_KEY, value: parsed.data })
    .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value` } });
  refresh();
  return { ok: true };
}
