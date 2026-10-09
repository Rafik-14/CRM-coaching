import "server-only";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db";
import { clients, contacts, pipelineStages } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { buildTimeline } from "./timeline";

export const CONTACTS_PAGE_SIZE = 15;

export async function getStages() {
  await requireCoach();
  return db.query.pipelineStages.findMany({ orderBy: asc(pipelineStages.position) });
}

function contactFilters({ q, stage }: { q?: string; stage?: string }) {
  const filters: SQL[] = [];
  const term = q?.trim();
  if (term) {
    const like = `%${term}%`;
    filters.push(
      or(
        ilike(contacts.firstName, like),
        ilike(contacts.lastName, like),
        ilike(contacts.email, like),
        ilike(contacts.phone, like),
      )!,
    );
  }
  if (stage) filters.push(eq(contacts.stageId, stage));
  return filters.length ? and(...filters) : undefined;
}

// Epoch milliseconds → Date (avoids driver-specific timestamp string parsing).
const toDate = (v: unknown) => (v == null ? null : new Date(Number(v)));

/** Most recent of: profile update, logged activity, past session. */
const lastActivityMs = sql`(extract(epoch from greatest(
  ${contacts.updatedAt},
  (select max(a.created_at) from activity_log a where a.entity = 'contact' and a.entity_id = ${contacts.id}::text),
  (select max(s.starts_at) from coaching_sessions s join clients c on c.id = s.client_id
     where c.contact_id = ${contacts.id} and s.starts_at <= now())
)) * 1000)`;

/** Due date of the next open task for this contact. */
const nextTaskDueMs = sql`(select extract(epoch from min(t.due_at)) * 1000 from tasks t
  where t.contact_id = ${contacts.id} and t.done = false)`;

export async function listContacts({ q, stage, page = 1 }: { q?: string; stage?: string; page?: number }) {
  await requireCoach();
  const where = contactFilters({ q, stage });
  const offset = (Math.max(1, page) - 1) * CONTACTS_PAGE_SIZE;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        source: contacts.source,
        tags: contacts.tags,
        createdAt: contacts.createdAt,
        estimatedValue: contacts.estimatedValue,
        stageId: contacts.stageId,
        stageName: pipelineStages.name,
        stageColor: pipelineStages.color,
        lastActivity: lastActivityMs.mapWith(toDate),
        nextTaskDue: nextTaskDueMs.mapWith(toDate),
      })
      .from(contacts)
      .leftJoin(pipelineStages, eq(contacts.stageId, pipelineStages.id))
      .where(where)
      .orderBy(desc(contacts.createdAt))
      .limit(CONTACTS_PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(contacts).where(where),
  ]);

  return { rows, total, page: Math.max(1, page), pageCount: Math.max(1, Math.ceil(total / CONTACTS_PAGE_SIZE)) };
}

/** KPI cards above the contacts list. */
export async function getContactStats() {
  await requireCoach();
  const [[open], [all], [won]] = await Promise.all([
    db
      .select({
        value: sql<string>`coalesce(sum(${contacts.estimatedValue}), 0)`,
        avg: sql<string>`coalesce(avg(${contacts.estimatedValue}), 0)`,
        n: count(),
      })
      .from(contacts)
      .leftJoin(pipelineStages, eq(contacts.stageId, pipelineStages.id))
      .where(sql`coalesce(${pipelineStages.isClient}, false) = false`),
    db.select({ n: count() }).from(contacts),
    db.select({ n: count() }).from(clients),
  ]);
  return {
    openPipelineValue: Number(open.value),
    averageValue: Number(open.avg),
    openCount: open.n,
    conversionRate: all.n ? won.n / all.n : 0,
  };
}

/** All contacts matching the filters, for CSV export. */
export async function exportContacts(filters: { q?: string; stage?: string }) {
  await requireCoach();
  return db
    .select({
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
      stageName: pipelineStages.name,
      source: contacts.source,
      estimatedValue: contacts.estimatedValue,
      tags: contacts.tags,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .leftJoin(pipelineStages, eq(contacts.stageId, pipelineStages.id))
    .where(contactFilters(filters))
    .orderBy(desc(contacts.createdAt));
}

export async function getContact(id: string) {
  await requireCoach();
  return db.query.contacts.findFirst({
    where: eq(contacts.id, id),
    with: {
      stage: true,
      tasks: { orderBy: (t, { asc }) => asc(t.dueAt) },
      sessions: {
        orderBy: (s, { desc }) => desc(s.startsAt),
        with: { note: true },
      },
      client: {
        with: {
          goals: { orderBy: (g, { asc }) => asc(g.createdAt) },
          packages: { with: { package: true }, orderBy: (p, { desc }) => desc(p.purchasedAt) },
          documents: { orderBy: (d, { desc }) => desc(d.createdAt) },
        },
      },
    },
  });
}

export async function getContactTimeline(id: string) {
  await requireCoach();
  return buildTimeline(id, 30);
}

export async function getPipeline() {
  await requireCoach();
  const [stages, rows] = await Promise.all([
    db.query.pipelineStages.findMany({ orderBy: asc(pipelineStages.position) }),
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        source: contacts.source,
        stageId: contacts.stageId,
        stageChangedAt: contacts.stageChangedAt,
        estimatedValue: contacts.estimatedValue,
        tags: contacts.tags,
        nextTaskDue: nextTaskDueMs.mapWith(toDate),
      })
      .from(contacts)
      .orderBy(desc(contacts.updatedAt)),
  ]);
  return { stages, contacts: rows };
}

export type PipelineContact = Awaited<ReturnType<typeof getPipeline>>["contacts"][number];
export type Stage = Awaited<ReturnType<typeof getStages>>[number];
export type ContactRow = Awaited<ReturnType<typeof listContacts>>["rows"][number];
