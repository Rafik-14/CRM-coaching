import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import { ExternalLink, Play } from "lucide-react";
import { BOOK } from "@/components/site/content";
import { SectionHeading } from "@/components/site/blocks";
import { siteButton } from "@/components/site/button";
import { Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import livre from "@/assets/site/livre.webp";
import merleGeneve from "@/assets/site/merle-geneve.webp";
import merlePlage from "@/assets/site/merle-plage.webp";
import merleCappadoce from "@/assets/site/merle-cappadoce.webp";
import merleCannes from "@/assets/site/merle-cannes.webp";
import merleDesert from "@/assets/site/merle-desert.webp";
import merleTerrasse from "@/assets/site/merle-terrasse.webp";

export const metadata: Metadata = {
  title: "Le Chant du Merle",
  description:
    "Le Chant du Merle, premier roman de Jérémy Galéa : un conte initiatique à la croisée du roman, du développement personnel et de la quête de soi.",
  alternates: { canonical: "/le-chant-du-merle" },
};

function AmazonLink({ onNavy = false, children }: { onNavy?: boolean; children: React.ReactNode }) {
  return (
    <a href={BOOK.amazon} target="_blank" rel="noopener noreferrer" className={siteButton({ variant: onNavy ? "light" : "primary" })}>
      {children}
      <ExternalLink aria-hidden />
      <span className="sr-only">(nouvel onglet)</span>
    </a>
  );
}

/** Readers' photos of the book around the world (Jérémy, Oct. 2026), shown as a rosette around the JG® monogram. */
const TRAVELS: { src: StaticImageData; alt: string; focus: string }[] = [
  { src: merleGeneve, alt: "Le livre à l’aéroport de Genève, avant l’embarquement", focus: "object-[50%_60%]" },
  { src: merlePlage, alt: "Le livre au bord de la mer, au pied des falaises", focus: "object-[50%_78%]" },
  { src: merleCappadoce, alt: "Le livre sur une terrasse en Cappadoce", focus: "object-[50%_78%]" },
  { src: merleCannes, alt: "Le livre à Cannes, devant le Palais des festivals", focus: "object-[50%_50%]" },
  { src: merleDesert, alt: "Le livre dans les dunes du désert", focus: "object-[50%_62%]" },
  { src: merleTerrasse, alt: "Le livre sur une table, face à la mer", focus: "object-[50%_58%]" },
];

/** Six round photos on a circle (every 60°), joined by a thin gold ring: the book « travels ». */
function BookRosette() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]">
      <span aria-hidden className="absolute inset-[16%] rounded-full border border-gold" />
      <span className="absolute top-1/2 left-1/2 flex size-[26%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-navy">
        <Image src="/brand/jg-monogram-white.svg" alt="" width={64} height={64} unoptimized className="h-auto w-1/2" />
      </span>
      <ul>
        {TRAVELS.map((photo, i) => {
          const angle = ((i * 60 - 90) * Math.PI) / 180;
          return (
            <li
              key={photo.alt}
              className="absolute size-[31%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-[3px] border-white bg-ivory shadow-[0_0_0_1px_var(--jg-gold)]"
              style={{ left: `${50 + 34 * Math.cos(angle)}%`, top: `${50 + 34 * Math.sin(angle)}%` }}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                placeholder="blur"
                sizes="(min-width: 1024px) 180px, 31vw"
                className={cn("size-full object-cover", photo.focus)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BookLinks({ onNavy = false }: { onNavy?: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
      <AmazonLink onNavy={onNavy}>Découvrir le livre sur Amazon</AmazonLink>
      <a
        href={BOOK.trailer}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(siteButton({ variant: onNavy ? "outline-light" : "secondary" }))}
      >
        <Play aria-hidden />
        Découvrir la bande-annonce
        <span className="sr-only">(vidéo YouTube, nouvel onglet)</span>
      </a>
    </div>
  );
}

export default function ChantDuMerlePage() {
  return (
    <>
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <Image
            src={livre}
            alt="Le livre « Le Chant du Merle » de Jérémy Galéa, tenu entre les mains d’une lectrice"
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 460px, 100vw"
            className="order-last h-auto w-full max-w-[420px] rounded-[12px] lg:order-first"
          />
          <div>
            <Eyebrow>Le premier roman de Jérémy Galéa</Eyebrow>
            <GoldLine className="mt-4" />
            <h1 className="jg-h1 mt-6">Le Chant du Merle</h1>
            <p className="mt-6 font-heading text-[1.25rem] leading-snug font-medium text-navy md:text-[1.375rem]">
              Et si une rencontre, une histoire ou un regard différent pouvait changer votre façon de voir la vie ?
            </p>
            <div className="jg-prose mt-8 max-w-[640px]">
              <p>
                <strong>
                  Le Chant du Merle est un conte initiatique à la croisée du roman, du développement personnel et de la
                  quête de soi.
                </strong>
              </p>
              <p>
                À travers le parcours de Léna et les rencontres qui jalonnent son chemin, découvrez une histoire qui invite
                à questionner ses certitudes, à porter un autre regard sur les épreuves et à entrevoir de nouvelles
                possibilités.
              </p>
              <p>
                Écrit à la croisée de ma sensibilité d’auteur et de mon expérience de coach, ce livre porte une conviction :
                nous sommes souvent bien plus que ce que nous croyons être.
              </p>
              <p>
                Une lecture pour ralentir, réfléchir, ressentir… et peut-être découvrir quelque chose de nouveau sur
                vous-même.
              </p>
            </div>
            <div className="mt-10">
              <BookLinks />
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="navy">
        <Container>
          <Eyebrow>Le Chant du Merle</Eyebrow>
          <GoldLine className="mt-4" />
          <div className="jg-glow mt-6">
            <p className="jg-h2 font-heading font-semibold">Derrière chaque porte se cache une vérité.</p>
          </div>
          <div className="mt-10">
            <BookLinks onNavy />
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeading title="Un livre, mille voyages intérieurs">
              <p>De pays en pays, Le Chant du Merle poursuit son chemin.</p>
              <p>
                <strong>Et si le prochain voyage était le vôtre ?</strong>
              </p>
              <p>Parfois, un livre ne se contente pas de nous emmener ailleurs. Il nous invite aussi à nous découvrir autrement.</p>
            </SectionHeading>
            <div className="mt-10">
              <AmazonLink>Découvrir Le Chant du Merle sur Amazon</AmazonLink>
            </div>
          </div>
          <BookRosette />
        </Container>
      </Section>
    </>
  );
}
