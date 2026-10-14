import { z } from "zod";
import { SEGMENT_VALUES, SUB_SEGMENT_VALUES } from "@/lib/jg";

/** Public website forms (contact, online booking). Messages are in French: they are shown to visitors. */

const name = (label: string) => z.string().trim().min(1, `${label} est obligatoire.`).max(80, "80 caractères maximum.");

export const visitorFields = {
  firstName: name("Le prénom"),
  lastName: name("Le nom"),
  email: z.email("Adresse e-mail invalide.").trim().toLowerCase().max(200),
  phone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[+()\d\s.-]*$/, "Numéro de téléphone invalide.")
    .optional()
    .transform((v) => v || null),
  /** « Vous êtes » — JG® audience; empty when the visitor does not say. */
  segment: z
    .union([z.literal(""), z.enum(SEGMENT_VALUES)])
    .optional()
    .transform((v) => v || null),
  subSegment: z
    .union([z.literal(""), z.enum(SUB_SEGMENT_VALUES)])
    .optional()
    .transform((v) => v || null),
  /** Page / button the visitor came from (?source=…). */
  source: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/)
    .optional()
    .catch(undefined),
  consent: z.literal("on", "Merci d’accepter la politique de confidentialité."),
  /** Honeypot: real visitors leave it empty. */
  website: z.string().max(500).optional(),
};

export const contactFormSchema = z.object({
  ...visitorFields,
  message: z.string().trim().min(1, "Votre message est vide.").max(4000, "4 000 caractères maximum."),
});

export type SiteFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** What the visitor typed, sent back so the form keeps it after an error (React resets forms after an action). */
  values?: Record<string, string>;
};

/** Text fields of a submitted form, to echo back in SiteFormState.values. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && key !== "website" && !key.startsWith("$")) values[key] = value.slice(0, 4000);
  }
  return values;
}
