import { and, eq, gt, inArray, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";
import { coachingSessions, contacts } from "@/server/db/schema";
import type { AnyDb } from "@/server/db/types";
import { manageToken } from "@/server/access-tokens";

/**
 * Session reminders (PHASE-2-PLAN §7): one e-mail 24 h before, one 1 h before every planned session.
 * Idempotent: a single UPDATE … WHERE reminder_x_sent_at IS NULL RETURNING claims the sessions, so two runs
 * (even at the same time) never send the same reminder twice. A failed send releases its claim for the next run.
 * No "server-only" import: the tests run it against PGlite; only server code (src/server/jobs.ts) imports it.
 */
export type ReminderKind = "24h" | "1h";

const MIN = 60_000;
const HOUR = 60 * MIN;

export const REMINDER_RULES: Record<
  ReminderKind,
  {
    column: "reminder24hSentAt" | "reminder1hSentAt";
    /** Sessions starting in (now + from, now + to]. The cron runs every 5 min; the gap absorbs a missed run. */
    from: number;
    to: number;
    /** No reminder when the session was booked less than this before it starts (the confirmation is fresh). */
    minLead: number;
  }
> = {
  "24h": { column: "reminder24hSentAt", from: 20 * HOUR, to: 24 * HOUR, minLead: 24 * HOUR },
  "1h": { column: "reminder1hSentAt", from: 15 * MIN, to: 1 * HOUR, minLead: 2 * HOUR },
};

export type DueReminder = {
  kind: ReminderKind;
  sessionId: string;
  contactId: string;
  email: string;
  firstName: string;
  startsAt: Date;
  durationMin: number;
  type: string;
  location: string | null;
  /** Token of the /rdv/<token> page (view, move, cancel). */
  manageToken: string;
};

/** `deliver` sends the e-mail and says whether it worked. Returns how many were sent / failed. */
export async function sendSessionReminders(
  db: AnyDb,
  kind: ReminderKind,
  now: Date,
  deliver: (reminder: DueReminder) => Promise<boolean>,
) {
  const rule = REMINDER_RULES[kind];
  const column = coachingSessions[rule.column];
  const mark = (value: Date | null) =>
    rule.column === "reminder24hSentAt" ? { reminder24hSentAt: value } : { reminder1hSentAt: value };
  const withEmail = db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(isNotNull(contacts.email), ne(contacts.email, "")));

  const claimed = await db
    .update(coachingSessions)
    .set(mark(now))
    .where(
      and(
        eq(coachingSessions.status, "planned"),
        isNull(column),
        gt(coachingSessions.startsAt, new Date(now.getTime() + rule.from)),
        lte(coachingSessions.startsAt, new Date(now.getTime() + rule.to)),
        lte(coachingSessions.createdAt, sql`${coachingSessions.startsAt} - make_interval(mins => ${rule.minLead / MIN}::int)`),
        inArray(coachingSessions.contactId, withEmail),
      ),
    )
    .returning({ id: coachingSessions.id });
  if (!claimed.length) return { sent: 0, failed: 0 };

  const rows = await db
    .select({
      sessionId: coachingSessions.id,
      contactId: coachingSessions.contactId,
      startsAt: coachingSessions.startsAt,
      durationMin: coachingSessions.durationMin,
      type: coachingSessions.type,
      location: coachingSessions.location,
      email: contacts.email,
      firstName: contacts.firstName,
    })
    .from(coachingSessions)
    .innerJoin(contacts, eq(contacts.id, coachingSessions.contactId))
    .where(inArray(coachingSessions.id, claimed.map((c) => c.id)));

  let sent = 0;
  let failed = 0;
  for (const r of rows) {
    let ok = false;
    try {
      const token = await manageToken(db, r.sessionId, r.startsAt, now);
      ok = await deliver({ ...r, kind, email: r.email!, manageToken: token });
    } catch {
      ok = false;
    }
    if (ok) {
      sent++;
    } else {
      failed++;
      // Release the claim (only ours) so the next run retries while the session is still in the window.
      await db
        .update(coachingSessions)
        .set(mark(null))
        .where(and(eq(coachingSessions.id, r.sessionId), eq(column, now)));
    }
  }
  return { sent, failed };
}
