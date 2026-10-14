import "server-only";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { emailLog } from "@/server/db/schema";

/**
 * Scheduled jobs, run by POST /api/cron/run (every 5 minutes on the server: system cron).
 * Each job must be idempotent: running it twice in a row must not send or change anything twice
 * (select rows by status / timestamp and update them in the same step).
 * Phase 2 adds: session reminders (M2), scheduled e-mails (M4), payment reminders (M6).
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

export const JOBS: Job[] = [markStuckEmails];

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
