import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { Check } from "lucide-react";
import { BeforeAfter, FinalCta, SectionHeading, Statement } from "@/components/site/blocks";
import { OfferPrice } from "@/components/site/offers";
import { BookingButton, Container, DotList, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import branding from "@/assets/site/branding.webp";

export const metadata: Metadata = {
  title: "Parcours Signature JG®",
  description:
    "Votre valeur mérite plus qu’un moment de préparation. 6 séances individuelles, le Workbook Signature JG® et des exercices interséances.",
  alternates: { canonical: "/accompagnements/parcours-signature" },
};

const AXES = [
  {
    title: "Votre identité",
    text: "Comprendre ce qui vous caractérise réellement et donne sa cohérence à votre parcours.",
  },
  {
    title: "Votre valeur",
    text: "Identifier vos forces distinctives, ce que vous apportez et ce qui mérite d’être mieux exprimé.",
  },
  {
    title: "Votre positionnement",
    text: "Définir la place que vous souhaitez occuper et la contribution que vous voulez y apporter.",
  },
  {
    title: "Votre posture",
    text: "Traduire cette compréhension en une manière plus juste d’agir, de décider et de vous présenter.",
  },
  {
    title: "Votre impact",
    text: "Faire comprendre ce qui vous distingue et rendre votre contribution plus lisible dans vos interactions professionnelles.",
  },
] as const;

const BENEFITS = [
  "6 séances individuelles",
  "Le Workbook Signature JG®",
  "Des Exercices et mises en pratique entre les séances",
  "Un travail progressif sur votre identité, votre valeur, votre positionnement et votre posture",
] as const;

const SIGNS = [
  "votre situation actuelle ne correspond plus à ce que vous êtes devenu(e) ;",
  "vous avez du mal à donner une direction claire à la suite de votre parcours ;",
  "vous sentez que votre potentiel dépasse ce que vous exprimez aujourd’hui ;",
  "Vous souhaitez redéfinir votre identité et votre positionnement professionnels ;",
  "vous êtes prêt(e) à prendre une nouvelle place, mais vous ne savez pas encore comment l’incarner.",
] as const;

export default function ParcoursSignaturePage() {
  return (
    <>
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div>
            <Eyebrow>Accompagnements · Parcours Signature JG®</Eyebrow>
            <GoldLine className="mt-4" />
            <h1 className="jg-h1 mt-6">Votre valeur mérite plus qu’un moment de préparation.</h1>
            <p className="mt-6 font-heading text-[1.25rem] leading-snug font-medium text-navy md:text-[1.375rem]">
              Elle mérite d’être comprise, structurée et pleinement incarnée.
            </p>
            <p className="mt-6 max-w-[620px]">
              Le Parcours Signature JG® s’adresse à celles et ceux qui souhaitent aller au-delà d’un enjeu ponctuel pour
              transformer durablement leur manière de se comprendre, de se positionner et d’incarner leur valeur.
            </p>
            <Suspense fallback={<div className="mt-8 h-9 w-56 animate-pulse rounded-[7px] bg-ivory" />}>
              <OfferPrice slug="parcours-signature" className="mt-8" />
            </Suspense>
            <DotList
              items={["6 séances individuelles", "Workbook Signature JG®", "Exercices interséances"]}
              className="jg-small mt-2 font-medium text-navy"
            />
            <BookingButton source="parcours-signature-hero" className="mt-10" />
          </div>
          <Image
            src={branding}
            alt="Jérémy Galéa, créateur de la Méthode JG®"
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 460px, 100vw"
            className="aspect-[4/5] w-full max-w-[460px] rounded-[12px] object-cover lg:justify-self-end"
          />
        </Container>
      </Section>

      <Section tone="ivory">
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <SectionHeading title="Et si le vrai sujet n’était pas de changer ?">
            <p>Vous sentez qu’une évolution devient nécessaire.</p>
            <p>Peut-être parce que :</p>
          </SectionHeading>
          <div className="lg:pt-14">
            <ul className="grid gap-3">
              {SIGNS.map((sign) => (
                <li key={sign} className="flex gap-3">
                  <span aria-hidden className="mt-[0.8em] h-0.5 w-4 shrink-0 bg-gold" />
                  <span>{sign}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8">
              <strong>Le Parcours Signature JG® commence là où un simple ajustement ne suffit plus.</strong>
            </p>
            <Statement className="mt-8">
              Il ne s’agit pas de repartir de zéro, mais de comprendre ce qui fait votre singularité pour construire la
              suite avec davantage de clarté et de cohérence.
            </Statement>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading title="Un parcours pour comprendre, révéler et incarner" />
          <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
            {AXES.map((axis, i) => (
              <li key={axis.title} className="border-t-2 border-navy pt-5">
                <p className="font-heading text-[15px] font-semibold text-navy tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="jg-h4 mt-2 tracking-[0.04em] uppercase">{axis.title}</h3>
                <p className="mt-3">{axis.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section tone="navy">
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <GoldLine />
            <h2 className="jg-h2 mt-6">6 séances pour construire durablement</h2>
            <p className="mt-6 text-white/85">
              Un accompagnement individuel structuré autour de la Méthode JG®, pour passer de la compréhension de soi à une
              expression plus juste et plus cohérente de sa valeur.
            </p>
          </div>
          <div className="lg:pt-14">
            <p className="font-heading text-[13px] font-semibold tracking-[0.16em] uppercase">Vous bénéficiez de :</p>
            <ul className="mt-4 grid gap-4">
              {BENEFITS.map((b) => (
                <li key={b} className="flex gap-3">
                  <Check aria-hidden className="mt-1 size-5 shrink-0 text-gold" strokeWidth={1.75} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="jg-prose mt-10 text-white/85">
              <p>
                Chaque séance s’inscrit dans une progression pensée pour faire émerger des prises de conscience et les
                traduire en actions concrètes.
              </p>
              <p>L’objectif n’est pas seulement de faire évoluer votre situation actuelle.</p>
              <p>
                <strong>
                  C’est de vous donner des repères solides pour prendre vos décisions, affirmer votre positionnement et
                  exprimer votre valeur bien au-delà de l’accompagnement.
                </strong>
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="ivory">
        <Container>
          <SectionHeading title="Ce qui change" />
          <BeforeAfter
            className="mt-12"
            pairs={[
              {
                before: "Je sais que je peux apporter davantage, mais j’ai du mal à le traduire concrètement.",
                after: "Je comprends ce qui me distingue et je sais comment l’exprimer.",
              },
              {
                before: "Je cherche encore ma place.",
                after: "Je sais quelle place je veux occuper et ce que je veux y apporter.",
              },
              {
                before: "Je ressens le besoin de prouver ma valeur.",
                after: "Je sais ce que je veux faire comprendre et comment rendre ma contribution plus lisible.",
              },
            ]}
          />
        </Container>
      </Section>

      <FinalCta title="Il ne s’agit pas de devenir quelqu’un d’autre." source="parcours-signature">
        <p>Il s’agit de réduire l’écart entre ce que vous êtes, ce que vous exprimez et ce que les autres perçoivent.</p>
        <p className="mt-3">Pour avancer avec plus de clarté, de cohérence et de justesse dans votre vie professionnelle.</p>
      </FinalCta>
    </>
  );
}
