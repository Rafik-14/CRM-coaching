import "server-only";
import { eq } from "drizzle-orm";
import { DISCOVERY_TYPE } from "@/lib/validations/coaching";
import { formatDate } from "@/lib/format";
import { getBookingSettings, lockAndCheckSlot } from "@/server/booking";
import { db } from "@/server/db";
import { activityLog, coachingSessions, revelateurCallbacks, revelateurParticipants, tasks } from "@/server/db/schema";
import { advanceProspectAfterEchange } from "@/server/pipeline-automation";
import { findOrCreateSiteContact } from "@/server/site-leads";
import { logEvent } from "./crm";
import { UserError } from "./session";

/**
 * Links between the test and the coaching CRM.
 * Decision (26 Nov): a callback request — an explicit request to be contacted — creates (or updates) the
 * CRM contact in the first Pipeline stage, with a « Rappeler » task. Taking the test alone still creates
 * nothing in the CRM (annexe 07 §1.2). No answer or result is copied into the contact.
 */
export async function contactForCallback(callbackId: string) {
  const cb = await db.query.revelateurCallbacks.findFirst({ where: eq(revelateurCallbacks.id, callbackId) });
  if (!cb) return null;
  if (cb.contactId) return cb.contactId;
  const p = await db.query.revelateurParticipants.findFirst({ where: eq(revelateurParticipants.id, cb.participantId) });
  if (!p) return null;
  const firstName = p.firstName || "Participant";
  const { contactId, created } = await findOrCreateSiteContact(
    { firstName, email: p.email, phone: cb.phone, source: "Le Révélateur · demande de rappel" },
    `Demande de rappel après le Test Signature JG® (${formatDate(cb.requestedAt)}).`,
  );
  await db.update(revelateurCallbacks).set({ contactId }).where(eq(revelateurCallbacks.id, cb.id));
  await db.insert(tasks).values({ title: `Rappeler ${firstName} (demande après Le Révélateur)`, dueAt: new Date(), contactId });
  await db.insert(activityLog).values({ entity: "contact", entityId: contactId, action: created ? "created_from_revelateur_callback" : "revelateur_callback_requested" });
  return contactId;
}

/**
 * From a callback request: Jérémy books the discovery call while on the phone. Creates the call in the
 * Agenda (same type and length as an online booking), moves the contact to « Échange stratégique
 * planifié », and closes the request as converted (APPOINTMENT_BOOKED).
 */
export async function scheduleCallFromCallback(callbackId: string, startsAt: Date, actorId: string) {
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now()) throw new UserError("Choisissez une date et une heure à venir.");
  const cb = await db.query.revelateurCallbacks.findFirst({ where: eq(revelateurCallbacks.id, callbackId) });
  if (!cb || !["pending", "in_progress"].includes(cb.status)) throw new UserError("Cette demande est déjà clôturée.");
  const contactId = (await contactForCallback(cb.id)) ?? null;
  if (!contactId) throw new UserError("Contact introuvable.");
  const config = await getBookingSettings();

  const appointmentId = await db.transaction(async (tx) => {
    const free = await lockAndCheckSlot(tx, { startsAt, durationMin: config.slotMinutes, bufferMinutes: config.bufferMinutes });
    if (!free) return null;
    const [s] = await tx
      .insert(coachingSessions)
      .values({
        contactId,
        startsAt,
        durationMin: config.slotMinutes,
        type: DISCOVERY_TYPE,
        status: "planned",
        bookedVia: "coach",
        location: config.location,
        agenda: "Planifié lors du rappel demandé après Le Révélateur.",
      })
      .returning({ id: coachingSessions.id });
    return s.id;
  });
  if (!appointmentId) throw new UserError("Ce créneau est déjà pris dans l’agenda.");

  await advanceProspectAfterEchange(contactId, actorId, "scheduled");
  const now = new Date();
  await db
    .update(revelateurCallbacks)
    .set({ status: "converted", appointmentId, closedAt: now, updatedAt: now })
    .where(eq(revelateurCallbacks.id, cb.id));
  await logEvent(db, { type: "APPOINTMENT_BOOKED", key: `APPOINTMENT_BOOKED:${appointmentId}`, sessionId: cb.sessionId, participantId: cb.participantId, at: now });
  await db.insert(activityLog).values({ actorId, entity: "contact", entityId: contactId, action: "echange_scheduled_from_revelateur" });
  return { appointmentId, contactId };
}
