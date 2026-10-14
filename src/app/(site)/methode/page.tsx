import type { Metadata } from "next";
import Image from "next/image";
import { BeforeAfter, FinalCta, FlowLine, SectionHeading, Statement, Steps, WideFigure } from "@/components/site/blocks";
import { Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import methode from "@/assets/site/methode.webp";
import schemaMethode from "@/assets/site/schema-methode.webp";

export const metadata: Metadata = {
  title: "La Méthode JG®",
  description:
    "Révéler ce qui est déjà là. Incarner ce qui fait votre valeur. Relier, révéler, incarner : la Méthode JG® de Jérémy Galéa.",
  alternates: { canonical: "/methode" },
};

const MODEL = [
  {
    title: "Relier",
    caption: "Comprendre",
    text: "Mettre en lumière les liens entre vos expériences, vos choix et ce qui vous anime.",
  },
  {
    title: "Révéler",
    caption: "Donner du sens",
    text: "Faire émerger votre singularité et ce qui crée réellement votre valeur.",
  },
  {
    title: "Incarner",
    caption: "Rendre visible",
    text: "Transformer cette compréhension en posture, discours et décisions.",
  },
] as const;

const TRANSFORMS = [
  { title: "Compréhension", text: "Comprendre ce qui vous anime et ce qui donne de la cohérence à votre parcours." },
  { title: "Expression", text: "Trouver les mots justes pour exprimer ce que vous apportez et ce qui vous distingue." },
  { title: "Posture", text: "Incarner votre valeur avec davantage de justesse et de cohérence." },
  { title: "Décisions", text: "Disposer d’une lecture plus claire pour choisir votre prochaine direction." },
  { title: "Impact", text: "Rendre votre valeur plus facilement comprise, reconnue et choisie." },
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
                Vous avez besoin de comprendre ce qui fait votre singularité, de mettre des mots dessus et de savoir
                l’incarner.
              </p>
              <p>
                <strong>C’est précisément ce que fait la Méthode JG®.</strong>
              </p>
            </div>
          </div>
          <Image
            src={methode}
            alt="Jérémy Galéa au travail sur un accompagnement"
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 460px, 100vw"
            className="aspect-[4/5] w-full max-w-[460px] rounded-[12px] object-cover lg:justify-self-end"
          />
        </Container>
      </Section>

      {/* Prise de conscience */}
      <Section tone="ivory">
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <SectionHeading title="Et si votre parcours racontait plus que vous ne le pensez ?" />
          <div className="lg:pt-14">
            <div className="jg-prose max-w-[640px]">
              <p>Vos expériences, vos choix et votre manière d’agir ne sont pas des éléments isolés.</p>
              <p>Ils révèlent des constantes, des motivations et des logiques qui donnent du sens à votre parcours.</p>
              <p>
                La Méthode JG® consiste à relier ces éléments pour faire émerger ce que vous ne voyez pas toujours
                vous-même : votre fil conducteur, votre singularité et ce qui fait réellement votre valeur.
              </p>
            </div>
            <Statement className="mt-10">
              <p>Pas pour inventer une identité.</p>
              <p className="mt-1">Pour révéler celle qui existe déjà.</p>
            </Statement>
          </div>
        </Container>
      </Section>

      {/* Mécanisme */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Le modèle JG®" title="Relier → Révéler → Incarner" />
          <Steps steps={MODEL} className="mt-12" />
          <WideFigure label="Schéma de la Méthode JG®" className="mt-14 md:mt-20">
            <Image
              src={schemaMethode}
              alt="Ma méthode en trois étapes : comprendre, donner du sens, rendre visible. Mettre en lumière ce que vous êtes réellement, structurer votre valeur et la formuler clairement, puis adopter la posture, les messages et les supports qui la rendent évidente."
              placeholder="blur"
              sizes="(min-width: 1240px) 1240px, (min-width: 768px) 100vw, 760px"
              className="rounded-[12px]"
            />
          </WideFigure>
        </Container>
      </Section>

      {/* Architecture identitaire */}
      <Section tone="navy">
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <Eyebrow>L’Architecture Identitaire JG®</Eyebrow>
            <GoldLine className="mt-4" />
            <h2 className="jg-h2 mt-6">Ce que vous faites ne raconte jamais toute votre histoire.</h2>
          </div>
          <div className="lg:pt-14">
            <div className="jg-prose max-w-[640px] text-white/85">
              <p>
                Vos choix, vos expériences et votre manière d’agir révèlent parfois des constantes que vous n’aviez
                jamais mises en lien.
              </p>
              <p>
                L’Architecture Identitaire JG® consiste à les observer, les relier et les mettre en cohérence pour faire
                émerger votre identité professionnelle.
              </p>
            </div>
            <Statement className="mt-10">
              <p>Ce n’est pas une identité que l’on invente.</p>
              <p className="mt-1">C’est une identité que l’on révèle.</p>
            </Statement>
          </div>
        </Container>
      </Section>

      {/* Ce que la méthode transforme */}
      <Section>
        <Container>
          <SectionHeading title="Ce que la Méthode JG® transforme" />
          <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
            {TRANSFORMS.map((t) => (
              <li key={t.title} className="border-t-2 border-navy pt-5">
                <h3 className="jg-h4 tracking-[0.06em] uppercase">{t.title}</h3>
                <p className="mt-3">{t.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Avant / après */}
      <Section tone="ivory">
        <Container>
          <SectionHeading title="Le véritable changement" />
          <BeforeAfter
            className="mt-12"
            pairs={[
              {
                before: "Je sais que j’ai de la valeur, mais j’ai du mal à l’expliquer.",
                after: "Je comprends ce qui fait ma valeur et je sais la rendre évidente.",
              },
              { before: "Je cherche à convaincre.", after: "J’incarne ma valeur avec justesse." },
            ]}
          />
        </Container>
      </Section>

      {/* Synthèse */}
      <Section>
        <Container>
          <div className="max-w-[860px]">
            <GoldLine />
            <h2 className="jg-h2 mt-6">La Méthode JG® ne vous apprend pas à jouer un rôle.</h2>
            <p className="mt-6">Elle réduit l’écart entre :</p>
          </div>
          <FlowLine
            strong
            items={["Ce que vous êtes", "Ce que vous exprimez", "Ce que les autres perçoivent"]}
            className="mt-8"
          />
          <div className="mt-12 max-w-[720px]">
            <Statement>
              <p>L’objectif n’est pas de construire une image.</p>
              <p className="mt-1">L’objectif est de rendre votre identité lisible.</p>
            </Statement>
          </div>
        </Container>
      </Section>

      <FinalCta title="Et si vous n’aviez pas besoin de changer ?" source="methode">
        Et si vous aviez surtout besoin de comprendre ce qui était déjà là ?
      </FinalCta>
    </>
  );
}
