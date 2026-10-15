import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, asc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { availabilityExceptions, coachingSessions, settings } from "@/server/db/schema";
import { APP_TIME_ZONE } from "@/lib/format";
import {
  computeAvailability,
  normalizeBookingSettings,
  type AvailabilityException,
  type BookingSettings,
  type Interval,
} from "@/lib/booking";

export const BOOKING_SETTINGS_KEY = "booking";

export async function getBookingSettings(): Promise<BookingSettings> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, BOOKING_SETTINGS_KEY) });
  return normalizeBookingSettings(row?.value);
}

/** Planned sessions (any type) that overlap the booking window: the coach is not free then. */
export async function getBusyIntervals(
  from: Date,
  to: Date,
  executor: Pick<typeof db, "select"> = db,
  /** The session being moved does not block its own new slot. */
  excludeSessionId?: string,
): Promise<Interval[]> {
  const rows = await executor
    .select({ startsAt: coachingSessions.startsAt, durationMin: coachingSessions.durationMin })
    .from(coachingSessions)
    .where(
      and(
        eq(coachingSessions.status, "planned"),
        // Sessions last at most a few hours: start a day earlier to catch the ones running into the window.
        gte(coachingSessions.startsAt, new Date(from.getTime() - 24 * 3_600_000)),
        lte(coachingSessions.startsAt, to),
        excludeSessionId ? ne(coachingSessions.id, excludeSessionId) : undefined,
      ),
    );
  return rows.map((r) => ({ start: r.startsAt, end: new Date(r.startsAt.getTime() + r.durationMin * 60_000) }));
}

/** Today in the coach's time zone, as YYYY-MM-DD. */
export const todayKey = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(now);

/** Days off and extra hours that are not over yet. */
export async function getUpcomingExceptions(now = new Date()) {
  return db
    .select()
    .from(availabilityExceptions)
    .where(gte(availabilityExceptions.endsOn, todayKey(now)))
    .orderBy(asc(availabilityExceptions.startsOn), asc(availabilityExceptions.startTime));
}

/**
 * Free slots grouped by day (coach's time zone), always computed fresh. Default: the « Échange stratégique »
 * length; `durationMin` for client sessions; `excludeSessionId` when moving a booking.
 */
export async function getAvailability(now = new Date(), options: { durationMin?: number; excludeSessionId?: string } = {}) {
  const stored = await getBookingSettings();
  const config = options.durationMin ? { ...stored, slotMinutes: options.durationMin } : stored;
  const until = new Date(now.getTime() + (config.horizonDays + 1) * 86_400_000);
  const [busy, exceptions] = await Promise.all([
    getBusyIntervals(now, until, db, options.excludeSessionId),
    getUpcomingExceptions(now),
  ]);
  return {
    config,
    days: computeAvailability(config, busy, now, APP_TIME_ZONE, exceptions as AvailabilityException[]),
  };
}

// ------------------------------------------------------------------ booking a slot safely

/** Any number; only used to serialise bookings so two visitors never get the same slot. */
const BOOKING_LOCK = 20_260_314;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Inside a transaction: waits for other bookings in progress, then says whether the slot is still free
 * (no planned session within the buffer). Insert / update in the same transaction right after.
 */
export async function lockAndCheckSlot(
  tx: Tx,
  slot: { startsAt: Date; durationMin: number; bufferMinutes: number; excludeSessionId?: string },
) {
  await tx.execute(sql`select pg_advisory_xact_lock(${BOOKING_LOCK})`);
  const end = new Date(slot.startsAt.getTime() + slot.durationMin * 60_000);
  const buffer = slot.bufferMinutes * 60_000;
  const busy = await getBusyIntervals(slot.startsAt, end, tx, slot.excludeSessionId);
  return !busy.some((b) => slot.startsAt.getTime() < b.end.getTime() + buffer && end.getTime() > b.start.getTime() - buffer);
}

// ------------------------------------------------------------------ confirmation link

/** Signed reference to a booking, so the confirmation page and .ics file cannot be guessed. */
function sign(id: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET manquant");
  return createHmac("sha256", secret).update(`booking:${id}`).digest("base64url").slice(0, 32);
}

export function bookingToken(sessionId: string) {
  return `${sessionId}.${sign(sessionId)}`;
}

/** Session id from a token, or null when the signature does not match. */
export function readBookingToken(token: string | null | undefined) {
  const [id, signature] = (token ?? "").split(".");
  if (!id || !signature || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

export async function getBookedSession(token: string | null | undefined) {
  const id = readBookingToken(token);
  if (!id) return null;
  return db.query.coachingSessions.findFirst({
    where: eq(coachingSessions.id, id),
    columns: { id: true, startsAt: true, durationMin: true, location: true, status: true, type: true },
    with: { contact: { columns: { firstName: true } } },
  });
}
