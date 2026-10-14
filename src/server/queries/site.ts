import "server-only";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/server/db";
import { clients, packages } from "@/server/db/schema";

/**
 * Public website data, read from the CRM. Cached; the CRM actions that change it call
 * updateTag(SITE_OFFERS_TAG / SITE_CASES_TAG) so the site shows the change at once.
 * Callers render these inside <Suspense> after `await connection()`, so the build never needs the database.
 */
export const SITE_OFFERS_TAG = "site-offers";
export const SITE_CASES_TAG = "site-cases";

export type PublicOffer = {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  sessionsCount: number;
  priceEur: number;
  priceChf: number | null;
  includes: string[];
};

/** Active offers (« Accompagnements »), in display order. */
export async function getPublicOffers(): Promise<PublicOffer[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(SITE_OFFERS_TAG);
  const rows = await db.query.packages.findMany({
    where: eq(packages.active, true),
    orderBy: [asc(packages.position), asc(packages.sessionsCount)],
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    sessionsCount: p.sessionsCount,
    priceEur: Number(p.price),
    priceChf: p.priceChf == null ? null : Number(p.priceChf),
    includes: p.includes,
  }));
}

export type PublicCaseStudy = {
  id: string;
  firstName: string;
  stake: string | null;
  positioningStatement: string | null;
  before: string | null;
  trigger: string | null;
  after: string | null;
  changes: string[];
};

/**
 * Case studies of finished coachings whose client agreed to be shown (testimonial consent).
 * Only the first name and the stake are published — never the last name, e-mail or organisation.
 */
export async function getPublicCaseStudies(): Promise<PublicCaseStudy[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(SITE_CASES_TAG);
  const rows = await db.query.clients.findMany({
    where: and(eq(clients.status, "finished"), eq(clients.testimonialConsent, true), isNotNull(clients.caseStudy)),
    with: { contact: { columns: { firstName: true, stake: true } } },
    orderBy: desc(clients.closedAt),
    limit: 6,
  });
  return rows
    .map((c) => ({
      id: c.id,
      firstName: c.contact.firstName,
      stake: c.contact.stake,
      positioningStatement: c.positioningStatement,
      before: c.caseStudy?.before ?? null,
      trigger: c.caseStudy?.trigger ?? null,
      after: c.caseStudy?.after ?? null,
      changes: c.caseStudy?.changes ?? [],
    }))
    .filter((c) => c.before || c.trigger || c.after || c.changes.length > 0);
}
