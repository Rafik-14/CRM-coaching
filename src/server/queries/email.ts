import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { emailLog, settings, user } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { mailConfig } from "@/server/email/config";
import { EMAIL_SETTINGS_KEY } from "@/server/email/messages";

/** Paramètres › E-mails: configuration status (never the password), notification address, last e-mails. */
export async function getEmailOverview() {
  await requireCoach();
  const c = mailConfig();
  const [row, coach, recent] = await Promise.all([
    db.query.settings.findFirst({ where: eq(settings.key, EMAIL_SETTINGS_KEY) }),
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
    notifyTo: (row?.value as { notifyTo?: string | null } | undefined)?.notifyTo ?? null,
    coachEmail: coach?.email ?? null,
    recent,
  };
}
