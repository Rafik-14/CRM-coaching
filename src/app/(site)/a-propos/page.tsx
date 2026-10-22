import type { Metadata } from "next";
import Image from "next/image";
import { SectionHeading, Statement } from "@/components/site/blocks";
import { BookingButton, ButtonLink, Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import apropos from "@/assets/site/apropos.webp";
import branding from "@/assets/site/branding.webp";
import futsal from "@/assets/site/apropos-futsal.webp";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Jérémy Galéa, coach et formateur pour adultes depuis plus de 10 ans, créateur de la Méthode JG®. « Je ne cherche pas à vous faire devenir quelqu’un d’autre. »",
  alternates: { canonical: "/a-propos" },
};

/** Short lines read one after the other (a « stack »), with a gold dash. */
function LineStack({ lines }: { lines: readonly string[] }) {
  return (
    <ul className="grid gap-2">
      {lines.map((line) => (
        <li key={line} className="flex gap-3 font-heading text-[1.0625rem] font-medium text-navy md:text-[1.125rem]">
          <span aria-hidden className="mt-[0.75em] h-0.5 w-4 shrink-0 bg-gold" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AProposPage() {
  return (
    <>
      {/* Titre fort + manifeste + photo fauteuil */}
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div>
            <Eyebrow>À propos · Créateur de la Méthode JG®</Eyebrow>
            <GoldLine className="mt-4" />
            <h1 className="jg-h1 mt-6">Jérémy Galéa</h1>
            <div className="mt-8 font-heading text-[1.375rem] leading-snug font-semibold text-navy md:text-[1.625rem]">
              <p>Je ne cherche pas à vous faire devenir quelqu’un d’autre.</p>
              <p className="mt-1">Je cherche à comprendre ce qui est déjà là.</p>
            </div>
            <div className="jg-prose mt-8 max-w-[620px]">
              <p>
                Depuis plus de 10 ans, j’accompagne des adultes dans des moments où quelque chose doit évoluer :
                transition professionnelle, recherche d’emploi, entretien à fort enjeu, repositionnement, prise de poste
                ou perte de confiance.
              </p>
              <p>
                J’ai accompagné des centaines de personnes, aux parcours, aux métiers et aux personnalités très
                différents.
              </p>
              <p>
                <strong>Et c’est précisément cette diversité qui a construit mon regard.</strong>
              </p>
            </div>
          </div>
          <Image
            src={apropos}
            alt="Jérémy Galéa, assis dans un fauteuil, à l’écoute"
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 460px, 100vw"
            className="aspect-[4/5] w-full max-w-[460px] rounded-[12px] object-cover lg:justify-self-end"
          />
        </Container>
      </Section>

      {/* Mon regard */}
      <Section tone="ivory">
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeading eyebrow="Mon regard" title="Je regarde souvent là où l’on ne regarde pas." />
            <div className="mt-8">
              <LineStack
                lines={[
                  "Une expérience qui semble anodine.",
                  "Un mot qui revient.",
                  "Une réaction.",
                  "Une façon de décider.",
                  "Une contradiction.",
                  "Une qualité que la personne considère comme « normale », alors qu’elle est précisément l’une de ses forces.",
                ]}
              />
            </div>
          </div>
          <div className="lg:pt-14">
            <div className="jg-prose max-w-[640px]">
              <p>
                <strong>Je cherche les liens. Les constantes. Les corrélations.</strong>
              </p>
              <p>Parce que derrière un parcours, il existe souvent une logique que l’on ne voit pas soi-même.</p>
              <p>
                Mon rôle consiste à regarder sous un autre angle, à relier ce qui semblait dispersé et à faire émerger ce
                qui donne du sens à votre parcours.
              </p>
            </div>
            <Statement className="mt-10">C’est souvent à cet endroit que quelque chose change.</Statement>
          </div>
        </Container>
      </Section>

      {/* Ce qui m'anime */}
      <Section>
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <SectionHeading eyebrow="Ce qui m’anime" title="Au fil des accompagnements, j’ai vu la même scène se répéter.">
            <p>
              <strong>Des personnes brillantes, expérimentées, engagées.</strong>
            </p>
            <p>
              Des indépendants qui avaient construit une activité pertinente mais qui peinaient à expliquer en quelques
              mots ce qui faisait réellement leur valeur.
            </p>
            <p>
              Des professionnels aux parcours remarquables et à l’expertise de pointe qui, en quelques minutes face à un
              recruteur, un client ou un décideur, n’arrivaient plus à faire entendre tout ce qu’ils avaient à offrir.
            </p>
          </SectionHeading>
          <div className="lg:pt-14">
            <p>Et surtout, j’ai vu dans leurs regards quelque chose qui m’a profondément marqué.</p>
            <div className="mt-6">
              <LineStack lines={["La déception.", "L’incompréhension.", "Parfois même une forme d’impuissance."]} />
            </div>
            <div className="jg-prose mt-8">
              <p>Ils savaient ce qu’ils valaient.</p>
              <p>Mais ils ne trouvaient pas les mots pour le rendre évident.</p>
              <p>
                Je ne supportais plus l’idée que des personnes puissent passer à côté d’une opportunité, d’un projet,
                d’un rêve ou d’une ambition simplement parce qu’elles n’arrivaient pas à exprimer ce qu’elles portaient
                en elles.
              </p>
              <p>C’est là qu’est née ma conviction profonde :</p>
            </div>
            <Statement className="mt-6">Aider l’être humain avant tout.</Statement>
            <p className="mt-6">
              L’aider à comprendre ce qui fait sa valeur, à mettre des mots sur ce qui le rend singulier et à le rendre
              visible au moment où une décision se prend.
            </p>
          </div>
        </Container>
      </Section>

      {/* Une capacité construite sur le terrain */}
      <Section tone="navy">
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <Eyebrow>Une capacité construite sur le terrain</Eyebrow>
            <GoldLine className="mt-4" />
            <h2 className="jg-h2 mt-6">Deux univers différents, mais une même conviction.</h2>
            <Image
              src={futsal}
              alt="Jérémy Galéa avec une équipe de futsal qu’il entraînait, après la victoire en finale, trophée au premier plan"
              placeholder="blur"
              sizes="(min-width: 1024px) 560px, 100vw"
              className="mt-8 h-auto w-full rounded-[12px]"
            />
          </div>
          <div className="lg:pt-14">
            <div className="jg-prose text-white/85">
              <p>Je suis formateur pour adultes et coach depuis plus de 10 ans.</p>
              <p>J’ai également été coach de futsal à Paris, auprès de plusieurs équipes.</p>
            </div>
            <Statement className="mt-8">
              On ne fait pas progresser quelqu’un en lui imposant une manière d’être.
            </Statement>
            <div className="jg-prose mt-8 text-white/85">
              <p>
                On l’aide à comprendre ses forces, à prendre conscience de ce qu’il possède déjà et à trouver la manière
                juste de l’exprimer dans l’action.
              </p>
              <p>
                Au fil des années, cette capacité à observer, écouter, questionner, relier et faire émerger est devenue
                le cœur de mon métier.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Des parcours différents */}
      <Section>
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <SectionHeading title="Des parcours différents. Une même constante.">
            <p>
              J’ai accompagné des personnes qui cherchaient leur premier emploi, d’autres qui souhaitaient se reconvertir,
              évoluer, retrouver confiance ou prendre une nouvelle place.
            </p>
          </SectionHeading>
          <div className="lg:pt-14">
            <LineStack
              lines={[
                "Des profils très différents.",
                "Des histoires très différentes.",
                "Des niveaux d’expérience très différents.",
              ]}
            />
            <p className="mt-8">Mais une constante revient :</p>
            <Statement className="mt-4">leur valeur était souvent déjà là.</Statement>
            <p className="mt-6">Elle avait simplement besoin d’être comprise, mise en cohérence et rendue lisible.</p>
          </div>
        </Container>
      </Section>

      {/* Ce que je cherche à provoquer */}
      <Section tone="ivory">
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <SectionHeading title="Ce que je cherche à provoquer">
            <p>Je ne cherche pas seulement à vous aider à mieux parler de vous.</p>
            <p>Je cherche à provoquer un changement plus profond :</p>
          </SectionHeading>
          <div className="lg:pt-14">
            <LineStack
              lines={[
                "mieux comprendre votre parcours,",
                "mieux comprendre votre valeur,",
                "mieux comprendre votre manière d’agir,",
              ]}
            />
            <p className="mt-6">
              <strong>pour ensuite agir, décider et vous présenter différemment.</strong>
            </p>
            <div className="jg-prose mt-8">
              <p>Parce que lorsque votre perception de vous-même évolue, votre manière d’agir évolue aussi.</p>
              <p>
                Et lorsque votre manière d’agir évolue, ce que les autres perçoivent de vous peut changer à son tour.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Ma conviction + photo branding */}
      <Section>
        <Container className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <Image
            src={branding}
            alt="Portrait de Jérémy Galéa devant le logo de la Méthode JG®"
            placeholder="blur"
            sizes="(min-width: 1024px) 460px, 100vw"
            className="order-last aspect-[4/5] w-full max-w-[460px] rounded-[12px] object-cover lg:order-first"
          />
          <div>
            <Eyebrow>Ma conviction</Eyebrow>
            <GoldLine className="mt-4" />
            <h2 className="jg-h2 mt-6">
              Votre valeur n’a pas besoin d’être inventée.
              <br />
              Elle a besoin d’être révélée.
            </h2>
            <div className="jg-prose mt-8 max-w-[640px]">
              <p>
                Votre parcours contient déjà des expériences, des choix, des réussites, des difficultés, des qualités et
                des comportements qui racontent quelque chose de vous.
              </p>
              <p>
                Mon travail consiste à les relier pour faire apparaître ce qui était déjà là — puis à vous aider à
                l’incarner et à le rendre évident au moment où une décision se prend.
              </p>
              <p>
                <strong>C’est de cette conviction qu’est née la Méthode JG®.</strong>
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Sous un autre angle */}
      <Section tone="navy">
        <Container>
          <GoldLine />
          <h2 className="jg-h2 mt-6">Sous un autre angle.</h2>
          <div className="mt-5 max-w-[720px] font-heading text-[1.25rem] leading-snug font-medium text-white/85 md:text-[1.375rem]">
            <p>Parfois, la réponse n’est pas de chercher davantage.</p>
            <p className="mt-1">Elle consiste simplement à regarder autrement ce qui était déjà là.</p>
          </div>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <BookingButton source="a-propos" variant="light" />
            <ButtonLink href="/methode" variant="outline-light">
              Découvrir la Méthode JG®
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
