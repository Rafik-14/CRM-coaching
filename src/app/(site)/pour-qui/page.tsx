import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import { FinalCta, SectionHeading } from "@/components/site/blocks";
import { BookingButton, Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import intervention from "@/assets/site/intervention.webp";
import logoParticuliers from "@/assets/site/pour-qui-particuliers.webp";
import logoEntrepreneurs from "@/assets/site/pour-qui-entrepreneurs.webp";
import logoEntreprises from "@/assets/site/pour-qui-entreprises.webp";
import logoCabinetsRh from "@/assets/site/pour-qui-cabinets-rh.webp";
import logoEcoles from "@/assets/site/pour-qui-ecoles.webp";

export const metadata: Metadata = {
  title: "Pour qui ?",
  description:
    "Particuliers, entrepreneurs, entreprises, cabinets RH et chasseurs de têtes, écoles et universités : identifions votre enjeu et trouvons le bon point de départ.",
  alternates: { canonical: "/pour-qui" },
};

/** Texts: « Site web JG_brutV2 », onglet POUR QUI ? (Jérémy, Oct. 2026). One logo per audience. */
type Audience = {
  id: string;
  profil: string;
  label: string;
  logo: StaticImageData;
  title: string;
  paragraphs: string[];
  listLabel: string;
  items: string[];
  goal: string;
  cta: string;
  photo?: { src: StaticImageData; alt: string };
};

const PARTICULIERS = {
  id: "particuliers",
  profil: "particulier",
  label: "Particuliers",
  logo: logoParticuliers,
  title: "Vous avez de la valeur. Mais savez-vous vraiment comment la faire reconnaître ?",
  intro:
    "Que vous débutiez, cherchiez un emploi ou envisagiez une nouvelle direction, je vous aide à clarifier ce qui vous distingue et à le traduire en actions concrètes.",
  situations: [
    {
      title: "Étudiant ou jeune diplômé",
      text: "Vous manquez d’expérience, vous préparez un entretien ou vous devez convaincre pour décrocher un stage, une alternance ou un premier emploi.",
    },
    {
      title: "En recherche d’emploi",
      text: "Vous avez des compétences, mais vous peinez à vous démarquer, à valoriser votre parcours ou à convaincre en entretien.",
    },
    {
      title: "En reconversion ou en évolution professionnelle",
      text: "Vous souhaitez changer de direction, retrouver du sens ou évoluer, sans savoir précisément comment valoriser votre expérience et vos atouts.",
    },
  ],
  goal: "savoir ce qui fait votre valeur, où vous souhaitez aller et comment mieux vous présenter.",
  cta: "Trouver mon accompagnement",
} as const;

const AUDIENCES: Audience[] = [
  {
    id: "entrepreneurs",
    profil: "entrepreneur",
    label: "Entrepreneurs",
    logo: logoEntrepreneurs,
    title: "Votre expertise est réelle. Pourquoi vos clients vous choisiraient-ils plutôt qu’un autre ?",
    paragraphs: [
      "Dans un marché concurrentiel, être compétent ne suffit pas toujours. Si votre différence reste floue, vos clients peuvent avoir du mal à comprendre ce qui justifie de vous choisir.",
      "Je vous aide à clarifier votre positionnement, à révéler ce qui vous distingue et à rendre votre valeur plus lisible dans votre discours commercial.",
    ],
    listLabel: "Pour vous aider à :",
    items: [
      "Clarifier ce qui vous différencie réellement.",
      "Expliquer plus simplement la valeur que vous apportez.",
      "Renforcer la cohérence entre votre expertise, votre discours et votre image.",
      "Donner à vos prospects de bonnes raisons de vous choisir.",
    ],
    goal: "ne plus seulement présenter ce que vous faites, mais faire comprendre pourquoi cela compte pour vos clients.",
    cta: "Clarifier mon positionnement",
  },
  {
    id: "entreprises",
    profil: "entreprise",
    label: "Entreprises",
    logo: logoEntreprises,
    title: "Vos collaborateurs ont des compétences. Comment leur permettre de mieux les mobiliser et de les exprimer ?",
    paragraphs: [
      "La performance collective dépend aussi de la capacité de chacun à comprendre sa valeur ajoutée, à trouver sa place et à communiquer efficacement.",
      "J’accompagne les collaborateurs et les managers dans les moments où la posture, la communication et la compréhension de soi influencent la qualité des décisions et des relations professionnelles.",
    ],
    listLabel: "Mes interventions peuvent répondre à des enjeux de :",
    items: [
      "Prise de poste et évolution professionnelle.",
      "Communication et prise de parole.",
      "Valorisation des compétences et des talents.",
      "Positionnement professionnel et confiance dans son rôle.",
      "Préparation aux moments décisifs : présentation, négociation, entretien ou prise de responsabilité.",
    ],
    goal: "permettre à chacun de mieux comprendre sa contribution, de l’exprimer avec justesse et de renforcer son impact professionnel.",
    cta: "Échanger sur vos enjeux",
    photo: { src: intervention, alt: "Jérémy Galéa lors d’une intervention en entreprise" },
  },
  {
    id: "cabinets-rh",
    profil: "cabinet_rh",
    label: "Cabinets RH & chasseurs de têtes",
    logo: logoCabinetsRh,
    title: "Vous avez identifié un profil pertinent. Comment l’aider à convaincre votre client ?",
    paragraphs: [
      "Un candidat peut avoir les compétences recherchées sans parvenir à les rendre suffisamment visibles en entretien. Son expérience est là, mais son discours, sa posture ou sa capacité à expliquer sa valeur peuvent freiner la décision.",
      "J’accompagne les candidats en amont des moments décisifs pour les aider à structurer leur discours, à mieux valoriser leur parcours et à exprimer clairement ce qu’ils peuvent apporter.",
    ],
    listLabel: "Un appui pour :",
    items: [
      "Préparer les candidats aux entretiens à fort enjeu.",
      "Renforcer la clarté de leur positionnement.",
      "Faire émerger les éléments différenciants de leur parcours.",
      "Améliorer leur capacité à défendre leur valeur face aux décideurs.",
    ],
    goal: "vous aider à présenter des candidats mieux préparés, plus clairs dans leur discours et plus capables de défendre leur candidature.",
    cta: "Construire un partenariat",
  },
  {
    id: "ecoles",
    profil: "ecole",
    label: "Écoles & universités",
    logo: logoEcoles,
    title: "Vos étudiants ont du potentiel. Savent-ils le rendre visible auprès des recruteurs ?",
    paragraphs: [
      "Les compétences acquises pendant une formation ne suffisent pas toujours à convaincre un employeur. Encore faut-il savoir présenter ses expériences, expliquer ses points forts et montrer ce que l’on peut apporter.",
      "J’interviens auprès des étudiants et des jeunes diplômés pour les aider à mieux se connaître, à structurer leur discours et à aborder avec plus de clarté les étapes clés de leur insertion professionnelle.",
    ],
    listLabel: "Mes interventions peuvent porter sur :",
    items: [
      "La préparation aux entretiens de stage et d’alternance.",
      "La valorisation des compétences et des expériences.",
      "La prise de parole et la présentation de soi.",
      "La compréhension des attentes des recruteurs.",
      "La capacité à se démarquer sans surjouer ni se dévaloriser.",
    ],
    goal: "aider les étudiants à transformer leurs acquis en arguments concrets et convaincants, au service de leur insertion professionnelle.",
    cta: "Échanger sur une intervention",
  },
];

export default function PourQuiPage() {
  return (
    <>
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container>
          <SectionHeading as="h1" eyebrow="Pour qui ?" title="Votre valeur ne suffit pas toujours à faire la différence.">
            <p>
              Vous avez des compétences, une expérience, un potentiel ou une expertise. Encore faut-il savoir les exprimer, les
              rendre lisibles et les faire reconnaître au bon moment.
            </p>
            <p>
              <strong>Identifions votre enjeu. Trouvons le bon point de départ.</strong>
            </p>
          </SectionHeading>
          {/* Each audience is an entry door: its logo and name, a click away from its section. */}
          <nav aria-label="Publics" className="mt-10">
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {[PARTICULIERS, ...AUDIENCES].map((a, i) => (
                <li key={a.id}>
                  <a
                    href={`#${a.id}`}
                    className="flex h-full flex-col items-center gap-3 rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-4 text-center transition-colors duration-200 hover:border-gold"
                  >
                    <Image src={a.logo} alt="" sizes="112px" className="size-24 rounded-full md:size-28" />
                    <span className="font-heading text-[15px] leading-snug font-semibold text-navy">
                      <span className="block text-[13px] text-navy tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      {a.label}
                    </span>
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
          <AudienceHeading index={1} label={PARTICULIERS.label} logo={PARTICULIERS.logo} title={PARTICULIERS.title} />
          <p className="mt-6 max-w-[720px]">{PARTICULIERS.intro}</p>
          <p className="mt-8 font-semibold text-navy">Vous êtes peut-être dans l’une de ces situations :</p>
          <ul className="mt-4 grid gap-6 md:grid-cols-3">
            {PARTICULIERS.situations.map((p) => (
              <li key={p.title} className="rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-7">
                <h3 className="jg-h4">{p.title}</h3>
                <p className="mt-3">{p.text}</p>
              </li>
            ))}
          </ul>
          <Goal className="mt-10">{PARTICULIERS.goal}</Goal>
          <BookingButton source="pour-qui-particuliers" profil={PARTICULIERS.profil} label={PARTICULIERS.cta} className="mt-8" />
        </Container>
      </Section>

      {AUDIENCES.map((a, i) => (
        <Section key={a.id} id={a.id} tone={i % 2 === 0 ? "white" : "ivory"} className="scroll-mt-20">
          <Container>
            <AudienceHeading index={i + 2} label={a.label} logo={a.logo} title={a.title} />
            <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-20">
              <div>
                <div className="jg-prose max-w-[620px]">
                  {a.paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
                <Goal className="mt-8">{a.goal}</Goal>
                <BookingButton source={`pour-qui-${a.id}`} profil={a.profil} label={a.cta} className="mt-8" />
              </div>
              <div>
                <div className="rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-7 md:p-9">
                  <p className="font-semibold text-navy">{a.listLabel}</p>
                  <ul className="mt-4 grid gap-3">
                    {a.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span aria-hidden className="mt-[0.8em] h-0.5 w-4 shrink-0 bg-gold" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {a.photo && (
                  <Image
                    src={a.photo.src}
                    alt={a.photo.alt}
                    placeholder="blur"
                    sizes="(min-width: 1024px) 440px, 100vw"
                    className="mt-8 h-auto w-full max-w-[440px] rounded-[12px]"
                  />
                )}
              </div>
            </div>
          </Container>
        </Section>
      ))}

      <FinalCta title="Vous ne savez pas encore où vous situer ?" source="pour-qui">
        <p>Vous n’avez pas besoin d’avoir déjà toutes les réponses.</p>
        <p className="mt-3">
          Que votre situation soit claire ou encore en construction, parlons de votre besoin. Nous identifierons ensemble le
          point de départ le plus pertinent.
        </p>
      </FinalCta>
    </>
  );
}

function AudienceHeading({ index, label, logo, title }: { index: number; label: string; logo: StaticImageData; title: string }) {
  return (
    <div className="flex max-w-[900px] flex-col gap-6 sm:flex-row sm:items-start">
      <Image src={logo} alt="" sizes="128px" className="size-24 shrink-0 rounded-full md:size-32" />
      <div>
        <Eyebrow>
          <span className="tabular-nums">{String(index).padStart(2, "0")}</span> — {label}
        </Eyebrow>
        <GoldLine className="mt-4" />
        <h2 className="jg-h2 mt-6">{title}</h2>
      </div>
    </div>
  );
}

/** « L’objectif : … », the closing line of each audience. */
function Goal({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("max-w-[720px]", className)}>
      <strong>L’objectif :</strong> {children}
    </p>
  );
}
