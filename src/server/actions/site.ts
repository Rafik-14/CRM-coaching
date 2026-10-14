"use server";

import { z } from "zod";
import { contactFormSchema, formValues, type SiteFormState } from "@/lib/validations/site";
import { clientIp, rateLimited } from "@/server/rate-limit";
import { recordSiteMessage } from "@/server/site-leads";

/** Public contact form (/contact) → contact + task in the CRM. No session: honeypot + rate limit instead. */
export async function sendContactMessage(_prev: SiteFormState, formData: FormData): Promise<SiteFormState> {
  if (rateLimited(`contact:${await clientIp()}`)) {
    return { error: "Trop d’envois en peu de temps. Merci de réessayer dans une minute.", values: formValues(formData) };
  }
  const parsed = contactFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: formValues(formData) };
  const v = parsed.data;
  // Honeypot filled: pretend it worked so bots do not retry.
  if (v.website) return { ok: true };

  await recordSiteMessage(
    {
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      phone: v.phone,
      segment: v.segment,
      subSegment: v.segment === "particulier" ? v.subSegment : null,
      cta: v.source ? `Contact (${v.source})` : "Contact",
    },
    v.message,
  );
  return { ok: true };
}
