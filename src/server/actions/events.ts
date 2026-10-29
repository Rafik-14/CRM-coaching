"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { and, eq, inArray, max, ne } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import { db } from "@/server/db";
import { accessTokens, activityLog, eventPhotos, eventQuotes, eventRegistrations, events } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { clientIp, rateLimited } from "@/server/rate-limit";
import { findOrCreateSiteContact } from "@/server/site-leads";
import { contentMatchesExtension, deleteStoredFile, saveFile } from "@/server/storage";
import { cancelRegistration, refillFromWaitlist, registerForEvent, seatsTaken, type EventRow, type RegistrationRow } from "@/server/events";
import { notifyCoachOfRegistration, registrationLink, sendEventChanged, sendEventMail, sendEventMessage } from "@/server/event-mail";
import { getRegistrationByToken } from "@/server/queries/events";
import {
  PHOTO_MAX_BYTES,
  PHOTO_MAX_SIDE,
  eventFormSchema,
  eventRegistrationSchema,
  eventSlug,
  eventTimes,
  manualRegistrationSchema,
  quoteFormSchema,
  recapFormSchema,
} from "@/lib/events";
import { formValues, type SiteFormState } from "@/lib/validations/site";
import type { ActionState } from "./coaching";

/** Conferences & workshops (docs/technical/plans/EVENTS-PLAN.md). CRM actions first, then the public ones. */

const uuid = z.uuid();
const fieldErrors = (error: z.ZodError) => ({ fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]> });

async function loadEvent(id: string) {
  const ev = await db.query.events.findFirst({ where: eq(events.id, uuid.parse(id)) });
  if (!ev) throw new Error("Événement introuvable");
  return ev;
}

/** Same title on the same day twice → « …-2 », « …-3 ». */
async function uniqueSlug(title: string, startsAt: Date, exceptId?: string) {
  const base = eventSlug(title, startsAt);
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const taken = await db.query.events.findFirst({
      where: exceptId ? and(eq(events.slug, slug), ne(events.id, exceptId)) : eq(events.slug, slug),
      columns: { id: true },
    });
    if (!taken) return slug;
  }
}

/** People moved up from the waiting list get their « une place s’est libérée » e-mail. */
function mailPromoted(ev: EventRow, promoted: RegistrationRow[]) {
  if (!promoted.length) return;
  after(async () => {
    for (const p of promoted) await sendEventMail("event_seat_available", ev, p);
  });
}

// ------------------------------------------------------------------ CRM › Événements

export async function createEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const parsed = eventFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { date, startTime, endTime, ...v } = parsed.data;
  const { startsAt, endsAt } = eventTimes({ date, startTime, endTime });
  const [ev] = await db
    .insert(events)
    .values({ ...v, startsAt, endsAt, slug: await uniqueSlug(v.title, startsAt) })
    .returning({ id: events.id });
  await db.insert(activityLog).values({ actorId: user.id, entity: "event", entityId: ev.id, action: "event_created" });
  redirect(`/mes-evenements/${ev.id}`);
}

export async function updateEvent(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const ev = await loadEvent(id);
  const parsed = eventFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { date, startTime, endTime, ...v } = parsed.data;
  const { startsAt, endsAt } = eventTimes({ date, startTime, endTime });
  // The public address only changes while nobody could have shared it.
  const slug = ev.status === "draft" ? await uniqueSlug(v.title, startsAt, ev.id) : ev.slug;
  const [updated] = await db.update(events).set({ ...v, startsAt, endsAt, slug }).where(eq(events.id, ev.id)).returning();

  // Date, time or place changed: private links follow the new date, the reminder is sent again for the
  // new day, and everyone registered (or waiting) is told — unless the event is still a draft or already past.
  const timeChanged = ev.startsAt.getTime() !== startsAt.getTime() || ev.endsAt.getTime() !== endsAt.getTime();
  const placeChanged = (ev.location ?? null) !== v.location || (ev.onlineUrl ?? null) !== v.onlineUrl;
  let notified = 0;
  if (timeChanged || placeChanged) {
    const regs = await db
      .select()
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, ev.id), inArray(eventRegistrations.status, ["confirmed", "waitlist"])));
    if (timeChanged && regs.length) {
      const ids = regs.map((r) => r.id);
      await db.update(eventRegistrations).set({ reminderSentAt: null }).where(inArray(eventRegistrations.id, ids));
      await db
        .update(accessTokens)
        .set({ expiresAt: new Date(endsAt.getTime() + 30 * 86_400_000) })
        .where(and(inArray(accessTokens.registrationId, ids), eq(accessTokens.purpose, "event_registration")));
    }
    if (updated.status === "published" && startsAt > new Date() && regs.length) {
      notified = regs.length;
      after(async () => {
        for (const r of regs) await sendEventChanged(updated, r);
      });
    }
  }

  // More seats, or the waiting list switched on: people waiting get their seat right away.
  const promoted = await refillFromWaitlist(db, ev.id);
  mailPromoted(updated, promoted);
  refresh();
  const parts = ["Événement enregistré."];
  if (notified) parts.push(`${notified} personne${notified > 1 ? "s" : ""} prévenue${notified > 1 ? "s" : ""} du changement.`);
  if (promoted.length) parts.push(`${promoted.length} personne${promoted.length > 1 ? "s" : ""} de la liste d’attente ${promoted.length > 1 ? "ont" : "a"} obtenu une place.`);
  return { ok: true, message: parts.join(" ") };
}

/** Publish (visible on the site) or back to draft. */
export async function setEventPublished(id: string, published: boolean): Promise<ActionState> {
  const user = await requireCoach();
  const ev = await loadEvent(id);
  if (ev.status === "cancelled") return { error: "Cet événement est annulé." };
  await db.update(events).set({ status: published ? "published" : "draft" }).where(eq(events.id, ev.id));
  await db.insert(activityLog).values({ actorId: user.id, entity: "event", entityId: ev.id, action: published ? "event_published" : "event_unpublished" });
  refresh();
  return { ok: true, message: published ? "Publié : l’événement est visible sur le site." : "Repassé en brouillon : il n’est plus visible sur le site." };
}

/** Cancels the event and tells everyone registered (or waiting). */
export async function cancelEvent(id: string): Promise<ActionState> {
  const user = await requireCoach();
  const ev = await loadEvent(id);
  if (ev.status === "cancelled") return { ok: true };
  const [cancelled] = await db.update(events).set({ status: "cancelled", registrationOpen: false }).where(eq(events.id, ev.id)).returning();
  const people = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, ev.id), inArray(eventRegistrations.status, ["confirmed", "waitlist"])));
  await db.insert(activityLog).values({ actorId: user.id, entity: "event", entityId: ev.id, action: "event_cancelled" });
  if (cancelled.startsAt > new Date()) {
    after(async () => {
      for (const p of people) await sendEventMail("event_cancelled", cancelled, p);
    });
  }
  refresh();
  return { ok: true, message: people.length ? `Événement annulé. ${people.length} personne${people.length > 1 ? "s" : ""} prévenue${people.length > 1 ? "s" : ""} par e-mail.` : "Événement annulé." };
}

/** Deleting is only for mistakes: an event with registrations is cancelled instead. */
export async function deleteEvent(id: string): Promise<ActionState> {
  await requireCoach();
  const ev = await loadEvent(id);
  const regs = await db.query.eventRegistrations.findFirst({ where: eq(eventRegistrations.eventId, ev.id), columns: { id: true } });
  if (regs) return { error: "Des personnes sont inscrites : annulez l’événement plutôt que de le supprimer." };
  const photos = await db.select({ path: eventPhotos.storagePath }).from(eventPhotos).where(eq(eventPhotos.eventId, ev.id));
  await db.delete(events).where(eq(events.id, ev.id));
  for (const p of photos) await deleteStoredFile(p.path);
  redirect("/mes-evenements");
}

/** Someone who called or wrote: added to the list by the coach (may go beyond the capacity). */
export async function addManualRegistration(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const ev = await loadEvent(eventId);
  const parsed = manualRegistrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  const { contactId } = await findOrCreateSiteContact({ ...v, source: `Événement · ${ev.title}` });
  const r = await registerForEvent(db, { ...v, eventId: ev.id, contactId, source: "manual" });
  if (!r.ok) return { error: "Impossible d’ajouter cette personne : l’événement est annulé." };
  await db.insert(activityLog).values({ actorId: user.id, entity: "contact", entityId: contactId, action: "event_registered" });
  const send = formData.get("sendConfirmation") === "on";
  if (send && ev.status === "published") after(() => sendEventMail("event_confirmation", ev, r.registration).then(() => undefined));
  refresh();
  return { ok: true, message: r.updated ? "Inscription mise à jour." : `${v.firstName} est inscrit${send ? " et a reçu la confirmation" : ""}.` };
}

export async function coachCancelRegistration(registrationId: string): Promise<ActionState> {
  const user = await requireCoach();
  const { cancelled, promoted } = await cancelRegistration(db, uuid.parse(registrationId));
  if (!cancelled) return { ok: true };
  if (cancelled.contactId) await db.insert(activityLog).values({ actorId: user.id, entity: "contact", entityId: cancelled.contactId, action: "event_registration_cancelled" });
  const ev = await loadEvent(cancelled.eventId);
  mailPromoted(ev, promoted);
  refresh();
  return { ok: true, message: promoted.length ? `Inscription annulée. ${promoted.map((p) => p.firstName).join(", ")} passe de la liste d’attente aux inscrits.` : "Inscription annulée." };
}

/** « Présent » on the day: used for the thank-you e-mail and the attendance rate. */
export async function setAttendance(registrationId: string, attended: boolean): Promise<ActionState> {
  const user = await requireCoach();
  const current = await db.query.eventRegistrations.findFirst({ where: eq(eventRegistrations.id, uuid.parse(registrationId)), with: { event: true } });
  if (!current) return { error: "Inscription introuvable." };
  if (current.event.startsAt > new Date()) return { error: "La présence se note à partir du début de l’événement." };
  const [reg] = await db
    .update(eventRegistrations)
    .set({ attended })
    .where(and(eq(eventRegistrations.id, current.id), eq(eventRegistrations.status, "confirmed")))
    .returning();
  if (reg?.contactId && attended) {
    await db.insert(activityLog).values({ actorId: user.id, entity: "contact", entityId: reg.contactId, action: "event_attended" });
  }
  refresh();
  return { ok: true };
}

export async function messageAttendees(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const ev = await loadEvent(eventId);
  const parsed = z
    .object({
      subject: z.string().trim().min(1, "L’objet est vide.").max(160),
      body: z.string().trim().min(1, "Le message est vide.").max(5000),
      who: z.enum(["confirmed", "all"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { subject, body, who } = parsed.data;
  const people = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, ev.id), inArray(eventRegistrations.status, who === "all" ? ["confirmed", "waitlist"] : ["confirmed"])));
  if (!people.length) return { error: "Personne à prévenir pour le moment." };
  after(async () => {
    for (const p of people) await sendEventMessage(ev, p, subject, body);
  });
  return { ok: true, message: `Message envoyé à ${people.length} personne${people.length > 1 ? "s" : ""}.` };
}

// ------------------------------------------------------------------ CRM › compte rendu (history)

export async function saveRecap(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const ev = await loadEvent(eventId);
  const parsed = recapFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  await db.update(events).set(parsed.data).where(eq(events.id, ev.id));
  refresh();
  return { ok: true, message: parsed.data.showRecap ? "Compte rendu enregistré et visible sur le site." : "Compte rendu enregistré (non visible sur le site)." };
}

const PHOTO_TYPES = ["jpg", "jpeg", "png", "webp"];

/** Cover picture (one) or gallery photos (several at once). Resized and saved as WebP. */
export async function uploadEventPhotos(eventId: string, kind: "cover" | "gallery", _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  if (process.env.DOCUMENTS_DISABLED === "true") {
    return { error: "L’envoi de photos est désactivé sur cette version de démonstration." };
  }
  const ev = await loadEvent(eventId);
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Choisissez au moins une photo." };
  if (kind === "cover" && files.length > 1) return { error: "Une seule photo de couverture." };
  if (files.length > 30) return { error: "30 photos maximum à la fois." };

  const prepared: { data: Buffer; width: number; height: number }[] = [];
  for (const file of files) {
    if (file.size > PHOTO_MAX_BYTES) return { error: `« ${file.name} » est trop lourde (15 Mo maximum).` };
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const raw = Buffer.from(await file.arrayBuffer());
    if (!PHOTO_TYPES.includes(ext) || !contentMatchesExtension(raw, ext)) return { error: `« ${file.name} » n’est pas une photo JPG, PNG ou WebP.` };
    const { data, info } = await sharp(raw)
      .rotate()
      .resize({ width: PHOTO_MAX_SIDE, height: PHOTO_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    prepared.push({ data, width: info.width, height: info.height });
  }

  if (kind === "cover") {
    const old = await db.select().from(eventPhotos).where(and(eq(eventPhotos.eventId, ev.id), eq(eventPhotos.kind, "cover")));
    await db.delete(eventPhotos).where(and(eq(eventPhotos.eventId, ev.id), eq(eventPhotos.kind, "cover")));
    for (const p of old) await deleteStoredFile(p.storagePath);
  }
  const [{ last }] = await db.select({ last: max(eventPhotos.position) }).from(eventPhotos).where(eq(eventPhotos.eventId, ev.id));
  let position = (last ?? 0) + 1;
  for (const p of prepared) {
    const storagePath = `event-${crypto.randomUUID()}.webp`;
    await saveFile(storagePath, p.data);
    await db.insert(eventPhotos).values({ eventId: ev.id, kind, storagePath, width: p.width, height: p.height, position: position++ });
  }
  refresh();
  return { ok: true, message: kind === "cover" ? "Photo de couverture enregistrée." : `${prepared.length} photo${prepared.length > 1 ? "s" : ""} ajoutée${prepared.length > 1 ? "s" : ""}.` };
}

export async function deleteEventPhoto(photoId: string): Promise<ActionState> {
  await requireCoach();
  const [photo] = await db.delete(eventPhotos).where(eq(eventPhotos.id, uuid.parse(photoId))).returning();
  if (photo) await deleteStoredFile(photo.storagePath);
  refresh();
  return { ok: true };
}

export async function addQuote(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const ev = await loadEvent(eventId);
  const parsed = quoteFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const [{ last }] = await db.select({ last: max(eventQuotes.position) }).from(eventQuotes).where(eq(eventQuotes.eventId, ev.id));
  await db.insert(eventQuotes).values({ ...parsed.data, eventId: ev.id, position: (last ?? 0) + 1 });
  refresh();
  return { ok: true, message: "Témoignage ajouté." };
}

export async function deleteQuote(quoteId: string): Promise<ActionState> {
  await requireCoach();
  await db.delete(eventQuotes).where(eq(eventQuotes.id, uuid.parse(quoteId)));
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ public website

/** /evenements/<slug> › « Réserver ma place ». No account: honeypot + rate limit, like the other site forms. */
export async function registerForEventPublic(eventId: string, _prev: SiteFormState, formData: FormData): Promise<SiteFormState> {
  const values = formValues(formData);
  if (rateLimited(`event:${await clientIp()}`, 6, 10 * 60_000)) {
    return { error: "Trop d’inscriptions en peu de temps. Merci de réessayer un peu plus tard.", values };
  }
  const parsed = eventRegistrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const v = parsed.data;
  if (v.website) return { error: "Les inscriptions sont fermées pour cet événement.", values };

  const ev = await db.query.events.findFirst({ where: eq(events.id, uuid.parse(eventId)) });
  if (!ev) return { error: "Cet événement n’existe plus.", values };

  // The seat first: a refused registration (closed, full…) must not create or change a contact.
  const r = await registerForEvent(db, { ...v, eventId: ev.id, contactId: null, source: "site" });
  if (!r.ok) {
    const messages = {
      not_found: "Cet événement n’est plus disponible.",
      closed: "Les inscriptions sont fermées pour cet événement.",
      too_many: `${ev.maxSeatsPerBooking} places maximum par inscription.`,
      full: "Il n’y a plus assez de places pour cette demande.",
    } as const;
    return { error: messages[r.reason], values };
  }
  if (r.duplicate) {
    // Already registered with this e-mail: never show the private page here (whoever typed the address may not
    // be its owner). The link goes again to the address on file, and the visitor gets a neutral answer.
    after(() => sendEventMail(r.status === "confirmed" ? "event_confirmation" : "event_waitlist", ev, r.registration).then(() => undefined));
    return { ok: true };
  }

  const { contactId, created } = await findOrCreateSiteContact(
    { firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone, source: `Événement · ${ev.title}` },
    v.company ? `Structure indiquée à l’inscription : ${v.company}` : null,
  );
  await db.update(eventRegistrations).set({ contactId }).where(eq(eventRegistrations.id, r.registration.id));
  r.registration.contactId = contactId;

  await db.insert(activityLog).values({ entity: "contact", entityId: contactId, action: created ? "created_from_event" : "event_registered_online" });
  if (created) await db.insert(activityLog).values({ entity: "contact", entityId: contactId, action: "event_registered_online" });
  const link = await registrationLink(r.registration.id, ev);
  const confirmed = await seatsTaken(db, ev.id);
  after(async () => {
    await sendEventMail(r.status === "confirmed" ? "event_confirmation" : "event_waitlist", ev, r.registration);
    await notifyCoachOfRegistration(ev, r.registration, { confirmed, capacity: ev.capacity });
  });
  redirect(`${new URL(link).pathname}?nouveau=1`);
}

/** /inscription/<token> › « Annuler mon inscription ». */
export async function cancelMyRegistration(token: string): Promise<{ ok?: boolean; error?: string }> {
  if (rateLimited(`event-cancel:${await clientIp()}`, 10, 10 * 60_000)) return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  const reg = await getRegistrationByToken(token);
  if (!reg) return { error: "Ce lien n’est plus valable." };
  if (reg.status === "cancelled") return { ok: true };
  if (reg.event.startsAt <= new Date()) return { error: "L’événement a déjà commencé." };
  const { cancelled, promoted } = await cancelRegistration(db, reg.id);
  if (cancelled?.contactId) await db.insert(activityLog).values({ entity: "contact", entityId: cancelled.contactId, action: "event_cancelled_online" });
  mailPromoted(reg.event, promoted);
  refresh();
  return { ok: true };
}

