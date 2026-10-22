import { and, asc, eq, gt, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { eventRegistrations, events } from "@/server/db/schema";
import type { AnyDb } from "@/server/db/types";
import { canRegister, freeSeats } from "@/lib/events";

/**
 * Seats for conferences & workshops (docs/EVENTS-PLAN.md §4–5).
 * Every change to the seats of one event locks that event's row first (SELECT … FOR UPDATE), so two people
 * can never take the last seat at the same time, and the waiting list moves up in order.
 * No "server-only" import: the tests run it against PGlite; only server code imports it.
 */
export type EventRow = typeof events.$inferSelect;
export type RegistrationRow = typeof eventRegistrations.$inferSelect;
type Tx = Parameters<Parameters<AnyDb["transaction"]>[0]>[0];

const ACTIVE = ["confirmed", "waitlist"] as const;

/** Seats taken by confirmed registrations (optionally ignoring one registration). */
export async function seatsTaken(db: AnyDb | Tx, eventId: string, exceptId?: string) {
  const [row] = await db
    .select({ n: sql<number>`coalesce(sum(${eventRegistrations.seats}), 0)::int` })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.status, "confirmed"),
        exceptId ? ne(eventRegistrations.id, exceptId) : undefined,
      ),
    );
  return row?.n ?? 0;
}

/** Seats taken for several events at once (lists). */
export async function seatsTakenByEvent(db: AnyDb, eventIds: string[]) {
  if (!eventIds.length) return new Map<string, { confirmed: number; waitlist: number }>();
  const rows = await db
    .select({
      eventId: eventRegistrations.eventId,
      status: eventRegistrations.status,
      n: sql<number>`coalesce(sum(${eventRegistrations.seats}), 0)::int`,
    })
    .from(eventRegistrations)
    .where(and(inArray(eventRegistrations.eventId, eventIds), inArray(eventRegistrations.status, [...ACTIVE])))
    .groupBy(eventRegistrations.eventId, eventRegistrations.status);
  const map = new Map<string, { confirmed: number; waitlist: number }>();
  for (const r of rows) {
    const cur = map.get(r.eventId) ?? { confirmed: 0, waitlist: 0 };
    if (r.status === "confirmed") cur.confirmed = r.n;
    else cur.waitlist = r.n;
    map.set(r.eventId, cur);
  }
  return map;
}

async function lockEvent(tx: Tx, eventId: string) {
  const [ev] = await tx.select().from(events).where(eq(events.id, eventId)).for("update");
  return ev ?? null;
}

export type RegisterInput = {
  eventId: string;
  contactId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  seats: number;
  /** « site »: public form (all rules apply). « manual »: added by the coach (may exceed the capacity). */
  source: "site" | "manual";
};

export type RegisterResult =
  | {
      ok: true;
      registration: RegistrationRow;
      status: "confirmed" | "waitlist";
      updated: boolean;
      /** Website form, e-mail already registered: nothing changed (see registerForEvent). */
      duplicate?: boolean;
    }
  | { ok: false; reason: "not_found" | "closed" | "too_many" | "full" };

/**
 * Books seats. No seat left: waiting list if the event has one, otherwise « full ».
 * The same e-mail registering again never creates a second booking:
 * - from the website, the existing booking is left untouched (`duplicate`): typing someone else's e-mail must
 *   not let a stranger change or see their booking — the caller e-mails the link to that address instead;
 * - added by the coach, the booking is updated (seats, phone…).
 */
export async function registerForEvent(db: AnyDb, input: RegisterInput, now = new Date()): Promise<RegisterResult> {
  const email = input.email.trim().toLowerCase();
  return db.transaction(async (tx) => {
    const ev = await lockEvent(tx, input.eventId);
    if (!ev || ev.status === "cancelled") return { ok: false, reason: "not_found" } as const;
    if (input.source === "site" && !canRegister(ev, now)) return { ok: false, reason: "closed" } as const;
    if (input.source === "site" && input.seats > ev.maxSeatsPerBooking) return { ok: false, reason: "too_many" } as const;

    const [existing] = await tx
      .select()
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, ev.id),
          sql`lower(${eventRegistrations.email}) = ${email}`,
          inArray(eventRegistrations.status, [...ACTIVE]),
        ),
      )
      .limit(1);

    if (existing && input.source === "site") {
      return { ok: true, registration: existing, status: existing.status as "confirmed" | "waitlist", updated: false, duplicate: true } as const;
    }
    const free = freeSeats(ev.capacity, await seatsTaken(tx, ev.id, existing?.id));
    const fits = free == null || input.seats <= free || input.source === "manual";
    let status: "confirmed" | "waitlist";
    if (fits) status = "confirmed";
    else if (existing?.status === "confirmed") return { ok: false, reason: "full" } as const; // keeps the current seats
    else if (ev.waitlistEnabled) status = "waitlist";
    else return { ok: false, reason: "full" } as const;

    const values = {
      contactId: input.contactId ?? existing?.contactId ?? null,
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      phone: input.phone,
      company: input.company,
      seats: input.seats,
      status,
    };
    if (existing) {
      const [registration] = await tx
        .update(eventRegistrations)
        .set(values)
        .where(eq(eventRegistrations.id, existing.id))
        .returning();
      return { ok: true, registration, status, updated: true } as const;
    }
    const [registration] = await tx
      .insert(eventRegistrations)
      .values({ ...values, eventId: ev.id, source: input.source })
      .returning();
    return { ok: true, registration, status, updated: false } as const;
  });
}

/**
 * Cancels a booking and moves the waiting list up (oldest first, as long as their seats fit).
 * Returns the registrations that just got a seat, so the caller can e-mail them.
 */
export async function cancelRegistration(db: AnyDb, registrationId: string, now = new Date()) {
  return db.transaction(async (tx) => {
    const [reg] = await tx.select().from(eventRegistrations).where(eq(eventRegistrations.id, registrationId)).limit(1);
    if (!reg) return { cancelled: null, promoted: [] as RegistrationRow[] };
    const ev = await lockEvent(tx, reg.eventId);
    if (reg.status === "cancelled" || !ev) return { cancelled: null, promoted: [] as RegistrationRow[] };
    const [cancelled] = await tx
      .update(eventRegistrations)
      .set({ status: "cancelled", cancelledAt: now })
      .where(eq(eventRegistrations.id, reg.id))
      .returning();
    const promoted = ev.status === "published" && ev.startsAt > now ? await promoteWaitlist(tx, ev) : [];
    return { cancelled, promoted };
  });
}

/** Inside a transaction holding the event lock: gives free seats to the waiting list, in order. */
async function promoteWaitlist(tx: Tx, ev: EventRow) {
  const waiting = await tx
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, ev.id), eq(eventRegistrations.status, "waitlist")))
    .orderBy(asc(eventRegistrations.createdAt));
  let free = freeSeats(ev.capacity, await seatsTaken(tx, ev.id));
  const promoted: RegistrationRow[] = [];
  for (const w of waiting) {
    if (free != null && w.seats > free) continue;
    const [row] = await tx
      .update(eventRegistrations)
      .set({ status: "confirmed" })
      .where(eq(eventRegistrations.id, w.id))
      .returning();
    promoted.push(row);
    if (free != null) free -= w.seats;
  }
  return promoted;
}

/** The coach raised the capacity (or opened the waiting list): move people up right away. */
export async function refillFromWaitlist(db: AnyDb, eventId: string, now = new Date()) {
  return db.transaction(async (tx) => {
    const ev = await lockEvent(tx, eventId);
    if (!ev || ev.status !== "published" || ev.startsAt <= now) return [] as RegistrationRow[];
    return promoteWaitlist(tx, ev);
  });
}

// ------------------------------------------------------------------ scheduled e-mails

const HOUR = 3_600_000;

/**
 * Reminder the day before (events starting in 20–30 h). Claimed atomically: a registration is reminded once,
 * even if two cron runs overlap. Bookings made less than a day before get no reminder (the confirmation is fresh).
 */
export async function claimEventReminders(db: AnyDb, now: Date) {
  const soon = db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.status, "published"),
        gt(events.startsAt, new Date(now.getTime() + 20 * HOUR)),
        lte(events.startsAt, new Date(now.getTime() + 30 * HOUR)),
      ),
    );
  return db
    .update(eventRegistrations)
    .set({ reminderSentAt: now })
    .where(
      and(
        eq(eventRegistrations.status, "confirmed"),
        isNull(eventRegistrations.reminderSentAt),
        inArray(eventRegistrations.eventId, soon),
        lte(eventRegistrations.createdAt, new Date(now.getTime() - 12 * HOUR)),
      ),
    )
    .returning();
}

/** Thank-you e-mail the day after (events ended 18–48 h ago), to the people marked present. */
export async function claimEventThanks(db: AnyDb, now: Date) {
  const ended = db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.status, "published"),
        eq(events.manualHistory, false),
        lte(events.endsAt, new Date(now.getTime() - 18 * HOUR)),
        gt(events.endsAt, new Date(now.getTime() - 48 * HOUR)),
      ),
    );
  return db
    .update(eventRegistrations)
    .set({ thanksSentAt: now })
    .where(
      and(
        eq(eventRegistrations.status, "confirmed"),
        eq(eventRegistrations.attended, true),
        isNull(eventRegistrations.thanksSentAt),
        inArray(eventRegistrations.eventId, ended),
      ),
    )
    .returning();
}

/** A failed send gives the claim back for the next run. */
export async function releaseClaim(db: AnyDb, registrationId: string, kind: "reminder" | "thanks") {
  await db
    .update(eventRegistrations)
    .set(kind === "reminder" ? { reminderSentAt: null } : { thanksSentAt: null })
    .where(eq(eventRegistrations.id, registrationId));
}
