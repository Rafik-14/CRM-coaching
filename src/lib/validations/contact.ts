import { z } from "zod";
import { SEGMENT_VALUES, SUB_SEGMENT_VALUES } from "@/lib/jg";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

/** Select with an empty option ("" or "none") → null. */
const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z
    .union([z.literal(""), z.literal("none"), z.enum(values)])
    .optional()
    .transform((v) => (v && v !== "none" ? (v as T[number]) : null));

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
  // JG® profile
  segment: optionalEnum(SEGMENT_VALUES),
  subSegment: optionalEnum(SUB_SEGMENT_VALUES),
  organization: optionalText(120),
  referredByContactId: z
    .union([z.literal(""), z.literal("none"), z.uuid()])
    .optional()
    .transform((v) => (v && v !== "none" ? v : null)),
  country: optionalEnum(["FR", "CH"]),
  currency: z.enum(["EUR", "CHF"]).optional(),
  stake: optionalText(60),
  /** Date only (YYYY-MM-DD), stored at noon UTC so it never shifts to the day before. */
  keyMomentAt: z
    .union([z.literal(""), z.iso.date("Date invalide")])
    .optional()
    .transform((v) => (v ? new Date(`${v}T12:00:00Z`) : null)),
});

export type ContactInput = z.input<typeof contactSchema>;
