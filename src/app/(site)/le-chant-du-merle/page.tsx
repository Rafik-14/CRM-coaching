import type { Metadata } from "next";
import Image from "next/image";
import { ExternalLink, Play } from "lucide-react";
import { BOOK } from "@/components/site/content";
import { siteButton } from "@/components/site/button";
import { Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import livre from "@/assets/site/livre.webp";

export const metadata: Metadata = {
  title: "Le Chant du Merle",
  description:
    "Le Chant du Merle, premier roman de Jérémy Galéa : un conte initiatique à la croisée de la fiction, du développement personnel et de la quête de soi.",
  alternates: { canonical: "/le-chant-du-merle" },
};

function BookLinks({ onNavy = false }: { onNavy?: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
      <a
        href={BOOK.amazon}
        target="_blank"
        rel="noopener noreferrer"
        className={siteButton({ variant: onNavy ? "light" : "primary" })}
      >
        Découvrir le livre sur Amazon
        <ExternalLink aria-hidden />
        <span className="sr-only">(nouvel onglet)</span>
      </a>
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
              Un autre regard sur soi. Une autre façon de regarder la vie.
            </p>
            <div className="jg-prose mt-8 max-w-[640px]">
              <p>
                <strong>Le Chant du Merle est mon premier roman.</strong>
              </p>
              <p>
                Un conte initiatique à la croisée de la fiction, du développement personnel et de la quête de soi.
              </p>
              <p>
                À travers l’histoire de Léna et les rencontres qui vont jalonner son chemin, le récit invite à regarder
                autrement ce que nous vivons, ce que nous croyons être et les possibilités qui s’ouvrent lorsque nous
                acceptons de changer de regard.
              </p>
              <p>
                J’y ai mêlé ma sensibilité d’auteur et mon expérience de coach, avec une conviction simple : nous
                portons souvent en nous bien plus de possibilités que nous ne le pensons.
              </p>
              <p>
                Ce livre est une invitation à ralentir, à s’interroger, à écouter ce qui résonne en soi et, peut-être, à
                regarder son propre parcours… <em>sous un autre angle.</em>
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
          <p className="jg-h2 mt-6 font-heading font-semibold">
            Un voyage initiatique.
            <br />
            Une quête de soi.
            <br />
            Un souffle d’espoir.
          </p>
          <div className="mt-10">
            <BookLinks onNavy />
          </div>
        </Container>
      </Section>
    </>
  );
}
