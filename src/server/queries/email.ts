import "server-only";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { emailLog, settings, user } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { mailConfig } from "@/server/email/config";
import { getEmailSettings } from "@/server/email/messages";

/** Paramètres › E-mails: configuration status (never the password), notification address, last e-mails. */
export async function getEmailOverview() {
  await requireCoach();
  const c = mailConfig();
  const [prefs, coach, recent] = await Promise.all([
    getEmailSettings(),
    db.query.user.findFirst({ where: eq(user.role, "coach"), orderBy: asc(user.createdAt), columns: { email: true } }),
    db.query.emailLog.findMany({
      orderBy: desc(emailLog.createdAt),
      limit: 15,
      with: { contact: { columns: { id: true, firstName: true, lastName: true } } },
    }),
  ]);
  return {
    config: {
      configured: c.configured,
      host: c.host,
      port: c.port,
      user: c.user,
      from: c.from,
      replyTo: c.replyTo,
      redirectTo: c.redirectTo,
      missing: c.missing,
    },
    notifyTo: prefs.notifyTo,
    coachEmail: coach?.email ?? null,
    recent,
    ...(await health()),
  };
}

/** Last 30 days of e-mails and the last run of the scheduled jobs. */
async function health() {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [counts, run] = await Promise.all([
    db
      .select({ status: emailLog.status, n: sql<number>`count(*)::int` })
      .from(emailLog)
      .where(and(gte(emailLog.createdAt, since)))
      .groupBy(emailLog.status),
    db.query.settings.findFirst({ where: eq(settings.key, "cron_last_run") }),
  ]);
  const at = (run?.value as { at?: string } | undefined)?.at;
  return {
    sent30: counts.find((c) => c.status === "sent")?.n ?? 0,
    failed30: counts.find((c) => c.status === "failed")?.n ?? 0,
    lastRunAt: at ? new Date(at) : null,
    /** Jobs run every 5 minutes: more than 15 minutes without a run means the server cron stopped. */
    cronLate: at ? Date.now() - new Date(at).getTime() > 15 * 60_000 : true,
  };
}
