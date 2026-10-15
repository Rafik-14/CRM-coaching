import "server-only";
import { and, eq, isNotNull, lt, or } from "drizzle-orm";
import { db } from "@/server/db";
import { accessTokens, emailLog } from "@/server/db/schema";
import { getBookingSettings } from "@/server/booking";
import { appUrl } from "@/server/email/config";
import { getEmailSettings, sessionReminder } from "@/server/email/messages";
import { sendEmail } from "@/server/email/send";
import { sendSessionReminders, type ReminderKind } from "@/server/reminders";

/**
 * Scheduled jobs, run by POST /api/cron/run (every 5 minutes on the server: system cron).
 * Each job must be idempotent: running it twice in a row must not send or change anything twice
 * (select rows by status / timestamp and update them in the same step).
 * Later milestones add: scheduled e-mails (M4), payment reminders (M6).
 */
export type Job = { name: string; run: (now: Date) => Promise<Record<string, number>> };

/** E-mails stuck in « queued » (process stopped mid-send) are marked failed after 30 minutes. */
const markStuckEmails: Job = {
  name: "markStuckEmails",
  async run(now) {
    const rows = await db
      .update(emailLog)
      .set({ status: "failed", error: "Envoi interrompu (serveur redémarré pendant l’envoi)." })
      .where(and(eq(emailLog.status, "queued"), lt(emailLog.createdAt, new Date(now.getTime() - 30 * 60_000))))
      .returning({ id: emailLog.id });
    return { marked: rows.length };
  },
};

/** E-mails 24 h and 1 h before every planned session (PHASE-2-PLAN §7), unless turned off in Paramètres › E-mails. */
function sessionReminders(kind: ReminderKind): Job {
  return {
    name: `sessionReminders${kind}`,
    async run(now) {
      const prefs = await getEmailSettings();
      if (!(kind === "24h" ? prefs.reminder24h : prefs.reminder1h)) return { disabled: 1 };
      const { cancellationHours } = await getBookingSettings();
      return sendSessionReminders(db, kind, now, async (r) => {
        const mail = sessionReminder({ ...r, manageUrl: `${appUrl()}/rdv/${r.manageToken}`, cancellationHours, now });
        const result = await sendEmail({ ...mail, to: r.email, contactId: r.contactId, templateKey: `session_reminder_${kind}` });
        return result.ok;
      });
    },
  };
}

/** Private links revoked or expired more than 30 days ago are deleted. */
const purgeOldTokens: Job = {
  name: "purgeOldTokens",
  async run(now) {
    const limit = new Date(now.getTime() - 30 * 86_400_000);
    const rows = await db
      .delete(accessTokens)
      .where(
        or(
          and(isNotNull(accessTokens.revokedAt), lt(accessTokens.revokedAt, limit)),
          and(isNotNull(accessTokens.expiresAt), lt(accessTokens.expiresAt, limit)),
        ),
      )
      .returning({ id: accessTokens.id });
    return { deleted: rows.length };
  },
};

export const JOBS: Job[] = [markStuckEmails, sessionReminders("24h"), sessionReminders("1h"), purgeOldTokens];

/** Runs every job in order; one failing job never stops the others. */
export async function runJobs(now = new Date()) {
  const results: Record<string, { ok: boolean; result?: Record<string, number>; error?: string }> = {};
  for (const job of JOBS) {
    try {
      results[job.name] = { ok: true, result: await job.run(now) };
    } catch (error) {
      results[job.name] = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  return results;
}
