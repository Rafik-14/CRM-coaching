import "server-only";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { coachingSessions, tasks } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";

/** What needs the coach's attention right now: overdue tasks and today's sessions. */
export async function getNotifications() {
  await requireCoach();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

  const [overdue, today] = await Promise.all([
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
  ]);

  return { overdue, today, count: overdue.length + today.length };
}
