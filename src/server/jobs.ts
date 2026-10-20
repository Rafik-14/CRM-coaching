import "server-only";
import { and, eq, isNotNull, lt, or } from "drizzle-orm";
import { db } from "@/server/db";
import { accessTokens, emailLog } from "@/server/db/schema";
import { getBookingSettings } from "@/server/booking";
import { appUrl } from "@/server/email/config";
import { sessionReminder } from "@/server/email/messages";
import { getTemplate } from "@/server/email/templates";
import { sendEmail } from "@/server/email/send";
import { sendSessionReminders, type ReminderKind } from "@/server/reminders";
import { releaseStuckEmails } from "@/server/scheduled-emails";
import { runDueEmails } from "@/server/sequences";
import { claimEventReminders, claimEventThanks, releaseClaim } from "@/server/events";
import { sendEventMail } from "@/server/event-mail";
import { events } from "@/server/db/schema";

/**
 * Scheduled jobs, run by POST /api/cron/run (every 5 minutes on the server: system cron).
 * Each job must be idempotent: running it twice in a row must not send or change anything twice
 * (select rows by status / timestamp and update them in the same step).
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

/** E-mails 24 h and 1 h before every planned session (PHASE-2-PLAN §7), unless turned off in Paramètres › E-mails › Modèles. */
function sessionReminders(kind: ReminderKind): Job {
  return {
    name: `sessionReminders${kind}`,
    async run(now) {
      const tpl = await getTemplate(`session_reminder_${kind}`);
      if (!tpl.enabled) return { disabled: 1 };
      const { cancellationHours } = await getBookingSettings();
      return sendSessionReminders(db, kind, now, async (r) => {
        const mail = sessionReminder({ ...r, manageUrl: `${appUrl()}/rdv/${r.manageToken}`, cancellationHours, now }, tpl.text);
        const result = await sendEmail({ ...mail, to: r.email, contactId: r.contactId, templateKey: `session_reminder_${kind}` });
        return result.ok;
      });
    },
  };
}

/** Follow-up, welcome, last-session and thank-you e-mails that are due (PHASE-2-PLAN §10.2). */
const sendScheduledEmails: Job = {
  name: "sendScheduledEmails",
  async run(now) {
    const released = await releaseStuckEmails(db, now);
    return { ...(await runDueEmails(now)), released };
  },
};

/** Conferences & workshops: reminder the day before, thank-you the day after (docs/EVENTS-PLAN.md §5). */
function eventMails(kind: "reminder" | "thanks"): Job {
  return {
    name: kind === "reminder" ? "eventReminders" : "eventThanks",
    async run(now) {
      const claimed = kind === "reminder" ? await claimEventReminders(db, now) : await claimEventThanks(db, now);
      let sent = 0;
      let failed = 0;
      for (const reg of claimed) {
        const ev = await db.query.events.findFirst({ where: eq(events.id, reg.eventId) });
        const r = ev ? await sendEventMail(kind === "reminder" ? "event_reminder" : "event_thanks", ev, reg) : { ok: false };
        if (r.ok) sent++;
        else {
          failed++;
          await releaseClaim(db, reg.id, kind);
        }
      }
      return { sent, failed };
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

export const JOBS: Job[] = [markStuckEmails, sessionReminders("24h"), sessionReminders("1h"), sendScheduledEmails, eventMails("reminder"), eventMails("thanks"), purgeOldTokens];

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
