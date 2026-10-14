import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, FinalCta, FlowLine, SectionHeading, Statement, WideFigure } from "@/components/site/blocks";
import { CASES, DOMAINS } from "@/components/site/content";
import { ArrowLink, BookingButton, Container, DotList, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import hero from "@/assets/site/hero.webp";
import methode from "@/assets/site/methode.webp";
import apropos from "@/assets/site/apropos.webp";
import schemaValeur from "@/assets/site/schema-valeur.webp";
import etapeClarifier from "@/assets/site/etape-clarifier.webp";
import etapeReveler from "@/assets/site/etape-reveler.webp";
import etapeIncarner from "@/assets/site/etape-incarner.webp";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Jérémy Galéa · Méthode JG® — Révéler votre potentiel" },
  description:
    "Pourquoi vous plutôt qu’un autre ? Coach & formateur, Jérémy Galéa vous aide à rendre votre valeur claire, crédible et évidente. France • Suisse.",
  alternates: { canonical: "/" },
};

const STEPS = [
  {
    title: "Clarifier",
    image: etapeClarifier,
    text: "Comprendre votre situation, vos enjeux et ce qui vous freine pour retrouver une direction claire.",
  },
  {
    title: "Révéler",
    image: etapeReveler,
    text: "Faire émerger la cohérence de votre parcours pour identifier ce qui vous distingue.",
  },
  {
    title: "Incarner",
    image: etapeIncarner,
    text: "Transformer cette clarté en posture, discours et décisions, pour rendre votre valeur visible.",
  },
] as const;

const OFFERS = [
  {
    name: "Architecture Identitaire JG®",
    tagline: "Comprendre ce qui fait réellement votre valeur.",
    text: "Prendre du recul sur votre parcours, révéler ce qui vous distingue et clarifier votre direction.",
    label: "Pour :",
    items: ["Clarification", "Repositionnement", "Orientation", "Reconversion", "Évolution"],
    note: null,
    link: "Découvrir l’Architecture Identitaire JG®",
    href: "/accompagnements#architecture-identitaire",
  },
  {
    name: "Accompagnement Décisif JG®",
    tagline: "Réussir quand ça compte.",
    text: "Un accompagnement court et ciblé pour préparer un moment où votre valeur doit être comprise, reconnue et choisie.",
    label: "Pour :",
    items: ["Entretien", "Stage", "Alternance", "Oral", "Pitch", "Négociation", "Prise de poste"],
    note: "1 à 3 séances selon votre objectif.",
    link: "Découvrir l’Accompagnement Décisif JG®",
    href: "/accompagnements#accompagnement-decisif",
  },
  {
    name: "Parcours Signature JG®",
    tagline: "Transformer votre compréhension en trajectoire.",
    text: "Un accompagnement pour révéler durablement votre valeur et l’incarner dans votre trajectoire professionnelle.",
    label: null,
    items: ["8 séances individuelles", "Workbook Signature JG®", "Exercices entre les séances"],
    note: null,
    link: "Découvrir le Parcours Signature JG®",
    href: "/accompagnements/parcours-signature",
  },
] as const;

/** Structured data for search engines: who Jérémy is and what he offers. */
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Jérémy Galéa — Méthode JG®",
  slogan: "Révéler votre potentiel",
  url: SITE_URL,
  image: `${SITE_URL}/opengraph-image`,
  areaServed: ["FR", "CH"],
  founder: { "@type": "Person", name: "Jérémy Galéa", jobTitle: "Coach & formateur, créateur de la Méthode JG®" },
  knowsAbout: [...DOMAINS],
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      {/* 1 — Hero: text left, portrait right */}
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <Eyebrow>Jérémy Galéa · Méthode JG®</Eyebrow>
            <GoldLine className="mt-4" />
            <h1 className="jg-h1 mt-6">Pourquoi vous plutôt qu’un autre ?</h1>
            <p className="mt-6 font-heading text-[1.25rem] leading-snug font-medium text-navy md:text-[1.375rem]">
              Si vous deviez répondre maintenant, que diriez-vous ?
            </p>
            <div className="jg-prose mt-6 max-w-[600px]">
              <p>
                Parce qu’au moment où une décision se prend, votre valeur ne suffit pas. Il faut qu’elle soit perçue.
              </p>
              <p>
                <strong>Je vous aide à la rendre claire, crédible et évidente.</strong>
              </p>
              <p>Pour être compris, reconnu et choisi.</p>
            </div>
            <DotList items={DOMAINS} className="jg-small mt-8 font-medium text-navy" />
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <BookingButton source="accueil-hero" />
              <p className="jg-small">20 minutes · Sans engagement</p>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[520px]">
            <Image
              src={hero}
              alt="Jérémy Galéa, coach et formateur, créateur de la Méthode JG®"
              priority
              placeholder="blur"
              sizes="(min-width: 1024px) 520px, (min-width: 640px) 520px, 100vw"
              className="aspect-[4/5] w-full rounded-[12px] object-cover object-[50%_25%]"
            />
            <span aria-hidden className="absolute -bottom-4 left-8 h-0.5 w-24 bg-gold" />
          </div>
        </Container>
      </Section>

      {/* 2 — Prise de conscience */}
      <Section tone="ivory">
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <SectionHeading title="Et si votre parcours racontait une histoire que vous n’avez jamais vue ?" />
          <div className="jg-prose max-w-[640px] lg:pt-14">
            <p>Vos expériences, vos choix et vos détours ne sont peut-être pas aussi dispersés qu’ils en ont l’air.</p>
            <p>Un fil conducteur relie parfois ce que vous avez construit sans que vous l’ayez encore identifié.</p>
            <p>
              <strong>Mon rôle est de le faire émerger, pour révéler ce qui vous distingue et éclairer la suite.</strong>
            </p>
          </div>
        </Container>
      </Section>

      {/* 3 — Valeur + perception */}
      <Section>
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <SectionHeading title="Votre valeur existe. Mais est-elle perçue ?">
            <p>Vous pouvez avoir les compétences, l’expérience et le potentiel.</p>
            <p>Et pourtant, ne pas toujours réussir à les rendre visibles au moment où cela compte.</p>
          </SectionHeading>
          <div className="lg:pt-14">
            <Statement>
              <p>On ne choisit pas toujours le plus compétent.</p>
              <p className="mt-2">On choisit celui dont la valeur est la plus évidente.</p>
            </Statement>
            <p className="mt-8 max-w-[560px]">Parce qu’une valeur que l’on ne comprend pas reste difficile à choisir.</p>
          </div>
        </Container>
      </Section>

      {/* 4 — Mantra / territoire JG® */}
      <Section tone="navy">
        <Container>
          <Eyebrow>Le territoire JG®</Eyebrow>
          <GoldLine className="mt-4" />
          <h2 className="jg-h2 mt-6 max-w-[880px]">
            Savoir ce que vous valez est une force.
            <br />
            Savoir le rendre évident est un pouvoir.
          </h2>
          <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-20">
            <div className="jg-prose text-white/85">
              <p>Votre valeur ne se joue pas seulement dans ce que vous êtes.</p>
              <p>Elle se joue dans ce que l’autre en perçoit.</p>
            </div>
            <Statement>Je vous rends évident au moment où la décision se prend.</Statement>
          </div>
        </Container>
      </Section>

      {/* 5 — Différenciation / Méthode JG® */}
      <Section>
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <Image
              src={methode}
              alt="Jérémy Galéa au travail sur un accompagnement"
              placeholder="blur"
              sizes="(min-width: 1024px) 480px, 100vw"
              className="order-last h-auto w-full max-w-[440px] rounded-[12px] lg:order-first"
            />
            <div>
              <SectionHeading eyebrow="La Méthode JG®" title="Comprendre votre parcours pour révéler votre valeur.">
                <p>
                  La Méthode JG® révèle les liens entre vos expériences, vos choix et vos réussites pour faire émerger ce
                  qui vous distingue réellement.
                </p>
                <p>
                  Puis nous transformons cette compréhension en identité, positionnement et expression, pour que votre
                  valeur soit plus claire — pour vous comme pour les autres.
                </p>
              </SectionHeading>
              <ArrowLink href="/methode" className="mt-8">
                Comprendre la Méthode JG®
              </ArrowLink>
            </div>
          </div>
          <WideFigure label="Schéma : de la valeur réelle à la valeur perçue" className="mt-16 md:mt-24">
            <Image
              src={schemaValeur}
              alt="Votre valeur réelle (expérience, compétences, qualités, potentiel) devient, grâce à mon intervention (clarifier, structurer, rendre évidente votre valeur), une valeur perçue : claire, lisible et reconnue, qui crée plus d’opportunités et des décisions en votre faveur."
              placeholder="blur"
              sizes="(min-width: 1240px) 1240px, (min-width: 768px) 100vw, 760px"
              className="rounded-[12px]"
            />
          </WideFigure>
        </Container>
      </Section>

      {/* 6 — Comment ça fonctionne ? */}
      <Section tone="ivory">
        <Container>
          <SectionHeading eyebrow="Comment ça fonctionne ?" title="Trois étapes pour rendre votre valeur évidente." />
          <div className="mt-8 grid gap-2">
            <FlowLine strong items={["Clarifier", "Révéler", "Incarner"]} />
            <FlowLine items={["Comprendre", "Donner du sens", "Rendre visible"]} className="hidden md:flex" />
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <Card className="h-full p-6 md:p-7">
                  {/* The picture carries the step name; the heading repeats it for screen readers. */}
                  <Image
                    src={step.image}
                    alt=""
                    placeholder="blur"
                    sizes="(min-width: 768px) 320px, 80vw"
                    className="mx-auto w-full max-w-[240px]"
                  />
                  <h3 className="sr-only">
                    {String(i + 1).padStart(2, "0")} — {step.title}
                  </h3>
                  <p aria-hidden className="mt-4 font-heading text-[15px] font-semibold text-navy tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-3">{step.text}</p>
                </Card>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* 7 — Les accompagnements */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Les accompagnements" title="Trois façons de passer de la compréhension à l’action.">
            <p>Un accompagnement adapté à votre situation, votre objectif et votre moment professionnel.</p>
          </SectionHeading>
          <ul className="mt-12 grid gap-6 lg:grid-cols-3">
            {OFFERS.map((offer, i) => (
              <li key={offer.name}>
                <Card className="flex h-full flex-col">
                  <p className="font-heading text-[15px] font-semibold text-navy tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <GoldLine className="mt-3 w-8" />
                  <h3 className="jg-h4 mt-5 tracking-[0.04em] uppercase">{offer.name}</h3>
                  <p className="mt-3 font-heading text-[1.125rem] leading-snug font-medium text-navy">{offer.tagline}</p>
                  <p className="mt-4">{offer.text}</p>
                  <div className="jg-small mt-5">
                    {offer.label && <p className="font-semibold text-navy">{offer.label}</p>}
                    <DotList items={offer.items} className="mt-1" />
                    {offer.note && <p className="mt-3">{offer.note}</p>}
                  </div>
                  <ArrowLink href={offer.href} className="mt-auto self-start pt-6">
                    {offer.link}
                  </ArrowLink>
                </Card>
              </li>
            ))}
          </ul>
          <div className="mt-12 flex flex-col gap-6 rounded-[12px] bg-ivory p-7 md:flex-row md:items-center md:justify-between md:p-10">
            <div>
              <p className="jg-h3 font-heading font-semibold text-navy">Vous ne savez pas quel accompagnement choisir ?</p>
              <p className="mt-2">Parlons de votre situation.</p>
            </div>
            <BookingButton source="accueil-accompagnements" />
          </div>
        </Container>
      </Section>

      {/* 8 — Transformations */}
      <Section tone="ivory">
        <Container>
          <SectionHeading
            eyebrow="Transformations"
            title="Quand on comprend mieux son parcours, on ne se présente plus de la même manière."
          >
            <p>
              Révéler ce qui faisait déjà leur valeur a transformé leur manière de se positionner, de décider et d’agir.
            </p>
            <p>
              <strong>Deux parcours. Deux situations. Deux transformations.</strong>
            </p>
          </SectionHeading>
          <ul className="mt-12 grid gap-6 md:grid-cols-2">
            {CASES.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/transformations#${c.slug}`}
                  className="group flex h-full flex-col rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-7 transition-[border-color,translate] duration-200 hover:-translate-y-px hover:border-navy md:p-9"
                >
                  <span className="flex items-center gap-4">
                    <span
                      aria-hidden
                      className="flex size-14 shrink-0 items-center justify-center rounded-full bg-navy font-heading text-[1.25rem] font-semibold text-white"
                    >
                      {c.name[0]}
                    </span>
                    <span>
                      <span className="jg-h4 block font-heading font-semibold text-navy">{c.name}</span>
                      <span className="jg-small block">{c.domain}</span>
                    </span>
                  </span>
                  <span className="mt-6 block font-heading text-[13px] font-semibold tracking-[0.16em] uppercase">
                    Avant
                  </span>
                  <span className="mt-2 block italic">« {c.teaser} »</span>
                  <span className="mt-auto inline-flex items-center gap-2 pt-6 font-heading text-[15px] font-semibold text-navy underline decoration-gold decoration-2 underline-offset-[6px]">
                    Lire le cas pratique
                    <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <ArrowLink href="/transformations" className="mt-10">
            Découvrir 2 cas pratiques
          </ArrowLink>
        </Container>
      </Section>

      {/* 9 — Jérémy Galéa */}
      <Section>
        <Container className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div>
            <SectionHeading eyebrow="Créateur de la Méthode JG®" title="Jérémy Galéa">
              <p className="font-heading text-[1.25rem] leading-snug font-medium text-navy">
                Je ne cherche pas à vous faire devenir quelqu’un d’autre.
              </p>
              <p>
                Je cherche à comprendre ce qui fait votre singularité, à révéler ce qui relie votre parcours et à
                transformer cette compréhension en une valeur assumée, lisible et perceptible.
              </p>
              <p>
                C’est cette conviction qui fonde la Méthode JG® : vous aider à mieux comprendre ce que vous valez, pour
                pouvoir mieux l’incarner et le faire reconnaître.
              </p>
            </SectionHeading>
            <ArrowLink href="/a-propos" className="mt-8">
              Découvrir mon parcours
            </ArrowLink>
          </div>
          <Image
            src={apropos}
            alt="Jérémy Galéa, assis dans un fauteuil, à l’écoute"
            placeholder="blur"
            sizes="(min-width: 1024px) 460px, 100vw"
            className="aspect-[4/5] w-full max-w-[460px] rounded-[12px] object-cover lg:justify-self-end"
          />
        </Container>
      </Section>

      {/* 10 — CTA final */}
      <FinalCta title="La prochaine décision vous appartient." source="accueil-final">
        Votre valeur mérite d’être évidente.
      </FinalCta>
    </>
  );
}
