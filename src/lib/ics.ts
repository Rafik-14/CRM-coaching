/**
 * iCalendar (RFC 5545), written by hand: one appointment (.ics attached to confirmation e-mails)
 * or a whole feed (the coach's calendar subscription). Times in UTC.
 */
export type IcsEventInput = {
  uid: string;
  start: Date;
  durationMin: number;
  summary: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  status?: "CONFIRMED" | "CANCELLED";
  /** Last change, so calendars know which copy is newer. */
  updatedAt?: Date;
  /** Minutes before the start for a phone notification. */
  alarmMin?: number | null;
};

export const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export const icsEscape = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 octets continue on the next line after a space (never inside a UTF-8 character). */
export function icsFold(line: string) {
  const bytes = (s: string) => Buffer.byteLength(s, "utf8");
  if (bytes(line) <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length ? 74 : 75; // continuation lines start with a space
    if (bytes(current + char) > limit) {
      parts.push(current);
      current = "";
    }
    current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function eventLines(e: IcsEventInput, now: Date) {
  const end = new Date(e.start.getTime() + e.durationMin * 60_000);
  return [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${icsStamp(now)}`,
    `DTSTART:${icsStamp(e.start)}`,
    `DTEND:${icsStamp(end)}`,
    e.updatedAt && `LAST-MODIFIED:${icsStamp(e.updatedAt)}`,
    `SUMMARY:${icsEscape(e.summary)}`,
    e.description && `DESCRIPTION:${icsEscape(e.description)}`,
    e.location && `LOCATION:${icsEscape(e.location)}`,
    e.url && `URL:${e.url}`,
    e.status && `STATUS:${e.status}`,
    ...(e.alarmMin != null
      ? ["BEGIN:VALARM", `TRIGGER:-PT${e.alarmMin}M`, "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(e.summary)}`, "END:VALARM"]
      : []),
    "END:VEVENT",
  ].filter(Boolean) as string[];
}

export function icsCalendar(events: IcsEventInput[], options: { name?: string; refreshMinutes?: number } = {}, now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jeremy Galea//Methode JG//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(options.name ? [`X-WR-CALNAME:${icsEscape(options.name)}`, `NAME:${icsEscape(options.name)}`] : []),
    ...(options.refreshMinutes
      ? [`REFRESH-INTERVAL;VALUE=DURATION:PT${options.refreshMinutes}M`, `X-PUBLISHED-TTL:PT${options.refreshMinutes}M`]
      : []),
    ...events.flatMap((e) => eventLines(e, now)),
    "END:VCALENDAR",
  ];
  return `${lines.map(icsFold).join("\r\n")}\r\n`;
}

/** One appointment, with a reminder 30 minutes before (confirmation e-mails). */
export function icsEvent(event: Omit<IcsEventInput, "alarmMin">) {
  return icsCalendar([{ ...event, alarmMin: 30 }]);
}
