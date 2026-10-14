import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { noteTemplates, packages, pipelineStages, settings, tasks } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { getBookingSettings } from "@/server/booking";

export async function listTasks() {
  await requireCoach();
  return db.query.tasks.findMany({
    orderBy: [asc(tasks.done), asc(tasks.dueAt)],
    with: { contact: true },
  });
}

export async function getSettingsOverview() {
  const user = await requireCoach();
  const [stages, pkgs, templates, business, booking] = await Promise.all([
    db.query.pipelineStages.findMany({ orderBy: asc(pipelineStages.position) }),
    db.query.packages.findMany({
      orderBy: [desc(packages.active), asc(packages.position), asc(packages.sessionsCount)],
    }),
    db.query.noteTemplates.findMany({ orderBy: [desc(noteTemplates.isDefault), asc(noteTemplates.name)] }),
    db.query.settings.findFirst({ where: eq(settings.key, "business") }),
    getBookingSettings(),
  ]);
  const biz = (business?.value ?? {}) as { name?: string; currency?: string };
  return {
    user,
    business: { name: biz.name ?? "—", currency: biz.currency ?? "EUR" },
    stages,
    packages: pkgs,
    templates,
    booking,
  };
}

/** All note templates (default first), for the session note dialog. */
export async function getNoteTemplates() {
  await requireCoach();
  return db.query.noteTemplates.findMany({
    columns: { id: true, name: true, fields: true, isDefault: true, sessionType: true },
    orderBy: [desc(noteTemplates.isDefault), asc(noteTemplates.name)],
  });
}

export type NoteTemplateOption = Awaited<ReturnType<typeof getNoteTemplates>>[number];

/**
 * Template a session opens with: the one tied to its type (e.g. Échange stratégique),
 * else the template of the offer it was counted against / the client's latest offer, else the default.
 */
export function pickTemplateId(
  session: { type: string; clientPackageId: string | null },
  templates: NoteTemplateOption[],
  clientPackages: { id: string; package: { noteTemplateId: string | null } }[],
) {
  const byType = templates.find((t) => t.sessionType === session.type);
  if (byType) return byType.id;
  const pkg = clientPackages.find((cp) => cp.id === session.clientPackageId) ?? clientPackages[0];
  const fromOffer = pkg?.package.noteTemplateId;
  if (fromOffer && templates.some((t) => t.id === fromOffer)) return fromOffer;
  return templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? null;
}

/** Offers currently on sale, for the "attribuer un accompagnement" dialog. */
export async function getActivePackages() {
  await requireCoach();
  return db.query.packages.findMany({
    where: eq(packages.active, true),
    orderBy: [asc(packages.position), asc(packages.sessionsCount)],
  });
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
