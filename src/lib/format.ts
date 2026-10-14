/**
 * The coach's time zone. Servers (e.g. Vercel) run in UTC, so every date rendered on the server
 * is formatted explicitly in this zone. Europe/Zurich = same offset as Paris.
 */
export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE ?? "Europe/Zurich";

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: APP_TIME_ZONE,
});
const dayTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDate = (d: Date | null | undefined) => (d ? dateFmt.format(d) : "—");
export const formatDayTime = (d: Date) => dayTimeFmt.format(d);

export function formatMoney(amount: number | string, currency = "EUR") {
  // fr-FR groups thousands with a narrow no-break space (U+202F), missing from the Lato subset: use a regular one.
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 })
    .format(Number(amount))
    .replace(/ /g, " ");
}

export const CURRENCIES = ["EUR", "CHF"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Amounts per currency. Jérémy sells in EUR and CHF: totals are never converted or mixed. */
export type MoneyByCurrency = Partial<Record<string, number>>;

export function addMoney(totals: MoneyByCurrency, amount: number | string | null | undefined, currency?: string | null) {
  if (amount == null) return totals;
  const c = currency || "EUR";
  totals[c] = (totals[c] ?? 0) + Number(amount);
  return totals;
}

/** « 6 750 € · 1 190 CHF » (one figure per currency). Shows 0 in the fallback currency when empty. */
export function formatMoneyTotals(totals: MoneyByCurrency, fallback = "EUR") {
  const entries = Object.entries(totals).filter((e): e is [string, number] => !!e[1]);
  if (!entries.length) return formatMoney(0, fallback);
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([c, v]) => formatMoney(v, c))
    .join(" · ");
}

/** Price of an offer in a given currency (CHF list price when set, else EUR). */
export function offerPrice(pkg: { price: string; priceChf: string | null }, currency: string) {
  return currency === "CHF" && pkg.priceChf != null
    ? { amount: pkg.priceChf, currency: "CHF" }
    : { amount: pkg.price, currency: "EUR" };
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
