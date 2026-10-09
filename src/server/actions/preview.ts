"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { contacts } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { buildTimeline } from "@/server/queries/timeline";

/** Data for the contact quick-view slide-over (fetched when the panel opens). */
export async function getContactPreview(id: string) {
  await requireCoach();
  const contactId = z.uuid().parse(id);

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
    with: {
      stage: true,
      client: { with: { packages: { with: { package: true } } } },
      sessions: { where: (s, { eq }) => eq(s.status, "planned"), orderBy: (s, { asc }) => asc(s.startsAt) },
    },
  });
  if (!contact) return null;

  const timeline = await buildTimeline(contactId, 8);
  const now = new Date();
  const nextSession = contact.sessions.find((s) => s.startsAt >= now) ?? null;
  const pkg = contact.client?.packages.at(-1) ?? null;

  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    source: contact.source,
    tags: contact.tags,
    stage: contact.stage ? { name: contact.stage.name, color: contact.stage.color } : null,
    stageChangedAt: contact.stageChangedAt,
    estimatedValue: contact.estimatedValue,
    client: contact.client
      ? {
          status: contact.client.status,
          startDate: contact.client.startDate,
          mainGoal: contact.client.mainGoal,
          closeReason: contact.client.closeReason,
        }
      : null,
    nextSession: nextSession
      ? { startsAt: nextSession.startsAt, type: nextSession.type, location: nextSession.location }
      : null,
    package: pkg
      ? {
          name: pkg.package.name,
          used: pkg.sessionsUsed,
          total: pkg.package.sessionsCount,
          price: pkg.package.price,
          paymentStatus: pkg.paymentStatus,
        }
      : null,
    timeline,
  };
}

export type ContactPreview = NonNullable<Awaited<ReturnType<typeof getContactPreview>>>;
