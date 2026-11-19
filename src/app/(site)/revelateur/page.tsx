import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink, Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import { revelateurEnabled } from "@/server/revelateur/flag";

export const metadata: Metadata = {
  title: "Le Révélateur — Test Signature JG®",
  robots: { index: false, follow: false },
};

/**
 * Presentation page of the test. PROVISIONAL: Jérémy writes and validates the final text
 * (his e-mail of 18 Nov 2026). Only lines already validated in the brief are used here.
 */
export default function RevelateurPage() {
  return (
    <Suspense fallback={null}>
      <Presentation />
    </Suspense>
  );
}

async function Presentation() {
  await connection();
  if (!revelateurEnabled()) notFound();
  return (
    <Section className="pt-12 md:pt-20">
      <Container className="max-w-[860px]">
        <Eyebrow>Une exclusivité JG®</Eyebrow>
        <GoldLine className="mt-4" />
        <h1 className="jg-h1 mt-6">Le Révélateur</h1>
        <p className="mt-3 font-heading text-[14px] font-semibold tracking-[.2em] text-[var(--jg-gold-ink)] uppercase">Test Signature JG®</p>
        <p className="mt-8 max-w-[640px] font-heading text-[1.25rem] leading-snug font-medium text-navy">Une expérience pour révéler ce qui vous distingue.</p>
        <p className="mt-4 max-w-[640px] text-[17px]">5 dimensions. 5 regards pour mieux vous comprendre.</p>
        <p className="mt-6 font-heading text-[12px] font-semibold tracking-[.22em] uppercase">30 questions · Environ 9 minutes · Rapport personnalisé</p>
        <div className="mt-10">
          <ButtonLink href="/revelateur/experience">Je commence l&apos;expérience</ButtonLink>
        </div>
        <p className="mt-10 max-w-[640px] text-[14px] text-[var(--jg-anthracite)]">
          Le Test Signature JG® constitue une première cartographie à partir de vos réponses. Il propose des repères pour nourrir votre réflexion ; il ne
          constitue ni un diagnostic, ni une évaluation exhaustive de votre personne.
        </p>
      </Container>
    </Section>
  );
}
