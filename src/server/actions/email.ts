"use server";

import { refresh } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { settings } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { sendEmail } from "@/server/email/send";
import { EMAIL_SETTINGS_KEY, testEmail } from "@/server/email/messages";
import { mailConfig } from "@/server/email/config";
import type { ActionState } from "./coaching";

const emailSettingsSchema = z.object({
  notifyTo: z
    .union([z.literal(""), z.email("Adresse e-mail invalide.").trim().toLowerCase().max(200)])
    .optional()
    .transform((v) => v || null),
});

/** Where the coach receives « nouvelle réservation » / « nouveau message » notifications. */
export async function saveEmailSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const parsed = emailSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  await db
    .insert(settings)
    .values({ key: EMAIL_SETTINGS_KEY, value: parsed.data })
    .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value` } });
  refresh();
  return { ok: true };
}

/** Sends the test e-mail right away (not in after()) so the coach sees the result. */
export async function sendTestEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const parsed = z.email("Adresse e-mail invalide.").trim().toLowerCase().safeParse(formData.get("to"));
  if (!parsed.success) return { fieldErrors: { to: [parsed.error.issues[0].message] } };
  const result = await sendEmail({ ...testEmail(), to: parsed.data, templateKey: "test" });
  refresh();
  if (!result.ok) return { error: "L’envoi a échoué : voir le détail dans la liste ci-dessous." };
  const c = mailConfig();
  return {
    ok: true,
    message: c.configured
      ? `E-mail envoyé à ${c.redirectTo ?? parsed.data}.`
      : "Mode test : l’e-mail est enregistré mais n’a pas été envoyé (SMTP non configuré).",
  };
}
