import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { noteTemplates, packages, pipelineStages, settings, tasks } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";

export async function listTasks() {
  await requireCoach();
  return db.query.tasks.findMany({
    orderBy: [asc(tasks.done), asc(tasks.dueAt)],
    with: { contact: true },
  });
}

export async function getSettingsOverview() {
  const user = await requireCoach();
  const [stages, pkgs, templates, business] = await Promise.all([
    db.query.pipelineStages.findMany({ orderBy: asc(pipelineStages.position) }),
    db.query.packages.findMany({ orderBy: [desc(packages.active), asc(packages.sessionsCount)] }),
    db.query.noteTemplates.findMany({ orderBy: desc(noteTemplates.isDefault) }),
    db.query.settings.findFirst({ where: eq(settings.key, "business") }),
  ]);
  const biz = (business?.value ?? {}) as { name?: string; currency?: string };
  return {
    user,
    business: { name: biz.name ?? "—", currency: biz.currency ?? "EUR" },
    stages,
    packages: pkgs,
    templates,
  };
}

/** Labels of the default note template (rubriques). */
export async function getNoteTemplateFields() {
  await requireCoach();
  const t = await db.query.noteTemplates.findFirst({ orderBy: desc(noteTemplates.isDefault) });
  return t?.fields ?? [];
}

/** Packages currently on sale, for the "attribuer un forfait" dialog. */
export async function getActivePackages() {
  await requireCoach();
  return db.query.packages.findMany({ where: eq(packages.active, true), orderBy: asc(packages.sessionsCount) });
}

/** Lightweight list of contacts for pickers (tasks…). */
export async function listContactOptions() {
  await requireCoach();
  const rows = await db.query.contacts.findMany({
    columns: { id: true, firstName: true, lastName: true },
    orderBy: (c, { asc }) => [asc(c.firstName), asc(c.lastName)],
  });
  return rows.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}`.trim() }));
}
