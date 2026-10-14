/** Minimal iCalendar (.ics) file for one appointment (RFC 5545), times in UTC. */
export function icsEvent({
  uid,
  start,
  durationMin,
  summary,
  description,
  location,
}: {
  uid: string;
  start: Date;
  durationMin: number;
  summary: string;
  description?: string;
  location?: string | null;
}) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const end = new Date(start.getTime() + durationMin * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jeremy Galea//Methode JG//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(summary)}`,
    description && `DESCRIPTION:${escape(description)}`,
    location && `LOCATION:${escape(location)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(summary)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return `${lines.join("\r\n")}\r\n`;
}
