import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { FinalCta, SectionHeading } from "@/components/site/blocks";
import { PastEventCard, UpcomingEventCard } from "@/components/site/event-card";
import { BookingButton, Container, Section } from "@/components/site/ui";
import { listPublicEvents } from "@/server/queries/events";
import { EVENT_AUDIENCE_LABEL, EVENT_KINDS, EVENT_KIND_LABEL, type EventAudience } from "@/lib/events";
import { cn } from "@/lib/utils";
import photoJeremy from "@/assets/site/evenements-jeremy.webp";
import photoAmphi from "@/assets/site/evenements-amphi.webp";
import photoAtelier from "@/assets/site/evenements-atelier.webp";
import affiche from "@/assets/site/affiche-et-si-nos-mots.webp";

/** Poster of the 26 November 2026 workshop (Le Juvénat), shown with the upcoming events until that day. */
const POSTER = { image: affiche, until: "2026-11-27" };

export const metadata: Metadata = {
  title: "Conférences et ateliers",
  description:
    "Les prochaines conférences et les ateliers de Jérémy Galéa, créateur de la Méthode JG® : réservez votre place en ligne. Retrouvez aussi les interventions passées.",
  alternates: { canonical: "/evenements" },
};

/** Past events: filters appear once the history is long enough to need them. */
const FILTERS_FROM = 6;
const PAST_STEP = 9;

export default function EventsPage({ searchParams }: PageProps<"/evenements">) {
  return (
    <>
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <SectionHeading as="h1" eyebrow="Conférences & ateliers" title="Venez vivre la Méthode JG® en direct.">
            <p>
              Des conférences pour comprendre ce qui rend une valeur évidente, des ateliers pour la travailler concrètement. Réservez votre place en
              quelques secondes.
            </p>
          </SectionHeading>
          <Image
            src={photoJeremy}
            alt="Jérémy Galéa en pleine intervention"
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 440px, 100vw"
            className="h-auto w-full max-w-[420px] rounded-[12px] lg:justify-self-end"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:col-span-2">
            <Image
              src={photoAmphi}
              alt="Jérémy Galéa lors d’une conférence dans un amphithéâtre"
              placeholder="blur"
              sizes="(min-width: 1240px) 600px, (min-width: 640px) 50vw, 100vw"
              className="h-auto w-full rounded-[12px]"
            />
            <Image
              src={photoAtelier}
              alt="Jérémy Galéa animant un atelier « Osez prendre la parole » avec un groupe de jeunes"
              placeholder="blur"
              sizes="(min-width: 1240px) 600px, (min-width: 640px) 50vw, 100vw"
              className="h-auto w-full rounded-[12px]"
            />
          </div>
        </Container>
      </Section>
      <Suspense fallback={<Container className="h-96 animate-pulse rounded-[12px] bg-ivory" />}>
        <EventLists searchParams={searchParams} />
      </Suspense>
      <FinalCta title="Une intervention dans votre structure ?" source="evenements-final">
        Entreprises, écoles, associations : parlons de votre projet de conférence ou d’atelier.
      </FinalCta>
    </>
  );
}

async function EventLists({ searchParams }: { searchParams: PageProps<"/evenements">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const type = EVENT_KINDS.find((k) => k === sp.type) ?? null;
  const audience = (Object.keys(EVENT_AUDIENCE_LABEL) as EventAudience[]).find((a) => a === sp.public) ?? null;
  const shown = Math.max(PAST_STEP, Number(sp.voir) || PAST_STEP);
  const { upcoming, past } = await listPublicEvents();

  const upcomingShown = upcoming.filter((e) => !type || e.kind === type);
  const showPoster = new Date() < new Date(POSTER.until);
  const pastFiltered = past.filter((e) => (!type || e.kind === type) && (!audience || e.audience === audience));
  const showFilters = past.length >= FILTERS_FROM || (upcoming.length > 0 && past.length > 0 && new Set([...upcoming, ...past].map((e) => e.kind)).size > 1);
  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const next = { type, public: audience, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const q = p.toString();
    return `/evenements${q ? `?${q}` : ""}#liste`;
  };

  return (
    <>
      <Section tone="ivory" id="liste" className="scroll-mt-20">
        <Container>
          {showFilters && (
            <nav aria-label="Filtrer les événements" className="mb-8 flex flex-wrap gap-2">
              <Chip href={href({ type: null })} active={!type}>
                Tous
              </Chip>
              {EVENT_KINDS.map((k) => (
                <Chip key={k} href={href({ type: k })} active={type === k}>
                  {EVENT_KIND_LABEL[k]}s
                </Chip>
              ))}
            </nav>
          )}
          <h2 className="jg-h2">Prochains événements</h2>
          {upcomingShown.length || showPoster ? (
            <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {showPoster && (
                <li>
                  <Image
                    src={POSTER.image}
                    alt="Affiche de l’atelier « Et si nos mots changeaient tout ? » : comprendre comment notre façon de parler influence nos émotions, nos comportements et nos relations. Intervenant : Jérémy Galéa. Jeudi 26 novembre 2026 à 20 h, École Collège Lycée Saint François, 19 rue Fernand David, 74100 Ville-la-Grand. Ouvert à tous : parents, élèves, professeurs et toute personne intéressée. Entrée gratuite. Un événement organisé par l’association des parents d’élèves."
                    placeholder="blur"
                    sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
                    className="h-auto w-full rounded-[12px] border border-[var(--jg-light-gray)]"
                  />
                </li>
              )}
              {upcomingShown.map((e) => (
                <li key={e.id}>
                  <UpcomingEventCard e={e} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-8 rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-7 md:p-9">
              <p className="jg-h4 font-heading font-semibold text-navy">Pas de date annoncée pour le moment.</p>
              <p className="mt-2 max-w-[640px]">Les prochaines conférences et ateliers arrivent bientôt. En attendant, parlons de votre situation.</p>
              <BookingButton source="evenements-vide" className="mt-6" />
            </div>
          )}
        </Container>
      </Section>

      {past.length > 0 && (
        <Section>
          <Container>
            <SectionHeading eyebrow="Ils m’ont fait confiance" title="Événements passés">
              <p>Conférences et ateliers déjà animés, avec les structures qui les ont accueillis.</p>
            </SectionHeading>
            {past.length >= FILTERS_FROM && (
              <nav aria-label="Filtrer par public" className="mt-8 flex flex-wrap gap-2">
                <Chip href={href({ public: null })} active={!audience}>
                  Tous les publics
                </Chip>
                {(["entreprises", "ecoles", "associations"] as const).map((a) => (
                  <Chip key={a} href={href({ public: a })} active={audience === a}>
                    {EVENT_AUDIENCE_LABEL[a]}
                  </Chip>
                ))}
              </nav>
            )}
            {pastFiltered.length ? (
              <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pastFiltered.slice(0, shown).map((e) => (
                  <li key={e.id}>
                    <PastEventCard e={e} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-8">Aucun événement passé pour ce filtre.</p>
            )}
            {pastFiltered.length > shown && (
              <div className="mt-10">
                <Link
                  href={`${href({ voir: String(shown + PAST_STEP) }).replace("#liste", "")}#passes`}
                  className="font-heading text-[15px] font-semibold text-navy underline decoration-gold decoration-2 underline-offset-[6px]"
                >
                  Voir plus d’événements passés
                </Link>
              </div>
            )}
            <span id="passes" />
          </Container>
        </Section>
      )}
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex min-h-10 items-center rounded-[7px] border px-4 font-heading text-[14px] font-medium transition-colors",
        active ? "border-navy bg-navy text-white" : "border-[var(--jg-light-gray)] bg-white text-navy hover:border-navy",
      )}
    >
      {children}
    </Link>
  );
}
