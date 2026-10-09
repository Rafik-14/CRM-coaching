import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est obligatoire").max(80),
  lastName: z.string().trim().max(80).default(""),
  email: z
    .union([z.literal(""), z.email("Adresse e-mail invalide").trim().toLowerCase()])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  phone: optionalText(40),
  source: optionalText(80),
  stageId: z
    .union([z.literal(""), z.uuid()])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  estimatedValue: z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v.replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
        ctx.addIssue({ code: "custom", message: "Montant invalide" });
        return z.NEVER;
      }
      return n.toFixed(2);
    }),
  tags: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10),
    ),
  notes: optionalText(5000),
});

export type ContactInput = z.input<typeof contactSchema>;
