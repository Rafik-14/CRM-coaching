import type { Metadata } from "next";
import Image from "next/image";
import { Check } from "lucide-react";
import { SectionHeading, WideFigure } from "@/components/site/blocks";
import { SCHEMA_ALT } from "@/components/site/content";
import { BookingButton, Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import schemaMethode from "@/assets/site/schema-methode-jg.webp";
import iconeClarifier from "@/assets/site/etape-clarifier-icone.webp";
import iconeReveler from "@/assets/site/etape-reveler-icone.webp";
import iconeIncarner from "@/assets/site/etape-incarner-icone.webp";

export const metadata: Metadata = {
  title: "La Méthode JG®",
  description:
    "Vous avez déjà de la valeur. Apprenez à la rendre évidente. Clarifier, révéler, incarner : la Méthode JG® de Jérémy Galéa.",
  alternates: { canonical: "/methode" },
};

/** Texts and layout: « MODIFICATIONS 2.2 », onglet LA MÉTHODE JG® (Jérémy, Nov. 2026). */
const MODEL = [
  {
    title: "Clarifier",
    image: iconeClarifier,
    ring: "border-navy",
    caption: "Comprendre où vous en êtes.",
    text: "Explorer votre parcours, vos motivations, vos expériences et vos priorités pour identifier vos ressources et donner une direction à votre évolution.",
  },
  {
    title: "Révéler",
    image: iconeReveler,
    ring: "border-gold",
    caption: "Découvrir ce qui vous distingue.",
    text: "Faire émerger vos forces distinctives, votre singularité et les éléments qui constituent votre véritable valeur ajoutée.",
  },
  {
    title: "Incarner",
    image: iconeIncarner,
    ring: "border-[var(--jg-teal)]",
    caption: "Savoir l’exprimer et la faire reconnaître.",
    text: "Traduire cette compréhension en posture, en discours et en actions concrètes pour exprimer votre valeur avec justesse, assurance et impact.",
  },
] as const;

/** The five transformations; the last one (Impact) is the result, set apart. */
const EVOLUTIONS = [
  { title: "Compréhension", text: "Une vision plus claire de votre parcours et de vos ressources." },
  { title: "Singularité", text: "Ce qui vous distingue devient identifiable et assumé." },
  { title: "Expression", text: "Des mots justes pour présenter votre valeur et convaincre." },
  { title: "Posture", text: "Plus de cohérence, d’assurance et d’alignement dans votre manière d’agir." },
  { title: "Impact", text: "Une contribution plus lisible, plus distinctive et plus facilement reconnue." },
] as const;

const VERBS = [
  ["Clarifier", "ce que vous êtes."],
  ["Révéler", "ce qui vous distingue."],
  ["Incarner", "ce qui fait votre valeur."],
] as const;

export default function MethodePage() {
  return (
    <>
      {/* Introduction: ivory, large navy title, the strong sentence in gold. No photograph. */}
      <Section tone="ivory" className="pt-10 md:pt-16 lg:pt-20">
        <Container>
          <Eyebrow>La Méthode JG®</Eyebrow>
          <GoldLine className="mt-4" />
          <h1 className="jg-h1 mt-6 max-w-[980px]">Vous avez déjà de la valeur. Apprenez à la rendre évidente.</h1>
          <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-20">
            <div className="jg-prose max-w-[620px]">
              <p>Vous n’avez pas besoin de devenir quelqu’un d’autre pour être reconnu à votre juste valeur.</p>
              <p className="font-heading text-[1.25rem] leading-snug font-semibold text-[var(--jg-gold-ink)] md:text-[1.375rem]">
                Vous avez besoin de comprendre ce qui vous distingue, de savoir l’exprimer et de le faire reconnaître.
              </p>
            </div>
            <div className="jg-prose max-w-[620px]">
              <p>
                La Méthode JG® part d’une conviction : votre valeur ne se résume ni à votre CV, ni à vos compétences, ni à
                votre parcours. Elle se révèle aussi dans vos choix, vos expériences, votre manière de penser et ce que vous
                apportez aux autres.
              </p>
              <p>
                Mon rôle est de vous aider à identifier cette richesse, à lui donner du sens et à la traduire en une
                expression claire, crédible et distinctive.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Prise de conscience, then the diagram in large format as the centrepiece. */}
      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-20">
            <SectionHeading title="Votre parcours a plus de cohérence que vous ne le pensez." />
            <div className="jg-prose max-w-[640px] lg:pt-14">
              <p>
                Vos expériences, vos choix et même vos détours ont façonné une manière de penser, d’agir et de contribuer qui
                vous est propre.
              </p>
              <p>Des constantes se dessinent. Des forces se révèlent. Une singularité émerge.</p>
              <p>
                <strong>Encore faut-il savoir les reconnaître, les relier et leur donner une direction.</strong>
              </p>
              <p>C’est précisément le point de départ de la Méthode JG®.</p>
            </div>
          </div>
          <WideFigure label="Schéma : de la valeur réelle à la valeur perçue" className="mx-auto mt-16 max-w-[1120px] md:mt-24 lg:mt-28">
            <Image
              src={schemaMethode}
              alt={SCHEMA_ALT}
              placeholder="blur"
              sizes="(min-width: 1120px) 1120px, (min-width: 768px) 100vw, 760px"
              className="rounded-[12px] shadow-[0_18px_48px_rgba(23,37,54,0.12)]"
            />
          </WideFigure>
        </Container>
      </Section>

      {/* Le modèle JG®: each step with its own picture beside it. */}
      <Section tone="ivory">
        <Container>
          <SectionHeading title="Du potentiel à l’évidence : le modèle JG®">
            <p>
              Votre valeur existe déjà. Mais entre ce que vous possédez réellement et ce que les autres en perçoivent, il
              peut y avoir un écart.
            </p>
            <p>
              La Méthode JG® vous accompagne dans ce passage : faire émerger votre singularité et transformer ce que vous
              êtes en une valeur clairement comprise et reconnue.
            </p>
          </SectionHeading>
          <ol className="mt-12 grid gap-6 md:mt-16 lg:grid-cols-3">
            {MODEL.map((step, i) => (
              <li key={step.title} className="flex gap-5 rounded-[12px] bg-white p-6 md:p-7">
                <span aria-hidden className={cn("size-20 shrink-0 overflow-hidden rounded-full border-[3px] bg-white", step.ring)}>
                  <Image src={step.image} alt="" sizes="80px" className="size-full object-cover" />
                </span>
                <div>
                  <h3 className="font-heading text-[15px] font-semibold tracking-[0.12em] text-navy uppercase">
                    <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span aria-hidden className="mx-2 text-gold">
                      —
                    </span>
                    {step.title}
                  </h3>
                  <p className="mt-2 font-heading font-semibold text-navy">{step.caption}</p>
                  <p className="mt-3">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Ce que la Méthode JG® fait évoluer: four transformations lead to the result, Impact, revealed on navy. */}
      <Section>
        <Container>
          <SectionHeading title="Ce que la Méthode JG® fait évoluer">
            <p>
              Au-delà d’une meilleure connaissance de vous-même, la démarche transforme votre manière de vous positionner et
              de faire comprendre ce que vous apportez.
            </p>
          </SectionHeading>
          <ol
            data-reveal-children
            className="mt-12 grid gap-4 md:mt-16 md:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.35fr)] lg:items-stretch lg:gap-5"
          >
            {EVOLUTIONS.map((t, i) => {
              const result = i === EVOLUTIONS.length - 1;
              return (
                <li
                  key={t.title}
                  className={cn(
                    "flex flex-col rounded-[12px] border p-6",
                    result
                      ? "jg-on-navy border-gold bg-navy text-white shadow-[0_0_0_6px_rgba(212,168,102,0.2)] md:col-span-2 lg:col-span-1 lg:p-8"
                      : "border-[var(--jg-light-gray)] bg-white",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("flex items-center justify-center rounded-full bg-gold text-navy", result ? "size-12" : "size-9")}
                  >
                    <Check className={result ? "size-6" : "size-5"} strokeWidth={2.5} />
                  </span>
                  <h3
                    className={cn(
                      "mt-5 font-heading font-semibold tracking-[0.08em] uppercase",
                      result ? "text-[1.5rem] text-gold" : "text-[15px] text-navy",
                    )}
                  >
                    {t.title}
                  </h3>
                  <p className={cn("mt-3", result ? "text-[1.0625rem] text-white/90" : "text-[15px]")}>{t.text}</p>
                </li>
              );
            })}
          </ol>
        </Container>
      </Section>

      {/* Conclusion: navy, the three verbs, gold button. */}
      <Section tone="navy">
        <Container>
          <GoldLine />
          <div className="jg-glow mt-6">
            <h2 className="jg-h2 max-w-[820px]">Et si vous n’aviez pas besoin de devenir quelqu’un d’autre ?</h2>
            <div className="mt-5 grid max-w-[760px] gap-4 font-heading text-[1.125rem] leading-snug font-medium text-white/85 md:text-[1.25rem]">
              <p>
                Et si la différence ne résidait pas dans ce que vous devez encore acquérir, mais dans ce que vous n’avez pas
                encore pleinement identifié, compris et appris à exprimer ?
              </p>
              <p>Vous avez déjà construit quelque chose. Il est temps de lui donner toute sa portée.</p>
            </div>
          </div>
          <ul className="mt-12 grid gap-3 md:grid-cols-3 md:gap-6">
            {VERBS.map(([verb, rest]) => (
              <li key={verb} className="border-t border-white/20 pt-4 font-heading text-[1.125rem] font-semibold md:text-[1.25rem]">
                <span className="tracking-[0.08em] text-gold uppercase">{verb}</span> {rest}
              </li>
            ))}
          </ul>
          <div className="mt-12">
            <Eyebrow>Méthode JG®</Eyebrow>
            <p className="mt-2 font-heading text-white/85">Révéler votre potentiel.</p>
            <p className="mt-6 max-w-[720px] font-heading text-[1.25rem] leading-snug font-semibold md:text-[1.375rem]">
              Votre valeur existe. Faites en sorte qu’elle ne passe plus inaperçue.
            </p>
          </div>
          <BookingButton source="methode" variant="accent" className="mt-10" />
        </Container>
      </Section>
    </>
  );
}
