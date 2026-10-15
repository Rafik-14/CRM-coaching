import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { contacts } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { currentToken, findToken } from "@/server/access-tokens";
import { appUrl } from "@/server/email/config";

/**
 * Personal booking link of an existing client (/reserver/seance/<token>, PHASE-2-PLAN §9.4):
 * the client books coaching sessions without a login until the Phase 3 portal.
 */
export const clientBookingUrl = (token: string) => `${appUrl()}/reserver/seance/${token}`;

/** CRM side: the link shown in the client file, or null. */
export async function getClientBookingLink(contactId: string) {
  await requireCoach();
  const current = await currentToken(db, "client_booking", { contactId });
  return current ? { url: clientBookingUrl(current.token), lastUsedAt: current.row.lastUsedAt } : null;
}

/** Public side: the client behind a link; `active` only while the coaching is in progress. */
export async function resolveClientBooking(token: string) {
  const row = await findToken(db, "client_booking", token);
  if (!row?.contactId) return null;
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, row.contactId),
    columns: { id: true, firstName: true, lastName: true, email: true },
    with: { client: { columns: { id: true, status: true } } },
  });
  if (!contact?.client) return null;
  return { token: row, contact, client: contact.client, active: contact.client.status === "active" };
}
