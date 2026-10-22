import type { Metadata } from "next";
import Image from "next/image";
import { FinalCta, SectionHeading } from "@/components/site/blocks";
import { Container, Eyebrow, Section } from "@/components/site/ui";
import bilan from "@/assets/site/bilan-competences.webp";

export const metadata: Metadata = {
  title: "Bilan de compétences",
  description:
    "Faire le point, envisager une reconversion, retrouver du sens : le bilan de compétences pour définir une direction professionnelle cohérente avec votre situation et vos objectifs.",
  alternates: { canonical: "/bilan-de-competences" },
};

/** Texts: « Site web JG_brutV2 », onglet BILAN DE COMPÉTENCES (Jérémy, Oct. 2026). */
const EXPLORE = [
  ["Votre parcours professionnel", "analyser vos expériences, vos réussites et les enseignements que vous en avez tirés."],
  ["Vos compétences et vos aptitudes", "identifier vos savoir-faire, vos connaissances, vos qualités et vos compétences transférables."],
  ["Vos motivations et vos aspirations", "clarifier vos valeurs, vos besoins et ce qui compte réellement pour vous."],
  ["Vos perspectives professionnelles", "explorer des métiers, des secteurs ou des formations en lien avec votre profil."],
  ["Votre projet professionnel", "construire une orientation réaliste et identifier les étapes nécessaires à sa mise en œuvre."],
] as const;

export default function BilanPage() {
  return (
    <>
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <SectionHeading as="h1" eyebrow="Une autre façon d’avancer" title="Bilan de compétences">
              <p className="font-heading text-[1.125rem] leading-snug font-medium text-[var(--jg-offer-bilan)] md:text-[1.25rem]">
                Et si vous preniez le temps de réfléchir à la suite de votre parcours professionnel ?
              </p>
              <p>
                Vous ressentez le besoin de faire le point, d’envisager une reconversion, de retrouver du sens dans votre
                travail ou de construire un nouveau projet professionnel ?
              </p>
              <p>
                Le bilan de compétences vous permet de prendre du recul sur votre parcours, de mieux identifier vos
                ressources et vos aspirations, et de définir une direction professionnelle cohérente avec votre situation et
                vos objectifs.
              </p>
              <p>
                <strong>
                  L’objectif n’est pas de repartir de zéro, mais de comprendre ce que vous avez construit, ce que vous
                  souhaitez faire évoluer et les possibilités qui s’offrent à vous.
                </strong>
              </p>
            </SectionHeading>
          </div>
          <Image
            src={bilan}
            alt="Le déroulement du bilan de compétences : 1, entretien préalable ; 2, constitution du dossier ; 3, phase préliminaire (analyse de votre parcours, de vos besoins et de vos objectifs) ; 4, phase d’investigation (exploration de vos compétences, de vos motivations et des possibilités professionnelles) ; 5, phase de conclusion (synthèse et projet professionnel réaliste avec un plan d’action). Financement possible selon votre situation."
            placeholder="blur"
            priority
            sizes="(min-width: 1024px) 460px, 100vw"
            className="mx-auto h-auto w-full max-w-[460px] rounded-[12px] border border-[var(--jg-light-gray)] lg:sticky lg:top-28 lg:self-start"
          />
        </Container>
      </Section>

      <Section tone="ivory">
        <Container>
          <Eyebrow>Ce que le bilan de compétences vous permet d’explorer</Eyebrow>
          <span aria-hidden className="mt-4 block h-0.5 w-12 bg-[var(--jg-offer-bilan)]" />
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {EXPLORE.map(([title, text], i) => (
              <li key={title} className="rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-6 md:p-7">
                <p className="font-heading text-[15px] font-semibold text-[var(--jg-offer-bilan)] tabular-nums">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="jg-h4 mt-3 font-heading font-semibold text-navy">{title}</h2>
                <p className="mt-2">{text.charAt(0).toUpperCase() + text.slice(1)}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <SectionHeading title="À qui s’adresse le bilan de compétences ?">
            <p>
              Le bilan de compétences peut notamment concerner les salariés du secteur privé ou public, les demandeurs
              d’emploi et les travailleurs indépendants qui souhaitent faire évoluer leur parcours professionnel.
            </p>
            <p>Aucun niveau de diplôme spécifique n’est requis pour engager cette démarche.</p>
          </SectionHeading>
          <SectionHeading title="Modalités et financement">
            <p>
              Les modalités du bilan de compétences et les possibilités de financement dépendent de votre situation et du
              dispositif mobilisable.
            </p>
            <p>
              Un premier échange gratuit et sans engagement vous permettra de présenter votre besoin, de poser vos questions
              et d’obtenir des informations sur les modalités, le coût et les possibilités de financement applicables à votre
              situation.
            </p>
          </SectionHeading>
        </Container>
      </Section>

      <FinalCta
        title="Vous souhaitez savoir si un bilan de compétences correspond à votre besoin ?"
        source="bilan-de-competences"
        label="Réserver un échange découverte"
        note="Un premier échange pour faire le point sur votre situation et obtenir les informations nécessaires avant de vous engager."
      >
        Commençons par en parler.
      </FinalCta>
    </>
  );
}
