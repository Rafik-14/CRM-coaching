import "server-only";
import { and, asc, desc, eq, gt, inArray, lte, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { eventPhotos, eventQuotes, eventRegistrations, events } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { seatsTakenByEvent } from "@/server/events";
import { findToken } from "@/server/access-tokens";
import { freeSeats } from "@/lib/events";

/** Conferences & workshops: lists for the CRM and the public pages (docs/EVENTS-PLAN.md). */

async function withCounts<T extends { id: string }>(rows: T[]) {
  const counts = await seatsTakenByEvent(db, rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, taken: counts.get(r.id)?.confirmed ?? 0, waiting: counts.get(r.id)?.waitlist ?? 0 }));
}

async function coverIds(eventIds: string[]) {
  if (!eventIds.length) return new Map<string, string>();
  const covers = await db
    .select({ id: eventPhotos.id, eventId: eventPhotos.eventId })
    .from(eventPhotos)
    .where(and(inArray(eventPhotos.eventId, eventIds), eq(eventPhotos.kind, "cover")));
  return new Map(covers.map((c) => [c.eventId, c.id]));
}

// ------------------------------------------------------------------ CRM

/** CRM list: upcoming (soonest first), then past (latest first). Drafts and cancelled ones included. */
export async function listCoachEvents(now = new Date()) {
  await requireCoach();
  const [upcoming, past] = await Promise.all([
    db.select().from(events).where(gt(events.endsAt, now)).orderBy(asc(events.startsAt)),
    db.select().from(events).where(lte(events.endsAt, now)).orderBy(desc(events.startsAt)),
  ]);
  return { upcoming: await withCounts(upcoming), past: await withCounts(past) };
}

export async function getCoachEvent(id: string) {
  await requireCoach();
  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
    with: {
      registrations: { orderBy: [asc(eventRegistrations.createdAt)] },
      photos: { orderBy: [asc(eventPhotos.position), asc(eventPhotos.createdAt)] },
      quotes: { orderBy: [asc(eventQuotes.position), asc(eventQuotes.createdAt)] },
    },
  });
  if (!event) return null;
  const active = event.registrations.filter((r) => r.status !== "cancelled");
  const confirmed = active.filter((r) => r.status === "confirmed");
  return {
    ...event,
    taken: confirmed.reduce((n, r) => n + r.seats, 0),
    waiting: active.filter((r) => r.status === "waitlist").reduce((n, r) => n + r.seats, 0),
    present: confirmed.filter((r) => r.attended).reduce((n, r) => n + r.seats, 0),
  };
}
export type CoachEvent = NonNullable<Awaited<ReturnType<typeof getCoachEvent>>>;

/** Events of one contact (contact page). */
export async function getContactEvents(contactId: string) {
  return db
    .select({ registration: eventRegistrations, event: { id: events.id, title: events.title, startsAt: events.startsAt, kind: events.kind } })
    .from(eventRegistrations)
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .where(eq(eventRegistrations.contactId, contactId))
    .orderBy(desc(events.startsAt));
}

// ------------------------------------------------------------------ public website

const PUBLIC = ["published", "cancelled"] as const;

/** /evenements: upcoming published events, then the history (latest first). */
export async function listPublicEvents(now = new Date()) {
  const [upcomingRows, pastRows] = await Promise.all([
    db
      .select()
      .from(events)
      .where(and(eq(events.status, "published"), gt(events.endsAt, now)))
      .orderBy(asc(events.startsAt)),
    db
      .select()
      .from(events)
      .where(and(eq(events.status, "published"), lte(events.endsAt, now)))
      .orderBy(desc(events.startsAt)),
  ]);
  const upcoming = await withCounts(upcomingRows);
  const covers = await coverIds([...upcomingRows, ...pastRows].map((e) => e.id));
  return {
    upcoming: upcoming.map((e) => ({ ...e, free: freeSeats(e.capacity, e.taken), coverId: covers.get(e.id) ?? null })),
    past: pastRows.map((e) => ({ ...e, coverId: covers.get(e.id) ?? null })),
  };
}

/** One public event page. Cancelled events stay reachable (people may follow an old link). */
export async function getPublicEvent(slug: string) {
  const event = await db.query.events.findFirst({
    where: and(eq(events.slug, slug), inArray(events.status, [...PUBLIC])),
    with: {
      photos: { orderBy: [asc(eventPhotos.position), asc(eventPhotos.createdAt)] },
      quotes: { orderBy: [asc(eventQuotes.position), asc(eventQuotes.createdAt)] },
    },
  });
  if (!event) return null;
  const [counts] = await withCounts([event]);
  const cover = event.photos.find((p) => p.kind === "cover") ?? null;
  return {
    ...event,
    taken: counts.taken,
    free: freeSeats(event.capacity, counts.taken),
    coverId: cover?.id ?? null,
    // The gallery and quotes are only public once Jérémy ticks « afficher sur le site ».
    gallery: event.showRecap ? event.photos.filter((p) => p.kind === "gallery") : [],
    quotes: event.showRecap ? event.quotes : [],
  };
}
export type PublicEvent = NonNullable<Awaited<ReturnType<typeof getPublicEvent>>>;

/** Next published events for the home page block. */
export async function nextPublicEvents(now = new Date(), limit = 2) {
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.status, "published"), gt(events.startsAt, now), eq(events.manualHistory, false)))
    .orderBy(asc(events.startsAt))
    .limit(limit);
  const withSeats = await withCounts(rows);
  return withSeats.map((e) => ({ ...e, free: freeSeats(e.capacity, e.taken) }));
}

/** /inscription/<token>: the booking behind a private link. */
export async function getRegistrationByToken(token: string) {
  const row = await findToken(db, "event_registration", token);
  if (!row?.registrationId) return null;
  const registration = await db.query.eventRegistrations.findFirst({
    where: eq(eventRegistrations.id, row.registrationId),
    with: { event: true },
  });
  return registration && registration.event.status !== "draft" ? registration : null;
}

/** Photo served by /api/evenements/photo/<id>: public when its event is public (gallery: once the recap is shown). */
export async function getPublicPhoto(id: string) {
  const photo = await db.query.eventPhotos.findFirst({ where: eq(eventPhotos.id, id), with: { event: true } });
  if (!photo || photo.event.status === "draft") return null;
  if (photo.kind === "gallery" && !photo.event.showRecap) return null;
  return photo;
}

/** Any photo, for the coach (CRM previews). */
export async function getAnyPhoto(id: string) {
  return db.query.eventPhotos.findFirst({ where: eq(eventPhotos.id, id) });
}

/** Events in a period (CRM calendar, booking slots): published, not cancelled. */
export async function eventsBetween(from: Date, to: Date) {
  return db
    .select({ id: events.id, title: events.title, kind: events.kind, startsAt: events.startsAt, endsAt: events.endsAt, location: events.location })
    .from(events)
    .where(and(eq(events.status, "published"), ne(events.manualHistory, true), lte(events.startsAt, to), gt(events.endsAt, from)))
    .orderBy(asc(events.startsAt));
}

/** Analyses › Événements: the last 12 months of events held, attendance, and what the events brought in. */
export async function getEventStats(now = new Date()) {
  await requireCoach();
  const since = new Date(now.getTime() - 365 * 86_400_000);
  const held = await db
    .select({ id: events.id, title: events.title, startsAt: events.startsAt })
    .from(events)
    .where(and(eq(events.status, "published"), eq(events.manualHistory, false), lte(events.endsAt, now), gt(events.startsAt, since)))
    .orderBy(desc(events.startsAt));
  const regs = held.length
    ? await db
        .select({ eventId: eventRegistrations.eventId, seats: eventRegistrations.seats, attended: eventRegistrations.attended })
        .from(eventRegistrations)
        .where(and(inArray(eventRegistrations.eventId, held.map((e) => e.id)), eq(eventRegistrations.status, "confirmed")))
    : [];
  const rows = held.map((e) => {
    const mine = regs.filter((r) => r.eventId === e.id);
    const registered = mine.reduce((n, r) => n + r.seats, 0);
    const present = mine.filter((r) => r.attended).reduce((n, r) => n + r.seats, 0);
    return { ...e, registered, present };
  });
  const fromEvents = await db.query.contacts.findMany({
    where: (c, { like }) => like(c.source, "Événement%"),
    columns: { id: true },
    with: { client: { columns: { id: true } } },
  });
  return {
    rows,
    registered: rows.reduce((n, r) => n + r.registered, 0),
    present: rows.reduce((n, r) => n + r.present, 0),
    contacts: fromEvents.length,
    clients: fromEvents.filter((c) => c.client).length,
  };
}
