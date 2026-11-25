import "server-only";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { coachingSessions, tasks } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";

/** Sessions shown on a month grid (includes the leading/trailing days of adjacent months). */
export async function getCalendarSessions(from: Date, to: Date) {
  await requireCoach();
  return db.query.coachingSessions.findMany({
    where: and(gte(coachingSessions.startsAt, from), lt(coachingSessions.startsAt, to)),
    orderBy: asc(coachingSessions.startsAt),
    with: { contact: { columns: { id: true, firstName: true, lastName: true } } },
  });
}

export type CalendarSession = Awaited<ReturnType<typeof getCalendarSessions>>[number];

/** Open to-dos shown under the Agenda (the tasks page has no menu entry in the simplified CRM). */
export async function getOpenTasks(limit = 8) {
  await requireCoach();
  return db.query.tasks.findMany({
    where: eq(tasks.done, false),
    orderBy: asc(tasks.dueAt),
    limit,
    with: { contact: { columns: { id: true, firstName: true, lastName: true } } },
  });
}
