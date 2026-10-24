import type { Metadata } from "next";
import Image from "next/image";
import { FinalCta, SectionHeading, Statement, Steps, WideFigure } from "@/components/site/blocks";
import { Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import methode from "@/assets/site/methode.webp";
import schemaModele from "@/assets/site/schema-modele-jg.webp";

export const metadata: Metadata = {
  title: "La Méthode JG®",
  description:
    "Révéler ce qui est déjà là. Incarner ce qui fait votre valeur. Clarifier, révéler, incarner : la Méthode JG® de Jérémy Galéa.",
  alternates: { canonical: "/methode" },
};

/** Texts: « Site web JG_brutV2 », onglet LA MÉTHODE JG® (Jérémy, Oct. 2026). */
const MODEL = [
  {
    title: "Clarifier",
    caption: "Comprendre où vous en êtes.",
    text: "Explorer votre parcours, vos motivations et vos priorités pour faire le point.",
  },
  {
    title: "Révéler",
    caption: "Découvrir ce qui vous distingue.",
    text: "Faire émerger vos forces, votre singularité et ce qui crée réellement votre valeur.",
  },
  {
    title: "Incarner",
    caption: "Savoir l’exprimer.",
    text: "Traduire cette compréhension en posture, discours et décisions concrètes.",
  },
] as const;

const EVOLUTIONS = [
  { title: "Compréhension", text: "Une lecture plus claire de votre parcours." },
  { title: "Singularité", text: "Vos forces distinctives mises en lumière." },
  { title: "Expression", text: "Des mots justes et percutants." },
  { title: "Posture", text: "Plus de cohérence et d’alignement." },
  { title: "Impact", text: "Une valeur plus lisible et plus facilement reconnue." },
] as const;

export default function MethodePage() {
  return (
    <>
      {/* Manifeste */}
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div>
            <Eyebrow>La Méthode JG®</Eyebrow>
            <GoldLine className="mt-4" />
            <h1 className="jg-h1 mt-6">
              Révéler ce qui est déjà là.
              <br />
              Incarner ce qui fait votre valeur.
            </h1>
            <div className="jg-prose mt-8 max-w-[620px]">
              <p>Vous n’avez pas besoin de devenir quelqu’un d’autre pour être reconnu à votre juste valeur.</p>
              <p>
                <strong>
                  Vous avez besoin de comprendre ce qui vous distingue et de savoir l’exprimer avec justesse.
                </strong>
              </p>
            </div>
          </div>
          <Image
            src={methode}
            alt="Jérémy Galéa au travail sur un accompagnement"
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 460px, 100vw"
            className="h-auto w-full max-w-[420px] rounded-[12px] lg:justify-self-end"
          />
        </Container>
      </Section>

      {/* Prise de conscience */}
      <Section tone="ivory">
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <SectionHeading title="Votre parcours a plus de cohérence que vous ne le pensez." />
          <div className="jg-prose max-w-[640px] lg:pt-14">
            <p>Vos expériences, vos choix et votre manière d’agir révèlent des constantes qui racontent quelque chose de vous.</p>
            <p>
              <strong>
                La Méthode JG® vous aide à les relier, à faire émerger votre singularité et à transformer cette compréhension
                en une valeur que vous savez exprimer.
              </strong>
            </p>
          </div>
        </Container>
      </Section>

      {/* Le modèle JG® */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Le modèle JG®"
            title="Comprendre où vous en êtes → Découvrir ce qui vous distingue → Savoir l’exprimer"
          />
          <Steps steps={MODEL} className="mt-12" />
          <WideFigure label="Le modèle JG® en trois étapes" className="mt-14 md:mt-20">
            <Image
              src={schemaModele}
              alt="Le modèle JG® en trois étapes. 01, Clarifier : comprendre où vous en êtes, explorer votre parcours, vos motivations et vos priorités pour faire le point. 02, Révéler : découvrir ce qui vous distingue, faire émerger vos forces, votre singularité et ce qui crée réellement votre valeur. 03, Incarner : savoir l’exprimer, traduire cette compréhension en posture, discours et décisions concrètes."
              placeholder="blur"
              sizes="(min-width: 1240px) 1240px, (min-width: 768px) 100vw, 760px"
              className="rounded-[12px]"
            />
          </WideFigure>
        </Container>
      </Section>

      {/* De la valeur réelle à la valeur perçue */}
      <Section tone="navy">
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <GoldLine />
            <h2 className="jg-h2 mt-6">De la valeur réelle à la valeur perçue</h2>
          </div>
          <Statement className="lg:mt-14">
            Réduire l’écart entre ce que vous êtes, ce que vous exprimez et ce que les autres peuvent en comprendre.
          </Statement>
        </Container>
      </Section>

      {/* Ce que la méthode fait évoluer */}
      <Section>
        <Container>
          <SectionHeading title="Ce que la Méthode JG® fait évoluer" />
          <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
            {EVOLUTIONS.map((t) => (
              <li key={t.title} className="border-t-2 border-navy pt-5">
                <h3 className="jg-h4 tracking-[0.06em] uppercase">{t.title}</h3>
                <p className="mt-3">{t.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <FinalCta
        title="Et si vous n’aviez pas besoin de changer ?"
        source="methode"
        glow
        closing={
          <div className="mt-12">
            <Statement>
              <p>Clarifier ce que vous êtes.</p>
              <p className="mt-1">Révéler ce qui vous distingue.</p>
              <p className="mt-1">Incarner ce qui fait votre valeur.</p>
            </Statement>
            <Eyebrow className="mt-6">La Méthode JG®</Eyebrow>
          </div>
        }
      >
        Et si vous aviez surtout besoin de comprendre ce qui est déjà là, de lui donner du sens et de savoir l’exprimer ?
      </FinalCta>
    </>
  );
}
