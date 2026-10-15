import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { intakeResponses, settings } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { appUrl } from "@/server/email/config";
import { questionnaireToken } from "@/server/questionnaire-links";
import { QUESTIONNAIRE_KEY, normalizeQuestionnaire } from "@/lib/questionnaire";

/** The questions (Paramètres › Questionnaire), or the default set. */
export async function getQuestionnaire() {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, QUESTIONNAIRE_KEY) });
  return normalizeQuestionnaire(row?.value);
}

/** Link to send to a contact (reuses the open one, else a new one valid 30 days). */
export async function questionnaireUrl(contactId: string) {
  return `${appUrl()}/questionnaire/${await questionnaireToken(db, contactId)}`;
}

/** Client file: last questionnaire sent and its answers. */
export async function getContactQuestionnaire(contactId: string) {
  await requireCoach();
  const [latest] = await db
    .select()
    .from(intakeResponses)
    .where(eq(intakeResponses.contactId, contactId))
    .orderBy(desc(intakeResponses.sentAt))
    .limit(1);
  const [answered] = await db
    .select()
    .from(intakeResponses)
    .where(eq(intakeResponses.contactId, contactId))
    .orderBy(desc(intakeResponses.submittedAt))
    .limit(1);
  return { latest: latest ?? null, answered: answered?.submittedAt ? answered : null };
}
