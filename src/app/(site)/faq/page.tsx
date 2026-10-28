import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { FinalCta, SectionHeading } from "@/components/site/blocks";
import { priceLine } from "@/components/site/offers";
import { LEGAL_PAGES_PUBLISHED } from "@/components/site/nav";
import { Container, Section } from "@/components/site/ui";
import { getPublicOffers } from "@/server/queries/site";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Les réponses aux questions les plus fréquentes : choisir son accompagnement, la Méthode JG®, le nombre de séances, le premier échange, le paiement.",
  alternates: { canonical: "/faq" },
};

/** « Combien de séances faut-il prévoir ? » — offers and prices from the CRM. */
async function OfferPrices() {
  await connection();
  const offers = await getPublicOffers();
  return (
    <ul className="grid gap-1">
      {offers.map((o) => (
        <li key={o.id}>
          <strong>{o.name}</strong> : {o.sessionsCount} séance{o.sessionsCount > 1 ? "s" : ""} — {priceLine(o, false)}
        </li>
      ))}
    </ul>
  );
}

const QUESTIONS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Je ne sais pas quel accompagnement choisir. Comment savoir lequel est fait pour moi ?",
    a: (
      <>
        <p>Vous n’avez pas besoin de le savoir avant de commencer.</p>
        <p>
          Votre situation, votre objectif et ce que vous souhaitez faire évoluer permettent de déterminer le point de
          départ le plus pertinent.
        </p>
        <p>Le premier échange stratégique sert précisément à cela.</p>
      </>
    ),
  },
  {
    q: "Est-ce du coaching professionnel classique ?",
    a: (
      <>
        <p>
          La Méthode JG® ne consiste pas simplement à vous donner des conseils ou à vous apprendre à mieux vous
          présenter.
        </p>
        <p>
          Le travail commence par une compréhension approfondie de votre parcours, de vos expériences, de vos choix et
          de ce qui vous anime.
        </p>
        <p>
          L’objectif est de faire émerger ce qui fait votre singularité, puis de transformer cette compréhension en
          posture, en discours et en décisions.
        </p>
      </>
    ),
  },
  {
    q: "Je sais déjà ce que je fais. Pourquoi aurais-je besoin d’un accompagnement ?",
    a: (
      <>
        <p>Parce que savoir faire n’est pas toujours savoir expliquer, incarner ou faire percevoir sa valeur.</p>
        <p>
          Vous pouvez avoir de l’expérience, des compétences et des résultats, tout en ayant du mal à mettre des mots
          sur ce qui vous distingue réellement.
        </p>
        <p>
          L’accompagnement permet de prendre du recul, de relier les éléments de votre parcours et de rendre votre
          valeur plus lisible — pour vous comme pour les autres.
        </p>
      </>
    ),
  },
  {
    q: "Est-ce que l’accompagnement consiste à apprendre à mieux se vendre ?",
    a: (
      <>
        <p>Pas au sens classique du terme.</p>
        <p>
          Je ne cherche pas à vous apprendre à jouer un rôle ou à construire une image qui ne vous ressemble pas.
        </p>
        <p>Je cherche d’abord à comprendre ce qui fait réellement votre valeur.</p>
        <p>
          Lorsque cette valeur est claire, il devient plus naturel de savoir quoi dire, comment le dire et comment
          l’incarner.
        </p>
      </>
    ),
  },
  {
    q: "Combien de séances faut-il prévoir ?",
    a: (
      <>
        <p>Cela dépend de votre objectif.</p>
        <Suspense fallback={<div className="h-20 animate-pulse rounded-[7px] bg-ivory" />}>
          <OfferPrices />
        </Suspense>
        <p>Vous n’avez donc pas besoin de vous engager immédiatement dans un parcours long.</p>
        <p>Nous déterminons d’abord ce dont votre situation a réellement besoin.</p>
        <p className="jg-small">
          Les tarifs sont indiqués en euros et en francs suisses selon la zone de facturation. Les montants sont définis
          séparément et ne correspondent pas à une conversion au taux de change en vigueur.
        </p>
      </>
    ),
  },
  {
    q: "Est-ce que je peux être accompagné même si je ne sais pas encore exactement ce que je veux faire ?",
    a: (
      <>
        <p>Oui.</p>
        <p>C’est même souvent un excellent point de départ.</p>
        <p>L’accompagnement ne consiste pas nécessairement à partir d’un projet déjà défini.</p>
        <p>
          Il peut commencer par une question plus fondamentale : « Qu’est-ce qui me correspond réellement et vers quoi
          ai-je envie d’aller ? »
        </p>
        <p>
          Le travail sur votre parcours permet alors de faire émerger des éléments qui peuvent vous aider à construire
          la suite avec davantage de clarté.
        </p>
      </>
    ),
  },
  {
    q: "Est-ce adapté aux personnes qui ont déjà beaucoup d’expérience ?",
    a: (
      <>
        <p>Oui.</p>
        <p>
          L’accompagnement peut être pertinent aussi bien pour un étudiant ou un jeune diplômé que pour un professionnel
          expérimenté, un manager, un entrepreneur ou une personne qui souhaite prendre une nouvelle place.
        </p>
        <p>
          L’expérience n’est pas un obstacle. Elle constitue souvent une matière particulièrement riche à relier et à
          comprendre.
        </p>
      </>
    ),
  },
  {
    q: "Comment se passe le premier échange ?",
    a: (
      <>
        <p>Le premier échange dure 20 minutes.</p>
        <p>
          Il permet de comprendre votre situation, ce que vous cherchez à faire évoluer et ce qui vous amène
          aujourd’hui.
        </p>
        <p>
          Nous regardons ensuite ensemble si un accompagnement JG® est pertinent et, si c’est le cas, quel point de
          départ est le plus adapté à votre situation.
        </p>
        <p>Cet échange n’est pas un engagement.</p>
      </>
    ),
  },
  {
    q: "Comment se déroulent les accompagnements ?",
    a: (
      <>
        <p>
          Les accompagnements individuels se déroulent en présentiel, dans un cadre propice à l’échange et à la réflexion,
          ou à distance en visioconférence.
        </p>
        <p>
          Chaque séance est conçue pour vous offrir un accompagnement personnalisé, adapté à vos besoins et à vos
          objectifs.
        </p>
        <p>
          Les modalités sont précisées lors de notre premier échange, afin de vous proposer le format le plus adapté à
          votre situation.
        </p>
      </>
    ),
  },
  {
    q: "Comment fonctionne le paiement des accompagnements ?",
    a: (
      <>
        <p>Les modalités de paiement sont précisées avant le début de l’accompagnement.</p>
        <p>
          Les séances et accompagnements sont réglés selon les modalités indiquées lors de la réservation ou de la
          confirmation de l’accompagnement.
        </p>
        <p>
          Pour les accompagnements en plusieurs séances, les modalités sont communiquées clairement en amont afin que
          vous sachiez exactement ce qui est compris, le montant à régler et à quel moment.
        </p>
        <p>
          Pour connaître l’ensemble des conditions applicables, vous pouvez consulter les{" "}
          {LEGAL_PAGES_PUBLISHED ? (
            <Link href="/cgv" className="font-semibold text-navy underline underline-offset-2">
              CGV
            </Link>
          ) : (
            "CGV"
          )}
          .
        </p>
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <>
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container>
          <SectionHeading as="h1" eyebrow="FAQ" title="Vous avez une question avant de commencer ?">
            <p>Voici les réponses aux questions que l’on me pose le plus souvent.</p>
          </SectionHeading>
          <div className="mt-12 max-w-[880px] border-t border-[var(--jg-light-gray)]">
            {QUESTIONS.map((item) => (
              <details key={item.q} className="group border-b border-[var(--jg-light-gray)]">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 font-heading text-[1.0625rem] font-semibold text-navy md:text-[1.1875rem] [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <Plus
                    aria-hidden
                    className="size-5 shrink-0 text-gold transition-transform duration-200 group-open:rotate-45"
                    strokeWidth={1.75}
                  />
                </summary>
                <div className="jg-prose max-w-[720px] pb-8">{item.a}</div>
              </details>
            ))}
          </div>
        </Container>
      </Section>
      <FinalCta title="Parlons de votre situation." source="faq">
        20 minutes pour parler de votre situation. Sans engagement.
      </FinalCta>
    </>
  );
}
