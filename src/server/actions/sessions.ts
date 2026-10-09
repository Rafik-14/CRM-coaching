"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { activityLog, clientPackages, coachingSessions, packages, sessionNotes } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { parseNoteForm, rescheduleSchema, SESSION_STATUSES } from "@/lib/validations/phase1";
import type { ActionState } from "./coaching";

type Session = typeof coachingSessions.$inferSelect;

async function getSession(id: string) {
  return db.query.coachingSessions.findFirst({ where: eq(coachingSessions.id, z.uuid().parse(id)) });
}

/** Count a "done" session against the client's oldest package that still has sessions left. */
async function countAgainstPackage(session: Session) {
  if (!session.clientId || session.clientPackageId) return null;
  const [pkg] = await db
    .select({ id: clientPackages.id })
    .from(clientPackages)
    .innerJoin(packages, eq(clientPackages.packageId, packages.id))
    .where(and(eq(clientPackages.clientId, session.clientId), sql`${clientPackages.sessionsUsed} < ${packages.sessionsCount}`))
    .orderBy(asc(clientPackages.purchasedAt))
    .limit(1);
  if (!pkg) return null;
  await db
    .update(clientPackages)
    .set({ sessionsUsed: sql`${clientPackages.sessionsUsed} + 1` })
    .where(eq(clientPackages.id, pkg.id));
  return pkg.id;
}

/** Give the session back to its package (status changed away from "done", or deleted). */
async function uncount(session: Session) {
  if (!session.clientPackageId) return;
  await db
    .update(clientPackages)
    .set({ sessionsUsed: sql`greatest(${clientPackages.sessionsUsed} - 1, 0)` })
    .where(eq(clientPackages.id, session.clientPackageId));
}

export async function setSessionStatus(
  sessionId: string,
  status: (typeof SESSION_STATUSES)[number],
): Promise<ActionState & { counted?: boolean }> {
  const user = await requireCoach();
  const next = z.enum(SESSION_STATUSES).parse(status);
  const session = await getSession(sessionId);
  if (!session) return { error: "Séance introuvable." };
  if (session.status === next) return { ok: true };

  let clientPackageId = session.clientPackageId;
  if (next === "done") {
    clientPackageId = (await countAgainstPackage(session)) ?? session.clientPackageId;
  } else if (session.status === "done") {
    await uncount(session);
    clientPackageId = null;
  }

  await db.update(coachingSessions).set({ status: next, clientPackageId }).where(eq(coachingSessions.id, session.id));
  await db.insert(activityLog).values({
    actorId: user.id,
    entity: "contact",
    entityId: session.contactId,
    action: next === "done" ? "session_done" : next === "planned" ? "session_reopened" : `session_${next}`,
  });
  refresh();
  return { ok: true, counted: next === "done" ? !!clientPackageId : undefined };
}

export async function rescheduleSession(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const parsed = rescheduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const v = parsed.data;
  const session = await getSession(v.sessionId);
  if (!session) return { error: "Séance introuvable." };

  const [y, m, d] = v.date.split("-").map(Number);
  const [hh, mm] = v.time.split(":").map(Number);
  const startsAt = new Date(Date.UTC(y, m - 1, d, hh, mm) + v.tzOffset * 60_000);

  if (session.status === "done") await uncount(session);
  await db
    .update(coachingSessions)
    .set({ startsAt, status: "planned", clientPackageId: null })
    .where(eq(coachingSessions.id, session.id));
  await db
    .insert(activityLog)
    .values({ actorId: user.id, entity: "contact", entityId: session.contactId, action: "session_rescheduled" });
  refresh();
  return { ok: true };
}

export async function deleteSession(sessionId: string): Promise<ActionState> {
  const user = await requireCoach();
  const session = await getSession(sessionId);
  if (!session) return { error: "Séance introuvable." };
  await uncount(session);
  await db.delete(coachingSessions).where(eq(coachingSessions.id, session.id));
  await db
    .insert(activityLog)
    .values({ actorId: user.id, entity: "contact", entityId: session.contactId, action: "session_deleted" });
  refresh();
  return { ok: true };
}

export async function saveSessionNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const parsed = parseNoteForm(formData);
  if (!parsed.success) return { error: "Note invalide." };
  const v = parsed.data;
  const session = await getSession(v.sessionId);
  if (!session) return { error: "Séance introuvable." };

  // "nextSteps" is only updated when the form sends it (older notes keep theirs).
  const values = {
    templateData: v.templateData,
    content: v.content,
    ...(formData.has("nextSteps") && { nextSteps: v.nextSteps }),
  };
  await db
    .insert(sessionNotes)
    .values({ sessionId: session.id, ...values })
    .onConflictDoUpdate({ target: sessionNotes.sessionId, set: values });
  await db
    .insert(activityLog)
    .values({ actorId: user.id, entity: "contact", entityId: session.contactId, action: "note_saved" });
  refresh();
  return { ok: true };
}
