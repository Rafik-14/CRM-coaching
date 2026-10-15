import { z } from "zod";
import { SESSION_LOCATIONS } from "@/lib/validations/coaching";

/**
 * Online booking of the « Échange stratégique » (website /reserver).
 * Availability is a weekly pattern in the coach's time zone, stored in the settings row « booking ».
 */

export type TimeRange = { start: string; end: string };

export type BookingSettings = {
  enabled: boolean;
  /** Index 0 = Sunday … 6 = Saturday (Date.getUTCDay()). */
  weekly: TimeRange[][];
  slotMinutes: number;
  /** Free time kept before and after every appointment. */
  bufferMinutes: number;
  /** No booking sooner than this. */
  minNoticeHours: number;
  /** How far ahead visitors can book. */
  horizonDays: number;
  location: (typeof SESSION_LOCATIONS)[number];
  /** Visitors can cancel or move from the /rdv link until this many hours before the appointment. */
  cancellationHours: number;
};

const WORKDAY: TimeRange[] = [
  { start: "09:00", end: "12:00" },
  { start: "14:00", end: "18:00" },
];

export const DEFAULT_BOOKING: BookingSettings = {
  enabled: true,
  weekly: [[], WORKDAY, WORKDAY, WORKDAY, WORKDAY, WORKDAY, []],
  slotMinutes: 20,
  bufferMinutes: 10,
  minNoticeHours: 24,
  horizonDays: 30,
  location: "Visio",
  cancellationHours: 12,
};

/** Monday first, as in France / Switzerland. */
export const WEEKDAYS = [
  { index: 1, label: "Lundi" },
  { index: 2, label: "Mardi" },
  { index: 3, label: "Mercredi" },
  { index: 4, label: "Jeudi" },
  { index: 5, label: "Vendredi" },
  { index: 6, label: "Samedi" },
  { index: 0, label: "Dimanche" },
] as const;

export const SLOT_LENGTHS = [20, 30, 45, 60] as const;
export const BUFFERS = [0, 5, 10, 15, 30] as const;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** « 09:00-12:00, 14:00-18:00 » ⇄ ranges. */
export function formatRanges(ranges: TimeRange[]) {
  return ranges.map((r) => `${r.start}-${r.end}`).join(", ");
}

const rangeText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((text, ctx) => {
    // A missing or empty day = no appointments that day.
    if (!text) return [] as TimeRange[];
    const ranges: TimeRange[] = [];
    for (const part of text.split(/[,;]/).map((p) => p.trim()).filter(Boolean)) {
      const m = part.match(/^([01]?\d|2[0-3])[:hH]([0-5]\d)\s*[-–à]\s*([01]?\d|2[0-3])[:hH]([0-5]\d)$/);
      if (!m) {
        ctx.addIssue({ code: "custom", message: `« ${part} » : écrivez par exemple 09:00-12:00.` });
        return z.NEVER;
      }
      const range = { start: `${m[1].padStart(2, "0")}:${m[2]}`, end: `${m[3].padStart(2, "0")}:${m[4]}` };
      if (toMinutes(range.end) <= toMinutes(range.start)) {
        ctx.addIssue({ code: "custom", message: `« ${part} » : l’heure de fin doit suivre l’heure de début.` });
        return z.NEVER;
      }
      ranges.push(range);
    }
    return ranges.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  });

const checkbox = z
  .union([z.literal("on"), z.literal("")])
  .optional()
  .transform((v) => v === "on");

/** Settings form (CRM › Paramètres › Réservation en ligne): fields day0…day6 hold the ranges as text. */
export const bookingSettingsSchema = z
  .object({
    enabled: checkbox,
    day0: rangeText,
    day1: rangeText,
    day2: rangeText,
    day3: rangeText,
    day4: rangeText,
    day5: rangeText,
    day6: rangeText,
    slotMinutes: z.coerce.number().refine((n) => (SLOT_LENGTHS as readonly number[]).includes(n), "Durée invalide"),
    bufferMinutes: z.coerce.number().refine((n) => (BUFFERS as readonly number[]).includes(n), "Pause invalide"),
    minNoticeHours: z.coerce.number().int("Nombre entier").min(0).max(24 * 14, "14 jours maximum"),
    horizonDays: z.coerce.number().int("Nombre entier").min(1, "Au moins 1 jour").max(120, "120 jours maximum"),
    location: z.enum(SESSION_LOCATIONS),
    cancellationHours: z.preprocess(
      (v) => (v === undefined || v === "" ? DEFAULT_BOOKING.cancellationHours : v),
      z.coerce.number().int("Nombre entier").min(0).max(24 * 7, "7 jours maximum"),
    ),
  })
  .transform(({ day0, day1, day2, day3, day4, day5, day6, ...rest }) => ({
    ...rest,
    weekly: [day0, day1, day2, day3, day4, day5, day6],
  }));

/** Reads the stored JSON safely (missing keys fall back to the defaults). */
export function normalizeBookingSettings(value: unknown): BookingSettings {
  const v = (value ?? {}) as Partial<BookingSettings>;
  const weekly =
    Array.isArray(v.weekly) && v.weekly.length === 7
      ? v.weekly.map((day) => (Array.isArray(day) ? day.filter((r) => r && /^\d\d:\d\d$/.test(r.start) && /^\d\d:\d\d$/.test(r.end)) : []))
      : DEFAULT_BOOKING.weekly;
  return {
    enabled: v.enabled ?? DEFAULT_BOOKING.enabled,
    weekly,
    slotMinutes: v.slotMinutes ?? DEFAULT_BOOKING.slotMinutes,
    bufferMinutes: v.bufferMinutes ?? DEFAULT_BOOKING.bufferMinutes,
    minNoticeHours: v.minNoticeHours ?? DEFAULT_BOOKING.minNoticeHours,
    horizonDays: v.horizonDays ?? DEFAULT_BOOKING.horizonDays,
    location: (SESSION_LOCATIONS as readonly string[]).includes(v.location ?? "") ? v.location! : DEFAULT_BOOKING.location,
    cancellationHours: v.cancellationHours ?? DEFAULT_BOOKING.cancellationHours,
  };
}

// ------------------------------------------------------------------ time zone helpers

/** Calendar date and wall-clock time of an instant in a time zone. */
function zonedParts(ts: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(ts);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

/** Wall-clock time in `timeZone` → exact instant (handles summer / winter time). */
export function zonedTimeToUtc(year: number, month: number, day: number, minutes: number, timeZone: string) {
  const wall = Date.UTC(year, month - 1, day, 0, minutes);
  const offsetAt = (ts: number) => {
    const p = zonedParts(ts, timeZone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(ts / 60_000) * 60_000;
  };
  let ts = wall - offsetAt(wall);
  const second = offsetAt(ts);
  if (wall - second !== ts) ts = wall - second;
  return new Date(ts);
}

// ------------------------------------------------------------------ slots

export type Interval = { start: Date; end: Date };
export type AvailableDay = { date: string; slots: string[] };

/** One-off change to the weekly hours: days off / blocked hours, or extra opening hours (dates inclusive). */
export type AvailabilityException = {
  kind: "blocked" | "extra";
  startsOn: string;
  endsOn: string;
  /** Both null = the whole day. */
  startTime: string | null;
  endTime: string | null;
};

/** Longer appointments (client sessions) start every 30 minutes; short ones keep « length + pause ». */
const MAX_STEP = 30;

/**
 * Free slots from the weekly pattern plus extra hours, minus days off / blocked hours, minus busy time
 * (planned sessions widened by the buffer), minus the minimum notice, up to the horizon.
 * Days and times are in `timeZone`; slots are ISO instants.
 */
export function computeAvailability(
  settings: BookingSettings,
  busy: Interval[],
  now: Date,
  timeZone: string,
  exceptions: AvailabilityException[] = [],
): AvailableDay[] {
  if (!settings.enabled) return [];
  const earliest = now.getTime() + settings.minNoticeHours * 3_600_000;
  const buffer = settings.bufferMinutes * 60_000;
  const length = settings.slotMinutes * 60_000;
  const step = Math.min(settings.slotMinutes + settings.bufferMinutes, MAX_STEP);
  const taken = busy.map((b) => ({ start: b.start.getTime() - buffer, end: b.end.getTime() + buffer }));

  const today = zonedParts(now.getTime(), timeZone);
  const days: AvailableDay[] = [];
  for (let offset = 0; offset <= settings.horizonDays; offset++) {
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day + offset));
    const [y, m, d] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const todays = exceptions.filter((e) => e.startsOn <= key && key <= e.endsOn);
    if (todays.some((e) => e.kind === "blocked" && !e.startTime)) continue; // day off

    const at = (hhmm: string) => zonedTimeToUtc(y, m, d, toMinutes(hhmm), timeZone).getTime();
    const blocked = [
      ...taken,
      ...todays
        .filter((e) => e.kind === "blocked" && e.startTime && e.endTime)
        .map((e) => ({ start: at(e.startTime!), end: at(e.endTime!) })),
    ];
    const ranges = [
      ...(settings.weekly[date.getUTCDay()] ?? []),
      ...todays.filter((e) => e.kind === "extra" && e.startTime && e.endTime).map((e) => ({ start: e.startTime!, end: e.endTime! })),
    ];

    const slots = new Set<number>();
    for (const range of ranges) {
      for (let t = toMinutes(range.start); t + settings.slotMinutes <= toMinutes(range.end); t += step) {
        const start = zonedTimeToUtc(y, m, d, t, timeZone).getTime();
        if (start < earliest) continue;
        const end = start + length;
        if (blocked.some((b) => start < b.end && end > b.start)) continue;
        slots.add(start);
      }
    }
    if (slots.size) days.push({ date: key, slots: [...slots].sort((a, b) => a - b).map((t) => new Date(t).toISOString()) });
  }
  return days;
}

// ------------------------------------------------------------------ days off / extra hours (Paramètres)

const hhmm = z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide")]).optional();

/** « Ajouter une absence ou des horaires en plus »: dates inclusive, whole day or a time range. */
export const exceptionFormSchema = z
  .object({
    kind: z.enum(["blocked", "extra"]),
    startsOn: z.iso.date("Choisissez une date."),
    endsOn: z.union([z.literal(""), z.iso.date("Date invalide")]).optional(),
    allDay: checkbox,
    startTime: hhmm,
    endTime: hhmm,
    note: z
      .string()
      .trim()
      .max(120, "120 caractères maximum")
      .optional()
      .transform((v) => v || null),
  })
  .transform((v, ctx) => {
    const endsOn = v.endsOn || v.startsOn;
    if (endsOn < v.startsOn) {
      ctx.addIssue({ code: "custom", path: ["endsOn"], message: "La date de fin doit suivre la date de début." });
      return z.NEVER;
    }
    if (Date.parse(endsOn) - Date.parse(v.startsOn) > 366 * 86_400_000) {
      ctx.addIssue({ code: "custom", path: ["endsOn"], message: "Un an maximum." });
      return z.NEVER;
    }
    const wholeDay = v.kind === "blocked" && v.allDay;
    if (!wholeDay) {
      if (!v.startTime || !v.endTime) {
        ctx.addIssue({ code: "custom", path: ["startTime"], message: "Indiquez l’heure de début et de fin." });
        return z.NEVER;
      }
      if (toMinutes(v.endTime) <= toMinutes(v.startTime)) {
        ctx.addIssue({ code: "custom", path: ["endTime"], message: "L’heure de fin doit suivre l’heure de début." });
        return z.NEVER;
      }
    }
    return {
      kind: v.kind,
      startsOn: v.startsOn,
      endsOn,
      startTime: wholeDay ? null : v.startTime!,
      endTime: wholeDay ? null : v.endTime!,
      note: v.note,
    };
  });
