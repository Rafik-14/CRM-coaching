import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const optionalDate = z
  .union([z.literal(""), z.iso.date("Date invalide")])
  .optional()
  .transform((v) => (v ? new Date(`${v}T12:00:00`) : null));

// ---------------------------------------------------------------- sessions

export const SESSION_STATUSES = ["planned", "done", "cancelled", "no_show"] as const;
export const sessionStatusLabel: Record<(typeof SESSION_STATUSES)[number], string> = {
  planned: "Prévue",
  done: "Effectuée",
  cancelled: "Annulée",
  no_show: "Absent",
};

export const rescheduleSchema = z.object({
  sessionId: z.uuid(),
  date: z.iso.date("Choisissez une date."),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choisissez un horaire."),
  tzOffset: z.coerce.number().int().min(-840).max(840),
});

/** Template answers arrive as `f:<label>` fields. */
export function parseNoteForm(formData: FormData) {
  const templateData: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("f:") && typeof value === "string" && value.trim()) {
      templateData[key.slice(2).slice(0, 80)] = value.trim().slice(0, 4000);
    }
  }
  const base = z
    .object({
      sessionId: z.uuid(),
      content: optionalText(8000),
      nextSteps: optionalText(2000),
    })
    .safeParse(Object.fromEntries(formData));
  return base.success ? { success: true as const, data: { ...base.data, templateData } } : base;
}

// ---------------------------------------------------------------- goals

export const GOAL_STATUSES = ["active", "achieved", "abandoned"] as const;
export const goalStatusLabel = { active: "En cours", achieved: "Atteint", abandoned: "Abandonné" } as const;

export const goalSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire").max(200),
  description: optionalText(2000),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  status: z.enum(GOAL_STATUSES).default("active"),
  dueDate: optionalDate,
});

// ---------------------------------------------------------------- tasks

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire").max(200),
  dueAt: optionalDate,
  contactId: z
    .union([z.literal(""), z.literal("none"), z.uuid()])
    .optional()
    .transform((v) => (v && v !== "none" ? v : null)),
});

// ---------------------------------------------------------------- packages

export const PAYMENT_STATUSES = ["pending", "partial", "paid"] as const;
export const paymentLabel = { pending: "En attente", partial: "Partiel", paid: "Payé" } as const;

export const assignPackageSchema = z.object({
  contactId: z.uuid(),
  packageId: z.uuid("Choisissez un forfait."),
  paymentStatus: z.enum(PAYMENT_STATUSES).default("pending"),
});

// ---------------------------------------------------------------- settings

export const STAGE_COLORS = ["slate", "blue", "amber", "emerald", "violet", "rose"] as const;

export const stageSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire").max(60),
  color: z.enum(STAGE_COLORS).default("slate"),
  isClient: z
    .union([z.literal("on"), z.literal("true"), z.literal("")])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export const packageSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire").max(80),
  sessionsCount: z.coerce.number().int().min(1, "Au moins 1 séance").max(200),
  price: z.coerce.number().min(0).max(100_000).transform((n) => n.toFixed(2)),
});

export const noteTemplateSchema = z.object({
  fields: z
    .string()
    .transform((v) =>
      v
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 12),
    )
    .refine((a) => a.length > 0, "Ajoutez au moins une rubrique.")
    .refine((a) => a.every((f) => f.length <= 80), "80 caractères maximum par rubrique."),
});

export const businessSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire").max(120),
  currency: z.enum(["EUR", "CHF"]).default("EUR"),
});

// ---------------------------------------------------------------- website form (webhook)

export const siteFormSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().default(""),
  email: z.email().trim().toLowerCase().max(200),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().max(4000).optional(),
  /** Honeypot: real visitors leave it empty (checked by the route, which then fakes success). */
  website: z.string().max(500).optional(),
});
