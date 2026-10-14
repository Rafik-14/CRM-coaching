"use server";

import { and, asc, desc, eq, gte } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { SITE_CASES_TAG } from "@/server/queries/site";
import { activityLog, clients, coachingSessions, contacts, pipelineStages } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { advanceProspectAfterEchange } from "@/server/pipeline-automation";
import { DISCOVERY_TYPE, caseStudySchema, closeCoachingSchema, scheduleSessionSchema } from "@/lib/validations/coaching";

export type ActionState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> };

async function getClientForContact(contactId: string) {
  return db.query.clients.findFirst({ where: eq(clients.contactId, contactId) });
}

/** Local date + time (coach's browser) → exact instant. */
function toInstant(date: string, time: string, tzOffset: number) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) + tzOffset * 60_000);
}

/**
 * Prospects can only book discovery calls; clients get any session type while their coaching is active.
 */
export async function scheduleSession(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const parsed = scheduleSessionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const v = parsed.data;

  const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, v.contactId), columns: { id: true } });
  if (!contact) return { error: "Contact introuvable." };
  const client = await getClientForContact(v.contactId);
  if (client && client.status !== "active") return { error: "Cet accompagnement est clôturé ou en pause." };
  if (!client && v.type !== DISCOVERY_TYPE) {
    return { error: "Pour un prospect, seul un « Échange stratégique » peut être planifié." };
  }

  const startsAt = toInstant(v.date, v.time, v.tzOffset);
  if (startsAt.getTime() < Date.now() - 5 * 60_000) return { error: "Ce créneau est déjà passé." };

  await db.insert(coachingSessions).values({
    contactId: v.contactId,
    clientId: client?.id ?? null,
    startsAt,
    durationMin: v.durationMin,
    type: v.type,
    location: v.location,
    agenda: v.agenda,
  });

  await db.insert(activityLog).values({
    actorId: user.id,
    entity: "contact",
    entityId: v.contactId,
    action: "session_scheduled",
  });
  if (!client) await advanceProspectAfterEchange(v.contactId, user.id, "scheduled");
  refresh();
  return { ok: true };
}

export async function closeCoaching(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const parsed = closeCoachingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const v = parsed.data;

  const client = await getClientForContact(v.contactId);
  if (!client) return { error: "Ce contact n'est pas client." };

  await db
    .update(clients)
    .set({
      status: v.outcome,
      closedAt: new Date(),
      closeReason: v.reason,
      closeNote: v.note,
      // A successful coaching can be written up as a case study right away.
      ...(v.outcome === "finished" && caseStudyValues(v)),
    })
    .where(eq(clients.id, client.id));

  if (v.outcome !== "paused") {
    // Cancel upcoming sessions and move the contact to the last "client" stage (e.g. "Terminé").
    await db
      .update(coachingSessions)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(coachingSessions.clientId, client.id),
          eq(coachingSessions.status, "planned"),
          gte(coachingSessions.startsAt, new Date()),
        ),
      );
    const finalStage = await db.query.pipelineStages.findFirst({
      where: eq(pipelineStages.isClient, true),
      orderBy: desc(pipelineStages.position),
    });
    if (finalStage) {
      await db
        .update(contacts)
        .set({ stageId: finalStage.id, stageChangedAt: new Date() })
        .where(eq(contacts.id, v.contactId));
    }
  }

  await db.insert(activityLog).values({
    actorId: user.id,
    entity: "contact",
    entityId: v.contactId,
    action: `coaching_${v.outcome}`,
  });
  updateTag(SITE_CASES_TAG);
  refresh();
  return { ok: true };
}

/** Columns for the case study; an empty case study is stored as null. Skips fields the form did not send. */
function caseStudyValues(v: {
  before: string | null;
  trigger: string | null;
  after: string | null;
  changes: string[];
  positioningStatement: string | null;
  testimonialConsent: boolean;
}) {
  const filled = !!(v.before || v.trigger || v.after || v.changes.length);
  return {
    caseStudy: filled ? { before: v.before ?? undefined, trigger: v.trigger ?? undefined, after: v.after ?? undefined, changes: v.changes } : null,
    positioningStatement: v.positioningStatement,
    testimonialConsent: v.testimonialConsent,
  };
}

/** Edit the case study / positioning statement at any time from the client file. */
export async function saveCaseStudy(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const parsed = caseStudySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const client = await getClientForContact(parsed.data.contactId);
  if (!client) return { error: "Ce contact n'est pas client." };
  await db.update(clients).set(caseStudyValues(parsed.data)).where(eq(clients.id, client.id));
  await db.insert(activityLog).values({
    actorId: user.id,
    entity: "contact",
    entityId: parsed.data.contactId,
    action: "case_study_saved",
  });
  updateTag(SITE_CASES_TAG);
  refresh();
  return { ok: true };
}

export async function reopenCoaching(contactId: string) {
  const user = await requireCoach();
  const id = z.uuid().parse(contactId);
  const client = await getClientForContact(id);
  if (!client) return;
  await db
    .update(clients)
    .set({ status: "active", closedAt: null, closeReason: null, closeNote: null })
    .where(eq(clients.id, client.id));
  // Back to the first "client" stage (e.g. "Client"), undoing the move to "Terminé".
  const clientStage = await db.query.pipelineStages.findFirst({
    where: eq(pipelineStages.isClient, true),
    orderBy: asc(pipelineStages.position),
  });
  if (clientStage) {
    await db
      .update(contacts)
      .set({ stageId: clientStage.id, stageChangedAt: new Date() })
      .where(eq(contacts.id, id));
  }
  await db.insert(activityLog).values({ actorId: user.id, entity: "contact", entityId: id, action: "coaching_reopened" });
  updateTag(SITE_CASES_TAG);
  refresh();
}
