import { connection } from "next/server";
import { SectionHeading } from "@/components/site/blocks";
import { PastEventCard, UpcomingEventCard } from "@/components/site/event-card";
import { ArrowLink, Container, Section } from "@/components/site/ui";
import { listPublicEvents } from "@/server/queries/events";

/**
 * Home page block: the next conferences / workshops when some are announced, otherwise the latest past ones
 * (proof of experience). Nothing at all while there is no event. Render inside <Suspense>.
 */
export async function HomeEvents() {
  await connection();
  const { upcoming, past } = await listPublicEvents();
  const next = upcoming.filter((e) => !e.manualHistory).slice(0, 3);
  if (next.length) {
    return (
      <Section tone="ivory">
        <Container>
          <SectionHeading eyebrow="Conférences & ateliers" title="Prochains événements">
            <p>Venez découvrir la Méthode JG® en direct. Les places sont limitées.</p>
          </SectionHeading>
          <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {next.map((e) => (
              <li key={e.id}>
                <UpcomingEventCard e={e} />
              </li>
            ))}
          </ul>
          <ArrowLink href="/evenements" className="mt-8">
            Tous les événements
          </ArrowLink>
        </Container>
      </Section>
    );
  }
  const latest = past.slice(0, 3);
  if (!latest.length) return null;
  return (
    <Section tone="ivory">
      <Container>
        <SectionHeading eyebrow="Ils m’ont fait confiance" title="Conférences et ateliers déjà animés" />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((e) => (
            <li key={e.id}>
              <PastEventCard e={e} />
            </li>
          ))}
        </ul>
        <ArrowLink href="/evenements" className="mt-8">
          Voir tous les événements
        </ArrowLink>
      </Container>
    </Section>
  );
}
