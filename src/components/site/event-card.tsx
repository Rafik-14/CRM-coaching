import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { EVENT_KIND_LABEL, FEW_SEATS, type EventKind } from "@/lib/events";
import { APP_TIME_ZONE } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Cards of the public « Événements » page (upcoming and past). Photos come from /api/evenements/photo/<id>. */

const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const dayNum = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, day: "numeric" });
const monthShort = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, month: "short" });

export const eventDay = (d: Date) => {
  const s = dayFmt.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const eventShortDay = (d: Date) => shortFmt.format(d);
export const eventHours = (start: Date, end: Date) => `${timeFmt.format(start)} – ${timeFmt.format(end)}`;
export const photoSrc = (id: string) => `/api/evenements/photo/${id}`;
export const kindLabel = (kind: string) => EVENT_KIND_LABEL[kind as EventKind] ?? "Événement";

/** « Plus que 3 places », « Complet · liste d’attente »… */
export function seatsLabel(e: { free: number | null; waitlistEnabled: boolean; registrationOpen: boolean }) {
  if (!e.registrationOpen) return "Inscriptions fermées";
  if (e.free == null) return "Places disponibles";
  if (e.free === 0) return e.waitlistEnabled ? "Complet · liste d’attente" : "Complet";
  if (e.free <= FEW_SEATS) return `Plus que ${e.free} place${e.free > 1 ? "s" : ""}`;
  return `${e.free} places disponibles`;
}

/** Picture of an event, or a branded block (navy, date) when there is no photo yet. */
export function EventVisual({ coverId, startsAt, kind, className }: { coverId: string | null; startsAt: Date; kind: string; className?: string }) {
  if (coverId) {
    // eslint-disable-next-line @next/next/no-img-element -- served by our own route, already resized
    return <img src={photoSrc(coverId)} alt="" loading="lazy" className={cn("aspect-[16/9] w-full object-cover", className)} />;
  }
  return (
    <div aria-hidden className={cn("relative flex aspect-[16/9] w-full items-end overflow-hidden bg-navy p-6 text-white", className)}>
      <span className="absolute -top-10 -right-10 size-48 rounded-full border-[18px] border-gold/25" />
      <span className="absolute top-6 right-8 size-20 rounded-full border-2 border-white/15" />
      <div>
        <p className="font-heading text-[13px] font-semibold tracking-[0.16em] text-gold uppercase">{kindLabel(kind)}</p>
        <p className="mt-1 font-heading text-[2.5rem] leading-none font-bold">{dayNum.format(startsAt)}</p>
        <p className="font-heading text-[15px] font-medium tracking-[0.08em] uppercase">{monthShort.format(startsAt).replace(".", "")}</p>
      </div>
    </div>
  );
}

export type UpcomingCardEvent = {
  slug: string;
  kind: string;
  title: string;
  summary: string | null;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  onlineUrl: string | null;
  priceText: string | null;
  partner: string | null;
  free: number | null;
  waitlistEnabled: boolean;
  registrationOpen: boolean;
  coverId: string | null;
};

export function UpcomingEventCard({ e }: { e: UpcomingCardEvent }) {
  const label = seatsLabel(e);
  const full = e.free === 0;
  return (
    <Link
      href={`/evenements/${e.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[12px] border border-[var(--jg-light-gray)] bg-white transition-[border-color,translate] duration-200 hover:-translate-y-px hover:border-navy"
    >
      <EventVisual coverId={e.coverId} startsAt={e.startsAt} kind={e.kind} />
      <div className="flex flex-1 flex-col p-6 md:p-7">
        <p className="font-heading text-[13px] font-semibold tracking-[0.16em] text-navy uppercase">{kindLabel(e.kind)}</p>
        <h3 className="jg-h4 mt-2 font-heading font-semibold text-navy">{e.title}</h3>
        {e.summary && <p className="mt-3">{e.summary}</p>}
        <ul className="jg-small mt-5 grid gap-1.5">
          <li className="flex items-start gap-2">
            <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
            {eventDay(e.startsAt)} · {eventHours(e.startsAt, e.endsAt)}
          </li>
          <li className="flex items-start gap-2">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
            {e.location ?? (e.onlineUrl ? "En ligne" : "Lieu communiqué aux inscrits")}
          </li>
          <li className="flex items-start gap-2">
            <Users aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
            <span className={cn(full && "font-semibold text-navy")}>{label}</span>
            {e.priceText && <span className="text-navy">· {e.priceText}</span>}
          </li>
        </ul>
        <span className="mt-auto inline-flex items-center gap-2 pt-6 font-heading text-[15px] font-semibold text-navy underline decoration-gold decoration-2 underline-offset-[6px]">
          {full && e.waitlistEnabled ? "Rejoindre la liste d’attente" : e.registrationOpen ? "Voir et réserver ma place" : "Voir l’événement"}
        </span>
      </div>
    </Link>
  );
}

export type PastCardEvent = {
  slug: string;
  kind: string;
  title: string;
  startsAt: Date;
  partner: string | null;
  location: string | null;
  showRecap: boolean;
  participantsShown: number | null;
  coverId: string | null;
};

export function PastEventCard({ e }: { e: PastCardEvent }) {
  return (
    <Link
      href={`/evenements/${e.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[12px] border border-[var(--jg-light-gray)] bg-white transition-colors duration-200 hover:border-navy"
    >
      <EventVisual coverId={e.coverId} startsAt={e.startsAt} kind={e.kind} className="aspect-[3/2]" />
      <div className="flex flex-1 flex-col p-5">
        <p className="jg-small">
          {kindLabel(e.kind)} · {eventShortDay(e.startsAt)}
        </p>
        <h3 className="mt-1 font-heading text-[1.0625rem] leading-snug font-semibold text-navy">{e.title}</h3>
        {(e.partner || e.participantsShown) && (
          <p className="jg-small mt-2">{[e.partner && `Avec ${e.partner}`, e.participantsShown && `${e.participantsShown} participants`].filter(Boolean).join(" · ")}</p>
        )}
        {e.showRecap && (
          <span className="mt-auto pt-4 font-heading text-[14px] font-semibold text-navy underline decoration-gold decoration-2 underline-offset-[6px]">
            Voir le compte rendu
          </span>
        )}
      </div>
    </Link>
  );
}
