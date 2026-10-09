const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const dayTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDate = (d: Date | null | undefined) => (d ? dateFmt.format(d) : "—");
export const formatDayTime = (d: Date) => dayTimeFmt.format(d);

export function formatMoney(amount: number | string, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    Number(amount),
  );
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

const relFmt = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

/** "il y a 3 jours", "hier", "dans 2 heures"… */
export function formatRelative(d: Date) {
  const diffMin = Math.round((d.getTime() - Date.now()) / 60_000);
  const abs = Math.abs(diffMin);
  if (abs < 60) return relFmt.format(diffMin, "minute");
  if (abs < 60 * 24) return relFmt.format(Math.round(diffMin / 60), "hour");
  if (abs < 60 * 24 * 30) return relFmt.format(Math.round(diffMin / 1440), "day");
  return formatDate(d);
}

/** True if the date is still to come. */
export const isUpcoming = (d: Date) => d.getTime() > Date.now();

/** Whole days since a date (0 = today). */
export function daysSince(d: Date) {
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

/** A task is late only if its due date is before today (due today is not late). */
export function isOverdue(dueAt: Date | null | undefined, done = false) {
  if (!dueAt || done) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return dueAt < startOfToday;
}

export const fullName =(c: { firstName: string; lastName: string }) =>
  `${c.firstName} ${c.lastName}`.trim();
