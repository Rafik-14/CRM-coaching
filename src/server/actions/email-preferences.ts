"use server";

import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { activityLog, contacts } from "@/server/db/schema";
import { findToken } from "@/server/access-tokens";
import { clientIp, rateLimited } from "@/server/rate-limit";

/** /preferences/<token> (link at the bottom of non-essential e-mails): stop or resume them. */
export async function setEmailPreference(token: string, optOut: boolean): Promise<{ ok?: boolean; error?: string }> {
  if (rateLimited(`preferences:${await clientIp()}`, 10, 10 * 60_000)) return { error: "Trop de tentatives. Réessayez plus tard." };
  const row = await findToken(db, "unsubscribe", token);
  if (!row?.contactId) return { error: "Ce lien n’est plus valide." };
  await db.update(contacts).set({ emailOptOut: optOut === true }).where(eq(contacts.id, row.contactId));
  await db
    .insert(activityLog)
    .values({ entity: "contact", entityId: row.contactId, action: optOut ? "email_opt_out" : "email_opt_in" });
  return { ok: true };
}
