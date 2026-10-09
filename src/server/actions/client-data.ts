"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { activityLog, clientPackages, clients, goals, packages, tasks } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { assignPackageSchema, goalSchema, PAYMENT_STATUSES, taskSchema } from "@/lib/validations/phase1";
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

export async function assignPackage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const parsed = assignPackageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const client = await clientForContact(parsed.data.contactId);
  if (!client) return { error: "Ce contact n'est pas encore client." };
  const pkg = await db.query.packages.findFirst({ where: eq(packages.id, parsed.data.packageId) });
  if (!pkg?.active) return { error: "Forfait introuvable." };

  await db.insert(clientPackages).values({
    clientId: client.id,
    packageId: pkg.id,
    paymentStatus: parsed.data.paymentStatus,
  });
  await log(user.id, parsed.data.contactId, "package_assigned");
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
  if (!cp) return { error: "Forfait introuvable." };
  if (cp.sessionsUsed > 0) return { error: "Des séances ont déjà été décomptées sur ce forfait." };
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
