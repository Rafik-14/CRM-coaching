import { z } from "zod";

/** Méthode JG®: every relationship starts with a free 20-minute « Échange stratégique ». */
export const DISCOVERY_TYPE = "Échange stratégique";
export const SESSION_TYPES = ["Séance individuelle", DISCOVERY_TYPE, "Bilan", "Intervention"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];
export const SESSION_LOCATIONS = ["Visio", "Cabinet", "Téléphone"] as const;
export const SESSION_DURATIONS = [20, 30, 45, 60, 90, 120] as const;
/** Default duration (minutes) when a type is picked; « Intervention » = B2B workshop / talk. */
export const DEFAULT_DURATION: Record<SessionType, (typeof SESSION_DURATIONS)[number]> = {
  "Séance individuelle": 60,
  [DISCOVERY_TYPE]: 20,
  Bilan: 60,
  Intervention: 120,
};

export const scheduleSessionSchema = z.object({
  contactId: z.uuid(),
  date: z.iso.date("Choisissez une date."),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choisissez un horaire."),
  durationMin: z.coerce
    .number()
    .refine((n) => (SESSION_DURATIONS as readonly number[]).includes(n), "Durée invalide"),
  type: z.enum(SESSION_TYPES),
  location: z.enum(SESSION_LOCATIONS),
  agenda: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || null),
  /** Browser time zone offset in minutes (Date.getTimezoneOffset()), so the slot is saved at the right instant. */
  tzOffset: z.coerce.number().int().min(-840).max(840),
});

export const CLOSE_OUTCOMES = {
  finished: { label: "Terminé avec succès", description: "Objectifs atteints, accompagnement clôturé" },
  paused: { label: "En pause", description: "Reprise possible plus tard" },
  stopped: { label: "Arrêté", description: "Le client a mis fin à l'accompagnement" },
} as const;

export const CLOSE_REASONS = {
  finished: ["Objectifs atteints", "Forfait terminé", "Autonomie acquise"],
  paused: ["Raisons personnelles", "Raisons financières", "Manque de disponibilité"],
  stopped: ["Raisons financières", "Ne correspond pas aux attentes", "Changement de situation", "Sans nouvelles"],
} as const;

export const closeCoachingSchema = z
  .object({
    contactId: z.uuid(),
    outcome: z.enum(["finished", "paused", "stopped"], "Choisissez un résultat."),
    reason: z.string().trim().min(1, "Choisissez une raison.").max(200),
    note: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((v) => v || null),
  })
  .refine(
    (v) => (CLOSE_REASONS[v.outcome] as readonly string[]).includes(v.reason),
    { message: "Raison invalide", path: ["reason"] },
  );
