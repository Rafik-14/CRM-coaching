"use server";

import { refresh } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { emailTemplates } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { renderEmail } from "@/server/email/layout";
import { bookingConfirmation, sessionReminder } from "@/server/email/messages";
import { getTemplate } from "@/server/email/templates";
import { templateContent } from "@/server/sequences";
import { appUrl } from "@/server/email/config";
import { SAMPLE_VARS, TEMPLATE_DEFS, TEMPLATE_KEYS, templateFormSchema, type TemplateKey, type TemplateText } from "@/lib/email-templates";
import type { ActionState } from "./coaching";

const keySchema = z.enum(TEMPLATE_KEYS);

export async function saveEmailTemplate(key: TemplateKey, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const k = keySchema.parse(key);
  const parsed = templateFormSchema(k).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  const { enabled } = await getTemplate(k);
  await db
    .insert(emailTemplates)
    .values({ key: k, ...parsed.data, enabled })
    .onConflictDoUpdate({
      target: emailTemplates.key,
      set: { subject: sql`excluded.subject`, heading: sql`excluded.heading`, body: sql`excluded.body` },
    });
  refresh();
  return { ok: true };
}

/** Back to the original wording (keeps on / off). */
export async function resetEmailTemplate(key: TemplateKey): Promise<ActionState> {
  await requireCoach();
  const k = keySchema.parse(key);
  const { enabled } = await getTemplate(k);
  if (enabled) {
    await db.delete(emailTemplates).where(eq(emailTemplates.key, k));
  } else {
    const def = TEMPLATE_DEFS[k];
    await db
      .update(emailTemplates)
      .set({ subject: def.subject, heading: def.heading, body: def.body })
      .where(eq(emailTemplates.key, k));
  }
  refresh();
  return { ok: true };
}

export async function setEmailTemplateEnabled(key: TemplateKey, enabled: boolean): Promise<ActionState> {
  await requireCoach();
  const k = keySchema.parse(key);
  const { text } = await getTemplate(k);
  await db
    .insert(emailTemplates)
    .values({ key: k, ...text, enabled: z.boolean().parse(enabled) })
    .onConflictDoUpdate({ target: emailTemplates.key, set: { enabled: sql`excluded.enabled` } });
  refresh();
  return { ok: true };
}

/** Live preview with an example contact; the wording being edited is used even if not saved yet. */
export async function previewEmailTemplate(key: TemplateKey, text: TemplateText): Promise<{ subject: string; html: string }> {
  await requireCoach();
  const k = keySchema.parse(key);
  const t = z.object({ subject: z.string().max(200), heading: z.string().max(200), body: z.string().max(5000) }).parse(text);
  const startsAt = new Date(Date.now() + 23 * 3_600_000);
  const sample = { sessionId: "exemple", firstName: SAMPLE_VARS.prenom, startsAt, durationMin: 60, location: "Visio", manageUrl: `${appUrl()}/rdv/exemple`, cancellationHours: 12 };
  const mail =
    k === "booking_confirmation"
      ? bookingConfirmation({ ...sample, durationMin: 20 }, t)
      : k === "session_reminder_24h" || k === "session_reminder_1h"
        ? sessionReminder(
            {
              ...sample,
              kind: k === "session_reminder_1h" ? "1h" : "24h",
              startsAt: k === "session_reminder_1h" ? new Date(Date.now() + 3_600_000) : startsAt,
              type: "Séance individuelle",
              now: new Date(),
            },
            t,
          )
        : templateContent(t, SAMPLE_VARS, TEMPLATE_DEFS[k].essential ? undefined : `${appUrl()}/preferences/exemple`);
  return { subject: mail.subject, html: renderEmail(mail.content).html };
}
