import { Suspense } from "react";
import type { Metadata } from "next";
import { SectionHeading, Statement } from "@/components/site/blocks";
import { OfferList, OfferListSkeleton } from "@/components/site/offers";
import { BookingButton, Container, Section } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Accompagnements",
  description:
    "Architecture Identitaire JG®, Accompagnement Décisif JG®, Parcours Signature JG® : trois niveaux d’accompagnement, une même ambition — rendre votre valeur évidente.",
  alternates: { canonical: "/accompagnements" },
};

export default function AccompagnementsPage() {
  return (
    <>
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-20">
          <SectionHeading as="h1" eyebrow="Accompagnements" title="Quel que soit votre enjeu, commencez au bon endroit.">
            <p>Trois niveaux d’accompagnement. Une même ambition : rendre votre valeur évidente.</p>
          </SectionHeading>
          <Statement>
            <p>Votre situation détermine le point de départ.</p>
            <p className="mt-1">Votre objectif détermine l’accompagnement.</p>
          </Statement>
        </Container>
      </Section>

      <Section tone="ivory">
        <Container>
          <Suspense fallback={<OfferListSkeleton />}>
            <OfferList />
          </Suspense>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-20">
          <SectionHeading title="Vous ne savez pas quel accompagnement choisir ?">
            <p>Vous n’avez pas besoin de le savoir avant de commencer.</p>
            <p>Parlons de votre situation et déterminons ensemble le point de départ le plus pertinent.</p>
          </SectionHeading>
          <div className="lg:justify-self-end">
            <BookingButton source="accompagnements" />
            <p className="jg-small mt-3">20 minutes · Sans engagement</p>
          </div>
        </Container>
      </Section>
    </>
  );
}
