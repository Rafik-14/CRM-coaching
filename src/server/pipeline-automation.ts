import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { activityLog, contacts, pipelineStages } from "@/server/db/schema";

/**
 * Méthode JG® pipeline: the first stages follow the « Échange stratégique ».
 * Booking it moves a prospect from stage 1 to stage 2 (« Échange stratégique planifié »),
 * holding it moves them from stage 2 to stage 3 (« Échange réalisé »).
 * Based on stage order, not names, so it keeps working if the coach renames stages.
 * Never touches clients, and never moves a contact backwards or from a later stage.
 */
/** `actorId` is null when the visitor booked online from the website. */
export async function advanceProspectAfterEchange(
  contactId: string,
  actorId: string | null,
  event: "scheduled" | "done",
) {
  const stages = await db.query.pipelineStages.findMany({ orderBy: asc(pipelineStages.position) });
  const from = stages[event === "scheduled" ? 0 : 1];
  const to = stages[event === "scheduled" ? 1 : 2];
  if (!from || !to || from.isClient || to.isClient) return;

  const moved = await db
    .update(contacts)
    .set({ stageId: to.id, stageChangedAt: new Date() })
    .where(and(eq(contacts.id, contactId), eq(contacts.stageId, from.id)))
    .returning({ id: contacts.id });
  if (moved.length) {
    await db.insert(activityLog).values({ actorId, entity: "contact", entityId: contactId, action: "stage_changed" });
  }
}
