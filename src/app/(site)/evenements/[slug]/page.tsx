import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CalendarDays, Clock, MapPin, Tag, Users } from "lucide-react";
import { FinalCta } from "@/components/site/blocks";
import { EventRegistrationForm } from "@/components/site/event-registration";
import { EventVisual, eventDay, eventHours, kindLabel, photoSrc, seatsLabel } from "@/components/site/event-card";
import { ArrowLink, BookingButton, Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import { getPublicEvent } from "@/server/queries/events";
import { canRegister, isPast } from "@/lib/events";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/evenements/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) return { title: "Événement introuvable", robots: { index: false } };
  return {
    title: `${event.title} · ${kindLabel(event.kind)}`,
    description: event.summary ?? `${kindLabel(event.kind)} animé par Jérémy Galéa, créateur de la Méthode JG®.`,
    alternates: { canonical: `/evenements/${event.slug}` },
  };
}

export default function EventPage({ params }: PageProps<"/evenements/[slug]">) {
  return (
    <Suspense fallback={<Container className="my-16 h-96 animate-pulse rounded-[12px] bg-ivory" />}>
      <EventDetail params={params} />
    </Suspense>
  );
}

async function EventDetail({ params }: { params: PageProps<"/evenements/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();

  const now = new Date();
  const past = isPast(event, now);
  const cancelled = event.status === "cancelled";
  const open = canRegister(event, now);
  const full = event.free === 0;
  const place = event.location ?? (event.onlineUrl ? "En ligne (le lien est envoyé aux inscrits)" : null);
  const paragraphs = (text: string | null) => (text ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary ?? undefined,
    startDate: event.startsAt.toISOString(),
    endDate: event.endsAt.toISOString(),
    eventStatus: cancelled ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: event.location ? "https://schema.org/OfflineEventAttendanceMode" : "https://schema.org/OnlineEventAttendanceMode",
    location: event.location ? { "@type": "Place", name: event.location, address: event.location } : { "@type": "VirtualLocation", url: `${SITE_URL}/evenements/${event.slug}` },
    organizer: { "@type": "Person", name: "Jérémy Galéa", url: SITE_URL },
    url: `${SITE_URL}/evenements/${event.slug}`,
  };

  return (
    <>
      {!past && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container>
          <ArrowLink href="/evenements" className="mb-6 text-[14px]">
            Tous les événements
          </ArrowLink>
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <div>
              <Eyebrow>
                {kindLabel(event.kind)}
                {past ? " · Événement passé" : ""}
              </Eyebrow>
              <GoldLine className="mt-4" />
              <h1 className="jg-h1 mt-6">{event.title}</h1>
              {cancelled && (
                <p role="status" className="mt-6 rounded-[10px] border border-[#f3c4bf] bg-[#fdf3f2] px-5 py-4 font-semibold text-[#912018]">
                  Cet événement est annulé.
                </p>
              )}
              {event.summary && <p className="mt-6 font-heading text-[1.125rem] leading-snug font-medium text-navy md:text-[1.25rem]">{event.summary}</p>}
              <ul className="mt-8 grid gap-3">
                <Info icon={CalendarDays}>{eventDay(event.startsAt)}</Info>
                <Info icon={Clock}>{eventHours(event.startsAt, event.endsAt)} (heure de Paris)</Info>
                {place && <Info icon={MapPin}>{place}</Info>}
                {event.partner && <Info icon={Users}>Avec {event.partner}</Info>}
                {!past && event.priceText && <Info icon={Tag}>{event.priceText}</Info>}
                {past && event.showRecap && event.participantsShown && <Info icon={Users}>{event.participantsShown} participants</Info>}
              </ul>
            </div>
            <EventVisual coverId={event.coverId} startsAt={event.startsAt} kind={event.kind} className="rounded-[12px] lg:aspect-[4/3]" />
          </div>
        </Container>
      </Section>

      {!past ? (
        <Section tone="ivory">
          <Container className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <div className="jg-prose max-w-[680px]">
              {paragraphs(event.description).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {!event.description && <p>Toutes les informations pratiques vous sont envoyées par e-mail après votre inscription.</p>}
            </div>
            <div id="inscription" className="scroll-mt-24 self-start rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-6 md:p-8">
              {cancelled ? (
                <>
                  <h2 className="jg-h3 font-heading font-semibold text-navy">Événement annulé</h2>
                  <p className="mt-3">Les personnes inscrites ont été prévenues par e-mail.</p>
                  <ArrowLink href="/evenements" className="mt-4">
                    Voir les autres événements
                  </ArrowLink>
                </>
              ) : open && (!full || event.waitlistEnabled) ? (
                <>
                  <h2 className="jg-h3 font-heading font-semibold text-navy">{full ? "Rejoindre la liste d’attente" : "Réserver ma place"}</h2>
                  <p className="jg-small mt-2 font-medium text-navy">{seatsLabel(event)}</p>
                  {full && <p className="jg-small mt-2">Si une place se libère, elle vous est attribuée automatiquement et vous êtes prévenu par e-mail.</p>}
                  <div className="mt-6">
                    <EventRegistrationForm eventId={event.id} maxSeats={event.maxSeatsPerBooking} waitlist={full} />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="jg-h3 font-heading font-semibold text-navy">{full ? "C’est complet" : "Inscriptions fermées"}</h2>
                  <p className="mt-3">Pour être informé des prochaines dates, écrivez-moi.</p>
                  <ArrowLink href="/contact?source=evenement-complet" className="mt-4">
                    Me contacter
                  </ArrowLink>
                </>
              )}
            </div>
          </Container>
        </Section>
      ) : (
        <PastRecap event={event} paragraphs={paragraphs} />
      )}

      <FinalCta title="Et si on parlait de votre situation ?" source={past ? "evenement-passe" : "evenement"}>
        20 minutes pour faire le point, sans engagement.
      </FinalCta>
    </>
  );
}

function PastRecap({ event, paragraphs }: { event: Awaited<ReturnType<typeof getPublicEvent>> & {}; paragraphs: (t: string | null) => string[] }) {
  const recap = event.showRecap ? paragraphs(event.recap) : [];
  const description = paragraphs(event.description);
  return (
    <Section tone="ivory">
      <Container className="grid gap-12">
        <div className="jg-prose max-w-[760px]">
          {(recap.length ? recap : description).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {!recap.length && !description.length && <p>Merci à toutes les personnes présentes pour ce moment partagé.</p>}
          {event.showRecap && event.videoUrl && (
            <p>
              <a href={event.videoUrl} target="_blank" rel="noreferrer" className="font-heading font-semibold text-navy underline decoration-gold decoration-2 underline-offset-[6px]">
                Voir la vidéo
              </a>
            </p>
          )}
        </div>

        {event.gallery.length > 0 && (
          <div>
            <h2 className="jg-h3 font-heading font-semibold text-navy">En images</h2>
            <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {event.gallery.map((p, i) => (
                <li key={p.id} className={i === 0 && event.gallery.length > 2 ? "col-span-2 row-span-2" : undefined}>
                  <a href={photoSrc(p.id)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[10px]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- served by our own route, already resized */}
                    <img
                      src={photoSrc(p.id)}
                      alt={p.caption ?? `Photo de l’événement ${event.title}`}
                      loading="lazy"
                      width={p.width ?? undefined}
                      height={p.height ?? undefined}
                      className="aspect-[4/3] h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {event.quotes.length > 0 && (
          <div>
            <h2 className="jg-h3 font-heading font-semibold text-navy">Ils en parlent</h2>
            <ul className="mt-6 grid gap-6 md:grid-cols-2">
              {event.quotes.map((q) => (
                <li key={q.id}>
                  <figure className="h-full rounded-[12px] border-l-2 border-gold bg-white p-6">
                    <blockquote className="font-heading text-[1.125rem] leading-snug font-medium text-navy">«&nbsp;{q.text}&nbsp;»</blockquote>
                    {q.author && <figcaption className="jg-small mt-3">{q.author}</figcaption>}
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ArrowLink href="/evenements">Voir les prochains événements</ArrowLink>
          <BookingButton source="evenement-passe-recap" variant="secondary" />
        </div>
      </Container>
    </Section>
  );
}

function Info({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Icon aria-hidden className="mt-1 size-5 shrink-0 text-gold" />
      <span>{children}</span>
    </li>
  );
}
