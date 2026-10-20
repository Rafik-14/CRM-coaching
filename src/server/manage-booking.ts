import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { coachingSessions } from "@/server/db/schema";
import { findToken } from "@/server/access-tokens";
import { getBookingSettings } from "@/server/booking";

/**
 * The booking behind a /rdv/<token> link (reminder and confirmation e-mails). Public: only what the visitor
 * needs to see their own appointment, never notes or other people's data.
 */
export async function getManagedBooking(token: string, now = new Date()) {
  const row = await findToken(db, "manage", token, now);
  if (!row?.sessionId) return null;
  const session = await db.query.coachingSessions.findFirst({
    where: eq(coachingSessions.id, row.sessionId),
    columns: { id: true, contactId: true, startsAt: true, durationMin: true, type: true, status: true, location: true },
    with: { contact: { columns: { firstName: true, lastName: true, email: true } } },
  });
  if (!session) return null;
  const config = await getBookingSettings();
  const deadline = new Date(session.startsAt.getTime() - config.cancellationHours * 3_600_000);
  return {
    session,
    config,
    /** Moving / cancelling online is allowed until `cancellationHours` before the start. */
    canChange: session.status === "planned" && now < deadline,
    isPast: session.startsAt.getTime() + session.durationMin * 60_000 < now.getTime(),
  };
}
