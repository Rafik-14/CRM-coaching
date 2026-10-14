import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { coachingSessions, settings } from "@/server/db/schema";
import { APP_TIME_ZONE } from "@/lib/format";
import { computeAvailability, normalizeBookingSettings, type BookingSettings, type Interval } from "@/lib/booking";

export const BOOKING_SETTINGS_KEY = "booking";

export async function getBookingSettings(): Promise<BookingSettings> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, BOOKING_SETTINGS_KEY) });
  return normalizeBookingSettings(row?.value);
}

/** Planned sessions (any type) that overlap the booking window: the coach is not free then. */
export async function getBusyIntervals(from: Date, to: Date, executor: Pick<typeof db, "select"> = db): Promise<Interval[]> {
  const rows = await executor
    .select({ startsAt: coachingSessions.startsAt, durationMin: coachingSessions.durationMin })
    .from(coachingSessions)
    .where(
      and(
        eq(coachingSessions.status, "planned"),
        // Sessions last at most a few hours: start a day earlier to catch the ones running into the window.
        gte(coachingSessions.startsAt, new Date(from.getTime() - 24 * 3_600_000)),
        lte(coachingSessions.startsAt, to),
      ),
    );
  return rows.map((r) => ({ start: r.startsAt, end: new Date(r.startsAt.getTime() + r.durationMin * 60_000) }));
}

/** Free « Échange stratégique » slots, grouped by day (coach's time zone). Always computed fresh. */
export async function getAvailability(now = new Date()) {
  const config = await getBookingSettings();
  const until = new Date(now.getTime() + (config.horizonDays + 1) * 86_400_000);
  const busy = await getBusyIntervals(now, until);
  return { config, days: computeAvailability(config, busy, now, APP_TIME_ZONE) };
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
