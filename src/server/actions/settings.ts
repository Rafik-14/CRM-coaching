"use server";

import { asc, count, desc, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { clientPackages, contacts, noteTemplates, packages, pipelineStages, settings } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { businessSchema, noteTemplateSchema, packageSchema, stageSchema } from "@/lib/validations/phase1";
import type { ActionState } from "./coaching";

const fieldErrors = (e: z.ZodError) => ({ fieldErrors: z.flattenError(e).fieldErrors as Record<string, string[]> });

// ------------------------------------------------------------------ pipeline stages

export async function saveStage(stageId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const parsed = stageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  if (stageId) {
    await db.update(pipelineStages).set(parsed.data).where(eq(pipelineStages.id, z.uuid().parse(stageId)));
  } else {
    const [last] = await db
      .select({ position: pipelineStages.position })
      .from(pipelineStages)
      .orderBy(desc(pipelineStages.position))
      .limit(1);
    await db.insert(pipelineStages).values({ ...parsed.data, position: (last?.position ?? -1) + 1 });
  }
  refresh();
  return { ok: true };
}

export async function moveStage(stageId: string, direction: "up" | "down") {
  await requireCoach();
  const stages = await db.query.pipelineStages.findMany({ orderBy: asc(pipelineStages.position) });
  const i = stages.findIndex((s) => s.id === z.uuid().parse(stageId));
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= stages.length) return;
  // Swap positions
  await db.update(pipelineStages).set({ position: stages[j].position }).where(eq(pipelineStages.id, stages[i].id));
  await db.update(pipelineStages).set({ position: stages[i].position }).where(eq(pipelineStages.id, stages[j].id));
  refresh();
}

export async function deleteStage(stageId: string): Promise<ActionState> {
  await requireCoach();
  const id = z.uuid().parse(stageId);
  const [{ n }] = await db.select({ n: count() }).from(contacts).where(eq(contacts.stageId, id));
  if (n > 0) return { error: `Impossible : ${n} contact${n > 1 ? "s sont" : " est"} encore à cette étape.` };
  const [{ total }] = await db.select({ total: count() }).from(pipelineStages);
  if (total <= 2) return { error: "Le pipeline doit garder au moins 2 étapes." };
  await db.delete(pipelineStages).where(eq(pipelineStages.id, id));
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ packages

export async function savePackage(packageId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const parsed = packageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const business = await db.query.settings.findFirst({ where: eq(settings.key, "business") });
  const currency = (business?.value as { currency?: string } | undefined)?.currency ?? "EUR";

  if (packageId) {
    const id = z.uuid().parse(packageId);
    // Changing the number of sessions of a package already sold would rewrite clients' history.
    const [{ sold }] = await db.select({ sold: count() }).from(clientPackages).where(eq(clientPackages.packageId, id));
    const current = await db.query.packages.findFirst({ where: eq(packages.id, id) });
    if (sold > 0 && current && current.sessionsCount !== parsed.data.sessionsCount) {
      return { error: "Ce forfait a déjà été vendu : créez un nouveau forfait pour changer le nombre de séances." };
    }
    await db.update(packages).set({ ...parsed.data, currency }).where(eq(packages.id, id));
  } else {
    await db.insert(packages).values({ ...parsed.data, currency });
  }
  refresh();
  return { ok: true };
}

/** Packages are archived (hidden from new sales), never deleted, so past sales stay intact. */
export async function setPackageActive(packageId: string, active: boolean) {
  await requireCoach();
  await db.update(packages).set({ active }).where(eq(packages.id, z.uuid().parse(packageId)));
  refresh();
}

// ------------------------------------------------------------------ note template & business

export async function saveNoteTemplate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const parsed = noteTemplateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const current = await db.query.noteTemplates.findFirst({ where: eq(noteTemplates.isDefault, true) });
  if (current) {
    await db.update(noteTemplates).set({ fields: parsed.data.fields }).where(eq(noteTemplates.id, current.id));
  } else {
    await db.insert(noteTemplates).values({ name: "Séance standard", fields: parsed.data.fields, isDefault: true });
  }
  refresh();
  return { ok: true };
}

export async function saveBusiness(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const parsed = businessSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  await db
    .insert(settings)
    .values({ key: "business", value: parsed.data })
    .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value` } });
  refresh();
  return { ok: true };
}
