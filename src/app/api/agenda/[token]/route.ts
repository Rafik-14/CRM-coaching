import { connection } from "next/server";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { accessTokens, coachingSessions, contacts, events } from "@/server/db/schema";
import { findToken } from "@/server/access-tokens";
import { appUrl } from "@/server/email/config";
import { FEED_FUTURE_DAYS, FEED_PAST_DAYS, buildCoachFeed } from "@/lib/calendar-feed";

/**
 * Private, read-only calendar feed: /api/agenda/<token>.ics (link in Paramètres › Agenda).
 * Public route (not in the proxy matcher): the token is the only protection, and « Régénérer » revokes it.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/agenda/[token]">) {
  await connection(); // always fresh, never prerendered
  const { token } = await ctx.params;
  const now = new Date();
  const row = await findToken(db, "calendar_feed", token.replace(/\.ics$/, ""), now);
  if (!row) return new Response("Lien d’agenda invalide ou révoqué.", { status: 404 });

  const sessions = await db
    .select({
      id: coachingSessions.id,
      contactId: coachingSessions.contactId,
      startsAt: coachingSessions.startsAt,
      durationMin: coachingSessions.durationMin,
      type: coachingSessions.type,
      status: coachingSessions.status,
      location: coachingSessions.location,
      updatedAt: coachingSessions.updatedAt,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
    })
    .from(coachingSessions)
    .innerJoin(contacts, eq(contacts.id, coachingSessions.contactId))
    .where(
      and(
        inArray(coachingSessions.status, ["planned", "done", "no_show"]),
        gte(coachingSessions.startsAt, new Date(now.getTime() - FEED_PAST_DAYS * 86_400_000)),
        lte(coachingSessions.startsAt, new Date(now.getTime() + FEED_FUTURE_DAYS * 86_400_000)),
      ),
    )
    .orderBy(coachingSessions.startsAt);

  const feedEvents = await db
    .select({ id: events.id, title: events.title, startsAt: events.startsAt, endsAt: events.endsAt, location: events.location, updatedAt: events.updatedAt })
    .from(events)
    .where(
      and(
        eq(events.status, "published"),
        eq(events.manualHistory, false),
        gte(events.startsAt, new Date(now.getTime() - FEED_PAST_DAYS * 86_400_000)),
        lte(events.startsAt, new Date(now.getTime() + FEED_FUTURE_DAYS * 86_400_000)),
      ),
    );

  // « Dernière synchronisation » in Paramètres (at most one write every 10 minutes).
  if (!row.lastUsedAt || now.getTime() - row.lastUsedAt.getTime() > 10 * 60_000) {
    await db.update(accessTokens).set({ lastUsedAt: now }).where(eq(accessTokens.id, row.id));
  }

  return new Response(buildCoachFeed(sessions, appUrl(), now, feedEvents), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="seances-methode-jg.ics"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
