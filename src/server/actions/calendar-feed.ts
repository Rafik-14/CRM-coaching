"use server";

import { refresh } from "next/cache";
import { db } from "@/server/db";
import { activityLog } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { currentToken, issueToken, revokeTokens } from "@/server/access-tokens";
import type { ActionState } from "./coaching";

/** Turns the calendar feed on (keeps the current link if there is one). */
export async function enableCalendarFeed(): Promise<ActionState> {
  await requireCoach();
  if (!(await currentToken(db, "calendar_feed"))) await issueToken(db, { purpose: "calendar_feed" });
  refresh();
  return { ok: true };
}

/** New link; the old one stops working at once (calendars subscribed with it stop updating). */
export async function regenerateCalendarFeed(): Promise<ActionState> {
  const user = await requireCoach();
  await db.transaction(async (tx) => {
    await revokeTokens(tx, "calendar_feed");
    await issueToken(tx, { purpose: "calendar_feed" });
  });
  await db.insert(activityLog).values({ actorId: user.id, entity: "settings", entityId: "calendar_feed", action: "calendar_feed_regenerated" });
  refresh();
  return { ok: true };
}

export async function disableCalendarFeed(): Promise<ActionState> {
  const user = await requireCoach();
  await revokeTokens(db, "calendar_feed");
  await db.insert(activityLog).values({ actorId: user.id, entity: "settings", entityId: "calendar_feed", action: "calendar_feed_disabled" });
  refresh();
  return { ok: true };
}
