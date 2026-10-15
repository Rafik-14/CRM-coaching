"use server";

import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { settings } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { NOTIFICATIONS_SEEN_KEY } from "@/server/queries/notifications";

/**
 * The coach opened the bell: online bookings / moves / cancellations seen so far leave the count
 * on the next page load (no refresh now, so the open menu doesn't empty under his eyes).
 */
export async function markOnlineNotificationsSeen() {
  await requireCoach();
  await db
    .insert(settings)
    .values({ key: NOTIFICATIONS_SEEN_KEY, value: { at: new Date().toISOString() } })
    .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value` } });
}
