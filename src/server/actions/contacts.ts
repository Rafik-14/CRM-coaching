"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { activityLog, clients, contacts, pipelineStages, tasks } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { contactSchema } from "@/lib/validations/contact";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> };

/** Turn a contact into a client when it lands on a stage flagged `isClient`. */
async function syncClientForStage(contactId: string, stageId: string | null | undefined) {
  if (!stageId) return;
  const stage = await db.query.pipelineStages.findFirst({ where: eq(pipelineStages.id, stageId) });
  if (!stage?.isClient) return;
  await db.insert(clients).values({ contactId }).onConflictDoNothing({ target: clients.contactId });
}

export async function createContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCoach();
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const [contact] = await db.insert(contacts).values(parsed.data).returning({ id: contacts.id });
  await syncClientForStage(contact.id, parsed.data.stageId);
  await db
    .insert(activityLog)
    .values({ actorId: user.id, entity: "contact", entityId: contact.id, action: "created" });

  refresh();
  return { ok: true };
}

export async function updateContact(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireCoach();
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const contactId = z.uuid().parse(id);
  const current = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
    columns: { stageId: true },
  });
  if (!current) return { error: "Contact introuvable." };
  const stageChanged = (parsed.data.stageId ?? null) !== current.stageId;

  await db
    .update(contacts)
    .set({ ...parsed.data, ...(stageChanged && { stageChangedAt: new Date() }) })
    .where(eq(contacts.id, contactId));

  await syncClientForStage(contactId, parsed.data.stageId);
  await db.insert(activityLog).values({
    actorId: user.id,
    entity: "contact",
    entityId: contactId,
    action: stageChanged ? "stage_changed" : "updated",
  });

  refresh();
  return { ok: true };
}

export async function moveContactToStage(contactId: string, stageId: string) {
  const user = await requireCoach();
  const ids = z.object({ contactId: z.uuid(), stageId: z.uuid() }).parse({ contactId, stageId });

  await db
    .update(contacts)
    .set({ stageId: ids.stageId, stageChangedAt: new Date() })
    .where(eq(contacts.id, ids.contactId));
  await syncClientForStage(ids.contactId, ids.stageId);
  await db
    .insert(activityLog)
    .values({ actorId: user.id, entity: "contact", entityId: ids.contactId, action: "stage_changed" });
}

export async function deleteContact(id: string) {
  const user = await requireCoach();
  const contactId = z.uuid().parse(id);
  await db.delete(contacts).where(eq(contacts.id, contactId));
  await db.insert(activityLog).values({ actorId: user.id, entity: "contact", entityId: contactId, action: "deleted" });
  redirect("/contacts");
}

export async function toggleTask(id: string, done: boolean) {
  await requireCoach();
  await db.update(tasks).set({ done }).where(eq(tasks.id, z.uuid().parse(id)));
  refresh();
}
