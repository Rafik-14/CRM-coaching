import "server-only";
import { and, asc, desc, eq, gt, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { activityLog, coachingSessions, contacts, settings, tasks } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";

/** What needs the coach's attention right now: overdue tasks, today's sessions, decisive moments this week. */
export async function getNotifications() {
  await requireCoach();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

  const [overdue, today, moments] = await Promise.all([
    db.query.tasks.findMany({
      where: and(eq(tasks.done, false), lt(tasks.dueAt, startOfDay)),
      orderBy: asc(tasks.dueAt),
      limit: 5,
      with: { contact: true },
    }),
    db.query.coachingSessions.findMany({
      where: and(
        eq(coachingSessions.status, "planned"),
        gte(coachingSessions.startsAt, startOfDay),
        lt(coachingSessions.startsAt, endOfDay),
      ),
      orderBy: asc(coachingSessions.startsAt),
      with: { contact: true },
    }),
    // Interview, pitch… in the next 7 days (Accompagnement Décisif JG®).
    db.query.contacts.findMany({
      where: and(gte(contacts.keyMomentAt, startOfDay), lt(contacts.keyMomentAt, new Date(startOfDay.getTime() + 8 * 86_400_000))),
      orderBy: asc(contacts.keyMomentAt),
      limit: 5,
      columns: { id: true, firstName: true, lastName: true, stake: true, keyMomentAt: true },
    }),
  ]);

  const online = await getOnlineActivity();
  const keyMoments = moments.map((c) => ({
    ...c,
    inDays: Math.floor((c.keyMomentAt!.getTime() - startOfDay.getTime()) / 86_400_000),
  }));
  return { overdue, today, keyMoments, online, count: overdue.length + today.length + keyMoments.length + online.length };
}

/** What people did online themselves (booked, moved, cancelled, answered the questionnaire), shown in the bell until the coach has seen it. */
export const ONLINE_ACTIONS = {
  echange_booked_online: "Échange réservé en ligne",
  session_booked_online: "Séance réservée en ligne",
  booking_moved_online: "Rendez-vous déplacé en ligne",
  booking_cancelled_online: "Rendez-vous annulé en ligne",
  questionnaire_submitted: "Questionnaire rempli",
} as const;
export const NOTIFICATIONS_SEEN_KEY = "notifications_seen";

async function getOnlineActivity() {
  const seen = await db.query.settings.findFirst({ where: eq(settings.key, NOTIFICATIONS_SEEN_KEY) });
  const seenAt = new Date((seen?.value as { at?: string } | undefined)?.at ?? 0);
  const since = new Date(Math.max(seenAt.getTime(), Date.now() - 14 * 86_400_000));
  const events = await db
    .select({ id: activityLog.id, action: activityLog.action, contactId: activityLog.entityId, createdAt: activityLog.createdAt })
    .from(activityLog)
    .where(
      and(
        eq(activityLog.entity, "contact"),
        inArray(activityLog.action, Object.keys(ONLINE_ACTIONS)),
        gt(activityLog.createdAt, since),
      ),
    )
    .orderBy(desc(activityLog.createdAt))
    .limit(8);
  if (!events.length) return [];
  const people = await db
    .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
    .from(contacts)
    .where(inArray(contacts.id, events.map((e) => e.contactId)));
  return events.flatMap((e) => {
    const contact = people.find((p) => p.id === e.contactId);
    return contact ? [{ ...e, label: ONLINE_ACTIONS[e.action as keyof typeof ONLINE_ACTIONS], contact }] : [];
  });
}
