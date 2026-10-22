import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { activityLog, contacts, pipelineStages, tasks } from "@/server/db/schema";
import { currencyFor } from "@/server/business";
import type { Segment, SubSegment } from "@/lib/jg";
import { formatDate } from "@/lib/format";

/**
 * Leads coming from the public website (contact form, online booking, the old site's form endpoint).
 * Finds the contact by e-mail or creates it in the first pipeline stage.
 */
export type SiteLead = {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string | null;
  segment?: Segment | null;
  subSegment?: SubSegment | null;
  stake?: string | null;
  /** Label of the page / button the visitor came from (« Site web · <cta> »). */
  cta?: string | null;
  /** Overrides « Site web · <cta> » (e.g. « Événement · <titre> »). */
  source?: string | null;
};

export async function findOrCreateSiteContact(lead: SiteLead, note?: string | null) {
  // Case-insensitive: « Marie.Dupont@… » typed in the CRM is the same person as « marie.dupont@… » from the site.
  const existing = await db.query.contacts.findFirst({ where: sql`lower(${contacts.email}) = ${lead.email.trim().toLowerCase()}` });
  if (existing) {
    // Keep what the coach already entered; only fill gaps and keep the message in the notes.
    await db
      .update(contacts)
      .set({
        phone: existing.phone ?? lead.phone ?? null,
        segment: existing.segment ?? lead.segment ?? null,
        subSegment: existing.subSegment ?? lead.subSegment ?? null,
        stake: existing.stake ?? lead.stake ?? null,
        ...(note && { notes: [existing.notes, note].filter(Boolean).join("\n\n") }),
      })
      .where(eq(contacts.id, existing.id));
    return { contactId: existing.id, created: false };
  }

  const firstStage = await db.query.pipelineStages.findFirst({ orderBy: asc(pipelineStages.position) });
  const [created] = await db
    .insert(contacts)
    .values({
      firstName: lead.firstName,
      lastName: lead.lastName ?? "",
      email: lead.email,
      phone: lead.phone || null,
      source: lead.source ?? (lead.cta ? `Site web · ${lead.cta}` : "Site web"),
      segment: lead.segment ?? null,
      subSegment: lead.subSegment ?? null,
      stake: lead.stake ?? null,
      currency: await currencyFor(null),
      stageId: firstStage?.id ?? null,
      notes: note || null,
    })
    .returning({ id: contacts.id });
  return { contactId: created.id, created: true };
}

/** Website message → contact + « Rappeler » task + history entry. */
export async function recordSiteMessage(lead: SiteLead, message?: string | null) {
  const note = message ? `Message du site (${formatDate(new Date())}) : ${message}` : null;
  const { contactId, created } = await findOrCreateSiteContact(lead, note);
  await db.insert(tasks).values({
    title: created ? `Rappeler ${lead.firstName} (formulaire du site)` : `Nouveau message de ${lead.firstName} via le site`,
    dueAt: new Date(),
    contactId,
  });
  await db.insert(activityLog).values({
    entity: "contact",
    entityId: contactId,
    action: created ? "created_from_site" : "site_form_message",
  });
  return { contactId, created };
}
