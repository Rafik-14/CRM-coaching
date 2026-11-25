"use server";

import { asc, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { activityLog, clientPackages, clients, contacts, goals, packages, pipelineStages, tasks } from "@/server/db/schema";
import { offerPrice } from "@/lib/format";
import { requireCoach } from "@/server/dal";
import { assignPackageSchema, goalSchema, PAYMENT_STATUSES, taskSchema } from "@/lib/validations/phase1";
import { onBecameClient } from "@/server/sequences";
import { RECOMMENDED_TAG } from "@/lib/pipeline";
import type { ActionState } from "./coaching";

const fieldErrors = (e: z.ZodError) => ({ fieldErrors: z.flattenError(e).fieldErrors as Record<string, string[]> });

async function clientForContact(contactId: string) {
  return db.query.clients.findFirst({ where: eq(clients.contactId, z.uuid().parse(contactId)) });
}

async function log(actorId: string, contactId: string | null | undefined, action: string) {
  if (!contactId) return;
  await db.insert(activityLog).values({ actorId, entity: "contact", entityId: contactId, action });
}

// ------------------------------------------------------------------ packages

/** Adds a programme to an existing client: price of the contact's currency frozen on the sale, preset goals added. */
async function addPackage(
  clientId: string,
  contactId: string,
  packageId: string,
  paymentStatus: (typeof PAYMENT_STATUSES)[number],
) {
  const pkg = await db.query.packages.findFirst({ where: eq(packages.id, packageId) });
  if (!pkg?.active) return "Accompagnement introuvable.";
  const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, contactId), columns: { currency: true } });
  // Price list of the contact's currency, frozen on the sale.
  const { amount, currency } = offerPrice(pkg, contact?.currency ?? "EUR");
  await db.transaction(async (tx) => {
    await tx.insert(clientPackages).values({ clientId, packageId: pkg.id, paymentStatus, price: amount, currency });
    // e.g. Parcours Signature JG®: Identité, Valeur, Positionnement, Posture, Impact (skip goals already there).
    if (pkg.goalPresets.length) {
      const existing = await tx.query.goals.findMany({ where: eq(goals.clientId, clientId), columns: { title: true } });
      const have = new Set(existing.map((g) => g.title.toLowerCase()));
      const fresh = pkg.goalPresets.filter((t) => !have.has(t.toLowerCase()));
      if (fresh.length) await tx.insert(goals).values(fresh.map((title) => ({ clientId, title })));
    }
  });
  return null;
}

export async function assignPackage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const parsed = assignPackageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const client = await clientForContact(parsed.data.contactId);
  if (!client) return { error: "Ce contact n'est pas encore client." };
  const error = await addPackage(client.id, parsed.data.contactId, parsed.data.packageId, parsed.data.paymentStatus);
  if (error) return { error };
  await log(user.id, parsed.data.contactId, "package_assigned");
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ automatic pipeline (Nov. 2026)

/**
 * After the « Échange stratégique »: the coach picks the offer he recommends. The prospect moves to the 4th stage
 * (« Offre recommandée », by order so renamed stages still work), the card shows that offer's price, and a tag keeps
 * its name. Never moves a client, and never moves someone who is already further along.
 */
export async function recommendOffer(contactId: string, packageId: string): Promise<ActionState> {
  const user = await requireCoach();
  const id = z.uuid().parse(contactId);
  const pkg = await db.query.packages.findFirst({ where: eq(packages.id, z.uuid().parse(packageId)) });
  if (!pkg?.active) return { error: "Accompagnement introuvable." };
  const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, id) });
  if (!contact) return { error: "Contact introuvable." };
  if (await clientForContact(id)) return { error: "Cette personne est déjà cliente." };

  const stages = await db.query.pipelineStages.findMany({ orderBy: asc(pipelineStages.position) });
  const target = stages[3];
  const current = stages.findIndex((st) => st.id === contact.stageId);
  const move = !!target && !target.isClient && current < 3;

  await db
    .update(contacts)
    .set({
      estimatedValue: offerPrice(pkg, contact.currency).amount,
      tags: [...contact.tags.filter((t) => !t.startsWith(RECOMMENDED_TAG)), `${RECOMMENDED_TAG}${pkg.name}`],
      ...(move ? { stageId: target.id, stageChangedAt: new Date() } : {}),
    })
    .where(eq(contacts.id, id));
  await log(user.id, id, "offer_recommended");
  refresh();
  return { ok: true };
}

/**
 * « Démarrer l'accompagnement » on a prospect's page: the person becomes a client (first client stage, welcome e-mail
 * with the questionnaire, as when the card is dragged there) and the chosen programme is recorded with its payment.
 */
export async function startCoaching(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const parsed = assignPackageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { contactId, packageId, paymentStatus } = parsed.data;
  const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, contactId) });
  if (!contact) return { error: "Contact introuvable." };
  if (await clientForContact(contactId)) return { error: "Cette personne est déjà cliente." };
  const clientStage = await db.query.pipelineStages.findFirst({
    where: eq(pipelineStages.isClient, true),
    orderBy: asc(pipelineStages.position),
  });
  if (!clientStage) return { error: "Aucune étape « client » dans le pipeline (Réglages › Pipeline)." };

  const [created] = await db
    .insert(clients)
    .values({ contactId })
    .onConflictDoNothing({ target: clients.contactId })
    .returning();
  const client = created ?? (await clientForContact(contactId));
  if (!client) return { error: "Impossible de créer le client." };
  const error = await addPackage(client.id, contactId, packageId, paymentStatus);
  if (error) return { error };
  await db
    .update(contacts)
    .set({
      stageId: clientStage.id,
      stageChangedAt: new Date(),
      tags: contact.tags.filter((t) => !t.startsWith(RECOMMENDED_TAG)),
    })
    .where(eq(contacts.id, contactId));
  if (created) await onBecameClient(contactId);
  await log(user.id, contactId, "coaching_started");
  refresh();
  return { ok: true };
}

export async function setPaymentStatus(clientPackageId: string, status: (typeof PAYMENT_STATUSES)[number]) {
  await requireCoach();
  await db
    .update(clientPackages)
    .set({ paymentStatus: z.enum(PAYMENT_STATUSES).parse(status) })
    .where(eq(clientPackages.id, z.uuid().parse(clientPackageId)));
  refresh();
}

export async function removeClientPackage(clientPackageId: string): Promise<ActionState> {
  await requireCoach();
  const id = z.uuid().parse(clientPackageId);
  const cp = await db.query.clientPackages.findFirst({ where: eq(clientPackages.id, id) });
  if (!cp) return { error: "Accompagnement introuvable." };
  if (cp.sessionsUsed > 0) return { error: "Des séances ont déjà été décomptées sur cet accompagnement." };
  await db.delete(clientPackages).where(eq(clientPackages.id, id));
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ goals

export async function createGoal(contactId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const client = await clientForContact(contactId);
  if (!client) return { error: "Ce contact n'est pas encore client." };
  await db.insert(goals).values({ clientId: client.id, ...parsed.data });
  await log(user.id, contactId, "goal_created");
  refresh();
  return { ok: true };
}

export async function updateGoal(goalId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const data = { ...parsed.data, progress: parsed.data.status === "achieved" ? 100 : parsed.data.progress };
  const updated = await db
    .update(goals)
    .set(data)
    .where(eq(goals.id, z.uuid().parse(goalId)))
    .returning({ id: goals.id });
  if (!updated.length) return { error: "Objectif introuvable." };
  refresh();
  return { ok: true };
}

export async function deleteGoal(goalId: string) {
  await requireCoach();
  await db.delete(goals).where(eq(goals.id, z.uuid().parse(goalId)));
  refresh();
}

// ------------------------------------------------------------------ tasks

export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  await db.insert(tasks).values(parsed.data);
  await log(user.id, parsed.data.contactId, "task_created");
  refresh();
  return { ok: true };
}

export async function updateTask(taskId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const updated = await db
    .update(tasks)
    .set(parsed.data)
    .where(eq(tasks.id, z.uuid().parse(taskId)))
    .returning({ id: tasks.id });
  if (!updated.length) return { error: "Tâche introuvable." };
  refresh();
  return { ok: true };
}

export async function deleteTask(taskId: string) {
  await requireCoach();
  await db.delete(tasks).where(eq(tasks.id, z.uuid().parse(taskId)));
  refresh();
}
