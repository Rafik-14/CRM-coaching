import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { scheduledEmails } from "@/server/db/schema";
import type { AnyDb } from "@/server/db/types";

/**
 * Sequence engine (PHASE-2-PLAN §10.2). An event schedules an e-mail with a unique dedupe key, so the same
 * event never schedules it twice (a contact moved back and forth to « Client » gets one welcome e-mail).
 * The cron job claims due rows in one UPDATE … RETURNING (never twice, even in parallel), then `deliver`
 * re-checks at send time whether the e-mail still makes sense.
 * No "server-only" import: the tests run it against PGlite; only server code imports it.
 */
export type ScheduledEmail = typeof scheduledEmails.$inferSelect;

/** What `deliver` decided: sent, no longer relevant (with the reason shown to the coach), or failed. */
export type DeliveryResult = { status: "sent" } | { status: "skipped"; reason: string } | { status: "failed"; reason: string };

export const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 15 * 60_000;

export async function scheduleEmail(
  db: AnyDb,
  input: { contactId: string; templateKey: string; sendAt: Date; dedupeKey: string; payload?: Record<string, string> },
) {
  const rows = await db
    .insert(scheduledEmails)
    .values({ ...input, payload: input.payload ?? {} })
    .onConflictDoNothing({ target: scheduledEmails.dedupeKey })
    .returning({ id: scheduledEmails.id });
  return rows.length === 1;
}

/** Sends every due e-mail once. Returns counts for the cron summary. */
export async function sendDueEmails(
  db: AnyDb,
  now: Date,
  deliver: (email: ScheduledEmail) => Promise<DeliveryResult>,
  limit = 25,
) {
  const due = db
    .select({ id: scheduledEmails.id })
    .from(scheduledEmails)
    .where(and(eq(scheduledEmails.status, "pending"), lte(scheduledEmails.sendAt, now)))
    .orderBy(asc(scheduledEmails.sendAt))
    .limit(limit);
  const claimed = await db
    .update(scheduledEmails)
    .set({ status: "sending", claimedAt: now, attempts: sql`${scheduledEmails.attempts} + 1` })
    .where(and(inArray(scheduledEmails.id, due), eq(scheduledEmails.status, "pending")))
    .returning();

  const counts = { sent: 0, skipped: 0, failed: 0, retry: 0 };
  for (const email of claimed) {
    let result: DeliveryResult;
    try {
      result = await deliver(email);
    } catch (error) {
      result = { status: "failed", reason: error instanceof Error ? error.message : String(error) };
    }
    if (result.status === "sent") {
      counts.sent++;
      await db.update(scheduledEmails).set({ status: "sent", sentAt: now, note: null }).where(eq(scheduledEmails.id, email.id));
    } else if (result.status === "skipped") {
      counts.skipped++;
      await db.update(scheduledEmails).set({ status: "skipped", note: result.reason }).where(eq(scheduledEmails.id, email.id));
    } else if (email.attempts < MAX_ATTEMPTS) {
      // Try again a bit later (mail server down…).
      counts.retry++;
      await db
        .update(scheduledEmails)
        .set({ status: "pending", sendAt: new Date(now.getTime() + RETRY_DELAY_MS), note: result.reason.slice(0, 500) })
        .where(eq(scheduledEmails.id, email.id));
    } else {
      counts.failed++;
      await db.update(scheduledEmails).set({ status: "failed", note: result.reason.slice(0, 500) }).where(eq(scheduledEmails.id, email.id));
    }
  }
  return counts;
}

/** Rows left in « sending » by a server stopped mid-send go back to the queue after 30 minutes. */
export async function releaseStuckEmails(db: AnyDb, now: Date) {
  const rows = await db
    .update(scheduledEmails)
    .set({ status: "pending" })
    .where(and(eq(scheduledEmails.status, "sending"), lte(scheduledEmails.claimedAt, new Date(now.getTime() - 30 * 60_000))))
    .returning({ id: scheduledEmails.id });
  return rows.length;
}
