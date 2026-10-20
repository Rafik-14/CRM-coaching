import { icsCalendar, type IcsEventInput } from "./ics";

/**
 * The coach's private calendar feed (PHASE-2-PLAN §8): his sessions in Google / iPhone / Outlook.
 * Only what is needed to see the appointment: type, first name + initial, place, a link to the CRM file
 * (which asks for the login). Never the agenda, notes or contact details.
 */
export type FeedSession = {
  id: string;
  contactId: string;
  startsAt: Date;
  durationMin: number;
  type: string;
  status: string;
  location: string | null;
  updatedAt: Date;
  firstName: string;
  lastName: string;
};

/** From 3 months back to 12 months ahead. */
export const FEED_PAST_DAYS = 92;
export const FEED_FUTURE_DAYS = 366;

export const shortName = (first: string, last: string) => [first.trim(), last.trim() ? `${last.trim()[0].toUpperCase()}.` : ""].filter(Boolean).join(" ");

/** Conferences & workshops shown in the coach's agenda next to the sessions. */
export type FeedEvent = { id: string; title: string; startsAt: Date; endsAt: Date; location: string | null; updatedAt: Date };

export function buildCoachFeed(sessions: FeedSession[], baseUrl: string, now = new Date(), events: FeedEvent[] = []) {
  const items: IcsEventInput[] = sessions.map((s) => ({
    uid: `session-${s.id}@crm-jeremygalea`,
    start: s.startsAt,
    durationMin: s.durationMin,
    summary: `${s.type} · ${shortName(s.firstName, s.lastName)}`,
    location: s.location,
    url: `${baseUrl}/contacts/${s.contactId}`,
    description: `Fiche dans le CRM : ${baseUrl}/contacts/${s.contactId}`,
    status: s.status === "cancelled" ? "CANCELLED" : "CONFIRMED",
    updatedAt: s.updatedAt,
  }));
  for (const e of events) {
    items.push({
      uid: `event-${e.id}@crm-jeremygalea`,
      start: e.startsAt,
      durationMin: Math.max(15, Math.round((e.endsAt.getTime() - e.startsAt.getTime()) / 60_000)),
      summary: `Événement · ${e.title}`,
      location: e.location,
      url: `${baseUrl}/mes-evenements/${e.id}`,
      description: `Inscrits dans le CRM : ${baseUrl}/mes-evenements/${e.id}`,
      status: "CONFIRMED",
      updatedAt: e.updatedAt,
    });
  }
  return icsCalendar(items, { name: "Séances · Méthode JG®", refreshMinutes: 60 }, now);
}
