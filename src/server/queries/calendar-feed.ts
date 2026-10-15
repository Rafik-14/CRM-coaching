import "server-only";
import { db } from "@/server/db";
import { requireCoach } from "@/server/dal";
import { currentToken } from "@/server/access-tokens";
import { appUrl } from "@/server/email/config";

/** Paramètres › Agenda: the private feed link (shown again from the server secret), or null when off. */
export async function getCalendarFeed() {
  await requireCoach();
  const current = await currentToken(db, "calendar_feed");
  if (!current) return null;
  const url = `${appUrl()}/api/agenda/${current.token}.ics`;
  return {
    url,
    webcalUrl: url.replace(/^https?:/, "webcal:"),
    createdAt: current.row.createdAt,
    lastUsedAt: current.row.lastUsedAt,
  };
}
