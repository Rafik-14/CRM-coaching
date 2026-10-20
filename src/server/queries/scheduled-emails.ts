import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { scheduledEmails } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";

/** Automatic e-mails of a contact that have not gone out yet (client file). */
export async function getPendingEmails(contactId: string) {
  await requireCoach();
  return db
    .select({
      id: scheduledEmails.id,
      templateKey: scheduledEmails.templateKey,
      sendAt: scheduledEmails.sendAt,
      due: sql<boolean>`${scheduledEmails.sendAt} <= now()`,
    })
    .from(scheduledEmails)
    .where(and(eq(scheduledEmails.contactId, contactId), eq(scheduledEmails.status, "pending")))
    .orderBy(asc(scheduledEmails.sendAt));
}
