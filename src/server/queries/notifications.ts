import "server-only";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { coachingSessions, contacts, tasks } from "@/server/db/schema";
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

  const keyMoments = moments.map((c) => ({
    ...c,
    inDays: Math.floor((c.keyMomentAt!.getTime() - startOfDay.getTime()) / 86_400_000),
  }));
  return { overdue, today, keyMoments, count: overdue.length + today.length + keyMoments.length };
}
