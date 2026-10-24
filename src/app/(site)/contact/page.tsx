import { Suspense } from "react";
import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { SectionHeading } from "@/components/site/blocks";
import { ContactForm, ContactFormFields } from "@/components/site/contact-form";
import { DOMAINS } from "@/components/site/content";
import { BookingButton, Container, DotList, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import { WHATSAPP, WhatsAppButton } from "@/components/site/whatsapp";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Parlons de votre situation : réservez un échange stratégique de 20 minutes, sans engagement, ou écrivez à Jérémy Galéa.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container>
          <SectionHeading as="h1" eyebrow="Contact" title="Parlons de votre situation.">
            <p>
              Vous avez une question, un projet, une évolution en tête ou simplement besoin d’y voir plus clair ?
            </p>
            <p>
              Un premier échange permet de comprendre où vous en êtes, ce que vous cherchez à faire évoluer et quel
              accompagnement peut être pertinent.
            </p>
          </SectionHeading>

          <div className="jg-on-navy mt-12 grid gap-8 rounded-[12px] bg-navy p-7 text-white md:mt-16 md:grid-cols-[1fr_auto] md:items-center md:p-12">
            <div>
              <p className="font-heading text-[13px] font-semibold tracking-[0.16em] uppercase">
                Réserver un échange stratégique
              </p>
              <GoldLine className="mt-4" />
              <p className="jg-h3 mt-5 font-heading font-semibold">20 minutes pour parler de votre situation.</p>
              <p className="mt-2 flex items-center gap-2 text-white/85">
                <Clock aria-hidden className="size-4 text-gold" strokeWidth={1.75} />
                Sans engagement.
              </p>
            </div>
            <BookingButton source="contact" label="Réserver mon échange stratégique" variant="light" />
          </div>
        </Container>
      </Section>

      <Section tone="ivory">
        <Container className="grid gap-12 lg:grid-cols-[1.4fr_0.6fr] lg:gap-20">
          <div>
            <SectionHeading title="Vous préférez m’écrire ?">
              <p>Vous pouvez également me laisser un message.</p>
            </SectionHeading>
            <div className="mt-10">
              <Suspense fallback={<ContactFormFields />}>
                <ContactForm />
              </Suspense>
            </div>
          </div>
          <aside className="self-start rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-7 lg:mt-24">
            <Eyebrow>Jérémy Galéa</Eyebrow>
            <GoldLine className="mt-4" />
            <p className="mt-5 font-heading text-[1.0625rem] font-semibold text-navy">Coach &amp; formateur</p>
            <p className="font-heading text-[1.0625rem] font-semibold text-navy">Créateur de la Méthode JG®</p>
            <DotList items={DOMAINS} className="jg-small mt-4" />
            <p className="mt-6 font-heading text-[15px] font-medium tracking-[0.08em] text-navy">France • Suisse</p>
            <div className="mt-8 border-t border-[var(--jg-light-gray)] pt-6">
              <p className="font-semibold text-navy">WhatsApp</p>
              <p className="jg-small mt-1">{WHATSAPP.display}</p>
              <WhatsAppButton className="mt-4 w-full" />
            </div>
          </aside>
        </Container>
      </Section>
    </>
  );
}
