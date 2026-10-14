import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import { FinalCta, SectionHeading } from "@/components/site/blocks";
import { BookingButton, Container, DotList, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import intervention from "@/assets/site/intervention.webp";
import atelier from "@/assets/site/atelier.webp";

export const metadata: Metadata = {
  title: "Pour qui ?",
  description:
    "Particuliers, entrepreneurs, entreprises, cabinets RH et chasseurs de têtes, écoles et universités : votre situation détermine le point de départ.",
  alternates: { canonical: "/pour-qui" },
};

type Audience = {
  id: string;
  profil: string;
  label: string;
  title: string;
  paragraphs: string[];
  cta: string;
  photo?: { src: StaticImageData; alt: string };
};

const AUDIENCES: Audience[] = [
  {
    id: "entrepreneurs",
    profil: "entrepreneur",
    label: "Entrepreneurs",
    title: "Dans un marché ultra-concurrentiel, pourquoi vous plutôt qu’un autre ?",
    paragraphs: [
      "Votre expertise existe. Votre valeur aussi.",
      "Je vous aide à révéler votre singularité et à la rendre suffisamment lisible pour que vos clients comprennent plus rapidement pourquoi vous choisir.",
    ],
    cta: "Parlons de votre positionnement",
  },
  {
    id: "entreprises",
    profil: "entreprise",
    label: "Entreprises",
    title: "Vos talents ont de la valeur. Encore faut-il leur permettre de l’exprimer.",
    paragraphs: [
      "J’aide vos collaborateurs et managers à mieux comprendre leur valeur, prendre leur place et renforcer leur impact.",
      "Un talent mieux positionné, c’est une personne qui contribue davantage — et une organisation qui exploite mieux son potentiel.",
    ],
    cta: "Échangeons sur vos enjeux",
    photo: { src: intervention, alt: "Jérémy Galéa lors d’une intervention en entreprise" },
  },
  {
    id: "cabinets-rh",
    profil: "cabinet_rh",
    label: "Cabinets RH & chasseurs de têtes",
    title: "Vous avez identifié le bon profil. Maintenant, il doit convaincre.",
    paragraphs: [
      "J’aide vos candidats à mieux comprendre, structurer et incarner leur valeur avant les moments décisifs.",
      "Un candidat qui convainc mieux renforce votre recommandation, votre crédibilité auprès de vos clients et vos chances d’aller jusqu’au placement.",
    ],
    cta: "Construire un partenariat",
  },
  {
    id: "ecoles",
    profil: "ecole",
    label: "Écoles & universités",
    title: "Vos étudiants ont les compétences. Ils doivent maintenant savoir les faire choisir.",
    paragraphs: [
      "J’aide vos étudiants à transformer leurs expériences et leur potentiel en une valeur claire et convaincante pour les entreprises.",
      "Des étudiants qui savent mieux se présenter, c’est plus de chances de décrocher des stages et des alternances — et de renforcer l’attractivité de votre établissement.",
    ],
    cta: "Échanger sur une intervention",
    photo: { src: atelier, alt: "Atelier animé par Jérémy Galéa avec un groupe de participants" },
  },
];

const PARTICULIERS = [
  { title: "Étudiant / jeune diplômé", items: ["Stage", "Alternance", "Premier emploi"] },
  { title: "En recherche d’emploi", items: ["Positionnement", "Entretien", "Opportunité"] },
  { title: "En reconversion ou en évolution", items: ["Clarification", "Repositionnement", "Prochaine étape"] },
] as const;

export default function PourQuiPage() {
  return (
    <>
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container>
          <SectionHeading as="h1" eyebrow="Pour qui ?" title="Votre situation détermine le point de départ.">
            <p>Identifiez votre besoin. Je vous aide à trouver la réponse la plus pertinente.</p>
          </SectionHeading>
          <nav aria-label="Publics" className="mt-10">
            <ul className="flex flex-wrap gap-x-6 gap-y-1">
              {[{ id: "particuliers", label: "Particuliers" }, ...AUDIENCES].map((a, i) => (
                <li key={a.id}>
                  <a
                    href={`#${a.id}`}
                    className="inline-flex min-h-11 items-center gap-2 font-heading text-[15px] font-medium text-navy underline decoration-[var(--jg-light-gray)] decoration-2 underline-offset-[6px] hover:decoration-gold"
                  >
                    <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    {a.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </Section>

      {/* 01 — Particuliers */}
      <Section tone="ivory" id="particuliers" className="scroll-mt-20">
        <Container>
          <AudienceHeading index={1} label="Particuliers" title="Vous cherchez votre prochaine étape." />
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {PARTICULIERS.map((p) => (
              <li key={p.title} className="rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-7">
                <h3 className="jg-h4">{p.title}</h3>
                <DotList items={p.items} className="jg-small mt-3" />
              </li>
            ))}
          </ul>
          <BookingButton
            source="pour-qui-particuliers"
            profil="particulier"
            label="Trouver mon accompagnement"
            className="mt-10"
          />
        </Container>
      </Section>

      {AUDIENCES.map((a, i) => (
        <Section key={a.id} id={a.id} tone={i % 2 === 0 ? "white" : "ivory"} className="scroll-mt-20">
          <Container className={a.photo ? "grid items-center gap-12 lg:grid-cols-2 lg:gap-20" : undefined}>
            <div>
              <AudienceHeading index={i + 2} label={a.label} title={a.title} />
              <div className="jg-prose mt-6 max-w-[620px]">
                <p>
                  <strong>{a.paragraphs[0]}</strong>
                </p>
                {a.paragraphs.slice(1).map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <BookingButton source={`pour-qui-${a.id}`} profil={a.profil} label={a.cta} className="mt-10" />
            </div>
            {a.photo ? (
              <Image
                src={a.photo.src}
                alt={a.photo.alt}
                placeholder="blur"
                sizes="(min-width: 1024px) 560px, 100vw"
                className="aspect-[4/3] w-full rounded-[12px] object-cover"
              />
            ) : null}
          </Container>
        </Section>
      ))}

      <FinalCta title="Vous ne savez pas encore où vous situer ?" source="pour-qui">
        Votre situation n’entre pas forcément dans une case. Parlons-en.
      </FinalCta>
    </>
  );
}

function AudienceHeading({ index, label, title }: { index: number; label: string; title: string }) {
  return (
    <div className="max-w-[760px]">
      <Eyebrow>
        <span className="tabular-nums">{String(index).padStart(2, "0")}</span> — {label}
      </Eyebrow>
      <GoldLine className="mt-4" />
      <h2 className="jg-h2 mt-6">{title}</h2>
    </div>
  );
}
