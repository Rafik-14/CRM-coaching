import "server-only";
import { and, asc, gte, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { coachingSessions } from "@/server/db/schema";
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
