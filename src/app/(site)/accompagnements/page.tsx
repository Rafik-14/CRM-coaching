import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { CalendarDays, Compass, MessageCircle, Target } from "lucide-react";
import { SectionHeading } from "@/components/site/blocks";
import { OfferList, OfferListSkeleton } from "@/components/site/offers";
import { BookingButton, Container, GoldLine, Section } from "@/components/site/ui";
import fin from "@/assets/site/accompagnements-fin.webp";

export const metadata: Metadata = {
  title: "Accompagnements",
  description:
    "Votre prochaine étape commence ici. Architecture Identitaire JG®, Accompagnement Décisif JG®, Parcours Signature JG® : trois façons de révéler votre singularité et de faire reconnaître ce que vous apportez.",
  alternates: { canonical: "/accompagnements" },
};

/** The three reassurances under « Vous ne savez pas quel accompagnement choisir ? » (Jérémy's mock-up, Nov. 2026). */
const REASSURANCES = [
  { icon: MessageCircle, title: "Un échange personnalisé", text: "pour faire le point en toute confidentialité." },
  { icon: Compass, title: "Des conseils clairs", text: "pour avancer dans la bonne direction." },
  { icon: Target, title: "Sans engagement", text: "juste un moment d’échange utile pour vous." },
] as const;

export default function AccompagnementsPage() {
  return (
    <>
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container>
          <SectionHeading as="h1" eyebrow="JG® · Accompagnements" title="Votre prochaine étape commence ici.">
            <p>
              Trois accompagnements. Trois façons de révéler votre singularité et de faire reconnaître ce que vous apportez.
            </p>
          </SectionHeading>
        </Container>
      </Section>

      <Section tone="ivory">
        <Container>
          <Suspense fallback={<OfferListSkeleton />}>
            <OfferList />
          </Suspense>
          <p className="jg-small mt-8 max-w-[760px]">
            Les tarifs sont indiqués en euros et en francs suisses selon la zone de facturation. Les montants sont définis
            séparément et ne correspondent pas à une conversion au taux de change en vigueur.
          </p>
        </Container>
      </Section>

      {/* End of the page: text and reassurances on the left, booking card over the photo on the right. */}
      <Section className="overflow-hidden">
        <Container className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <GoldLine />
            <h2 className="jg-h2 mt-6 max-w-[620px]">Vous ne savez pas quel accompagnement choisir ?</h2>
            <div className="jg-prose mt-6 max-w-[600px]">
              <p>Vous n’avez pas besoin de le savoir avant de commencer.</p>
              <p>
                Parlons de votre situation, de vos objectifs et de ce qui compte pour vous. Nous déterminerons ensemble le
                point de départ le plus pertinent.
              </p>
            </div>
            <ul className="mt-10 grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-[var(--jg-light-gray)]">
              {REASSURANCES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="sm:px-6 sm:first:pl-0">
                  <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-[#f1e4cf] text-navy">
                    <Icon className="size-6" strokeWidth={1.75} />
                  </span>
                  <p className="mt-4 font-heading font-semibold text-navy">{title}</p>
                  <p className="jg-small mt-1">{text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <span
              aria-hidden
              className="absolute -top-16 -right-24 hidden size-[520px] rounded-full border border-gold/70 lg:block"
            />
            <div className="relative z-10 mx-auto max-w-[460px] rounded-[16px] bg-[#f8f4ec] p-7 shadow-[0_18px_48px_rgba(23,37,54,0.12)] md:p-9 lg:mr-0 lg:-mb-14">
              <BookingButton source="accompagnements" block />
              <span aria-hidden className="mx-auto mt-6 block h-0.5 w-10 bg-gold" />
              <p className="jg-small mt-4 flex items-center justify-center gap-2 text-navy">
                <CalendarDays aria-hidden className="size-5" />
                20 minutes · Sans engagement
              </p>
            </div>
            <Image
              src={fin}
              alt="Un fauteuil face à la fenêtre et, sur la table, le carnet JG® avec un stylo"
              placeholder="blur"
              sizes="(min-width: 1024px) 560px, 100vw"
              className="relative h-auto w-full rounded-[12px] object-cover"
            />
          </div>
        </Container>
      </Section>
    </>
  );
}
