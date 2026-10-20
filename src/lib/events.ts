import { z } from "zod";
import { visitorFields } from "@/lib/validations/site";
import { zonedTimeToUtc } from "@/lib/booking";
import { APP_TIME_ZONE } from "@/lib/format";

/**
 * Conferences & workshops (docs/EVENTS-PLAN.md): labels, form rules and small pure helpers shared by the CRM,
 * the public pages and the tests. No payment: `priceText` is information only.
 */

export const EVENT_KINDS = ["conference", "workshop"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export const EVENT_KIND_LABEL: Record<EventKind, string> = { conference: "Conférence", workshop: "Atelier" };

export const EVENT_AUDIENCES = ["tous", "entreprises", "ecoles", "associations"] as const;
export type EventAudience = (typeof EVENT_AUDIENCES)[number];
export const EVENT_AUDIENCE_LABEL: Record<EventAudience, string> = {
  tous: "Tout public",
  entreprises: "Entreprises",
  ecoles: "Écoles",
  associations: "Associations",
};

export const EVENT_STATUSES = ["draft", "published", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
export const EVENT_STATUS_LABEL: Record<EventStatus, string> = { draft: "Brouillon", published: "Publié", cancelled: "Annulé" };

export const REGISTRATION_STATUSES = ["confirmed", "waitlist", "cancelled"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  confirmed: "Inscrit",
  waitlist: "Liste d’attente",
  cancelled: "Annulé",
};

/** « Plus que 4 places » is shown under this number of free seats. */
export const FEW_SEATS = 5;
/** Largest photo side kept after upload (pixels). */
export const PHOTO_MAX_SIDE = 1800;
export const PHOTO_MAX_BYTES = 15 * 1024 * 1024;

/** « Conférence : Révéler sa valeur » → « revéler-sa-valeur-2026-11-12 » without accents. */
export function eventSlug(title: string, startsAt: Date) {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "");
  return `${base || "evenement"}-${startsAt.toISOString().slice(0, 10)}`;
}

/** Free seats (null = no limit). Never negative. */
export function freeSeats(capacity: number | null, taken: number) {
  return capacity == null ? null : Math.max(0, capacity - taken);
}

/** The upcoming/past split: an event is « past » once it has ended. */
export const isPast = (e: { endsAt: Date }, now: Date) => e.endsAt.getTime() <= now.getTime();

/** Online registration is possible: published, open, not started, not cancelled, not a history entry. */
export function canRegister(
  e: { status: string; registrationOpen: boolean; startsAt: Date; manualHistory: boolean },
  now: Date,
) {
  return e.status === "published" && e.registrationOpen && !e.manualHistory && e.startsAt.getTime() > now.getTime();
}

// ------------------------------------------------------------------ CRM form

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum.`)
    .optional()
    .transform((v) => v || null);
const optionalInt = (min: number, max: number) =>
  z
    .union([z.literal(""), z.coerce.number().int().min(min, `Minimum ${min}.`).max(max, `Maximum ${max}.`)])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v));
const checkbox = z
  .union([z.literal("on"), z.literal("")])
  .optional()
  .transform((v) => v === "on");

export const eventFormSchema = z
  .object({
    kind: z.enum(EVENT_KINDS),
    title: z.string().trim().min(1, "Le titre est obligatoire.").max(140, "140 caractères maximum."),
    summary: optionalText(300),
    description: optionalText(6000),
    date: z.iso.date("Choisissez une date."),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de début invalide."),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de fin invalide."),
    location: optionalText(300),
    onlineUrl: z
      .union([z.literal(""), z.url("Lien invalide (il doit commencer par https://).").max(500)])
      .optional()
      .transform((v) => v || null),
    capacity: optionalInt(1, 5000),
    maxSeatsPerBooking: z.coerce.number().int().min(1).max(20).default(4),
    priceText: optionalText(120),
    partner: optionalText(160),
    audience: z
      .union([z.literal(""), z.enum(EVENT_AUDIENCES)])
      .optional()
      .transform((v) => v || null),
    registrationOpen: checkbox,
    waitlistEnabled: checkbox,
    manualHistory: checkbox,
  })
  .refine((v) => v.endTime > v.startTime, { path: ["endTime"], message: "La fin doit être après le début." });
export type EventFormValues = z.infer<typeof eventFormSchema>;

/** Date + times typed in Paris time → UTC instants. */
export function eventTimes(v: { date: string; startTime: string; endTime: string }) {
  const [y, m, d] = v.date.split("-").map(Number);
  const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return {
    startsAt: zonedTimeToUtc(y, m, d, minutes(v.startTime), APP_TIME_ZONE),
    endsAt: zonedTimeToUtc(y, m, d, minutes(v.endTime), APP_TIME_ZONE),
  };
}

export const recapFormSchema = z.object({
  recap: optionalText(6000),
  participantsShown: optionalInt(1, 100000),
  videoUrl: z
    .union([z.literal(""), z.url("Lien invalide.").max(500)])
    .optional()
    .transform((v) => v || null),
  showRecap: checkbox,
});

export const quoteFormSchema = z.object({
  text: z.string().trim().min(1, "Le témoignage est vide.").max(800, "800 caractères maximum."),
  author: optionalText(120),
});

/** CRM: add someone to the list by hand (phone call, e-mail…). */
export const manualRegistrationSchema = z.object({
  firstName: visitorFields.firstName,
  lastName: z.string().trim().max(80).optional().transform((v) => v ?? ""),
  email: visitorFields.email,
  phone: visitorFields.phone,
  company: optionalText(160),
  seats: z.coerce.number().int().min(1, "Au moins 1 place.").max(50),
});

// ------------------------------------------------------------------ public form

export const eventRegistrationSchema = z.object({
  firstName: visitorFields.firstName,
  lastName: visitorFields.lastName,
  email: visitorFields.email,
  phone: visitorFields.phone,
  company: optionalText(160),
  seats: z.coerce.number().int().min(1).max(20).default(1),
  consent: visitorFields.consent,
  website: visitorFields.website,
});

/** Date and time of an instant as typed in the forms (Paris time): { date: "2026-11-12", time: "18:30" }. */
export function parisInputs(d: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
