"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { createAtelier } from "./atelier-art";

/**
 * The eight parts of the test, in Jérémy's question order (no reordering): Q01–Q04, Q05–Q08 … Q29–Q30.
 * Each part is explained full screen before its questions, with its drawing beside the text.
 *
 * DRAFT WORDING — the explanations below were written for the design and speak for the method:
 * to be read and approved by Jérémy before going live.
 */
export const PARTS = [
  { first: 1, last: 4, name: "Le prisme", bg: "#d9dfe3", dim: "Conscience de soi", title: "Reconnaître ce qui vous distingue.", text: "Ces affirmations portent sur la façon dont vous percevez vos propres qualités : ce que vous apportez réellement, ce qui vous rend singulier, au-delà de votre poste ou de vos compétences techniques.", image: "Comme un prisme révèle les couleurs contenues dans une seule lumière." },
  { first: 5, last: 8, name: "Les socles", bg: "#dcdedb", dim: "Positionnement", title: "Prendre votre place.", text: "Ici, il s’agit de la manière dont vous défendez vos idées, posez vos limites et occupez votre place, sans vous comparer ni vous effacer.", image: "Chaque socle trouve sa propre hauteur." },
  { first: 9, last: 12, name: "La page", bg: "#e0dcd1", dim: "Expression", title: "Mettre des mots sur votre valeur.", text: "Ces affirmations explorent votre capacité à dire clairement ce qui vous caractérise, à montrer ce que vous apportez concrètement, et à l’adapter à la personne en face de vous.", image: "Ce que vous savez devient des mots." },
  { first: 13, last: 16, name: "Les deux sphères", bg: "#e1d9ca", dim: "Impact relationnel", title: "Faire vivre l’échange.", text: "Ici, il s’agit de la confiance que vous créez, de la manière dont vous êtes perçu, et de votre façon d’ajuster votre message quand il ne passe pas.", image: "Ce qui circule entre deux personnes." },
  { first: 17, last: 20, name: "L’équilibre", bg: "#e1d5c0", dim: "Incarnation", title: "Agir avec cohérence quand l’enjeu augmente.", text: "Ces affirmations portent sur votre manière d’agir sous pression : mobiliser vos ressources, rester cohérent entre ce que vous pensez, dites et faites, et passer de l’intention à l’action.", image: "Rester stable quand le poids augmente." },
  { first: 21, last: 24, name: "Le fil", bg: "#e0d1b6", dim: "Second regard · votre parcours", title: "Ce qui revient, ce qui vous appartient.", text: "Ces affirmations reviennent sur les qualités qui traversent votre parcours, sur votre valeur au-delà de votre fonction, et sur votre légitimité à faire vos propres choix.", image: "Un même fil traverse chaque étape." },
  { first: 25, last: 28, name: "L’iris", bg: "#decdae", dim: "Second regard · l’échange", title: "Être compris, comprendre l’autre.", text: "Ici, il s’agit de faire comprendre ce qui vous distingue, d’aller à l’essentiel, et de prendre le temps d’écouter avant de chercher à convaincre.", image: "Faire la mise au point, sur soi et sur l’autre." },
  { first: 29, last: 30, name: "La boussole", bg: "#dcc9a4", dim: "Second regard · le cap", title: "Garder votre direction.", text: "Ces deux dernières affirmations portent sur votre manière de prendre du recul face à une émotion forte, et de poursuivre ce qui compte malgré les imprévus.", image: "L’aiguille hésite, puis se stabilise." },
] as const;

export const partOf = (questionNumber: number) => Math.max(0, PARTS.findIndex((p) => questionNumber >= p.first && questionNumber <= p.last));
const qn = (n: number) => `Q${String(n).padStart(2, "0")}`;

/**
 * The stage: full screen while a part is explained, then the left half beside the questions
 * (top of the screen on phones). The drawing lives here and changes with the part.
 */
export function AtelierStage({
  part,
  full,
  leaving,
  pulseKey,
  answered,
  current,
  ownership,
  onBegin,
}: {
  part: number;
  full: boolean;
  leaving: boolean;
  pulseKey: number;
  answered: boolean[];
  current: number;
  ownership: string;
  onBegin: () => void;
}) {
  const artRoot = useRef<HTMLDivElement>(null);
  const atelier = useRef<ReturnType<typeof createAtelier> | null>(null);
  const go = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!artRoot.current) return;
    const a = createAtelier(artRoot.current);
    atelier.current = a;
    return () => { a.destroy(); atelier.current = null; };
  }, []);
  useEffect(() => atelier.current?.show(part), [part]);
  useEffect(() => { if (pulseKey) atelier.current?.pulse(); }, [pulseKey]);

  // The explanation fades in once the stage has opened, and its button takes the focus.
  useEffect(() => {
    if (!full) return;
    const t = window.setTimeout(() => { setShown(true); go.current?.focus({ preventScroll: true }); }, 450);
    return () => { window.clearTimeout(t); setShown(false); };
  }, [full, part]);

  const p = PARTS[part];
  return (
    <div className="rv-stage" style={{ backgroundColor: p.bg }}>
      <div className="rv-stage-brand">
        <Image src="/brand/jg-monogram.svg" alt="" width={22} height={24} unoptimized />
        <span>Le Révélateur</span>
      </div>
      <div ref={artRoot} className="rv-artwrap" aria-hidden />

      {(full || leaving) && (
        <section className={cn("rv-explain", (!shown || leaving) && "is-hidden", leaving && "is-leaving")} aria-live="polite" aria-labelledby="rv-explain-title">
          <p className="rv-explain-meta">
            Partie {part + 1} / {PARTS.length} · {p.last - p.first + 1} affirmations · {qn(p.first)}–{qn(p.last)}
          </p>
          <p className="rv-explain-dim">{p.dim}</p>
          <h1 id="rv-explain-title" className="rv-explain-title">{p.title}</h1>
          <p className="rv-explain-text">{p.text}</p>
          <p className="rv-explain-image">{p.image}</p>
          <button ref={go} type="button" className="rv-explain-go" onClick={onBegin} disabled={leaving}>
            Commencer <ArrowRight aria-hidden className="size-4" />
          </button>
        </section>
      )}

      <div className="rv-stage-part" aria-hidden>
        <p className="rv-stage-meta">Partie {part + 1} / {PARTS.length} · {qn(p.first)}–{qn(p.last)}</p>
        <p className="rv-stage-name">{p.name}</p>
        <div className="rv-stage-ticks">
          {Array.from({ length: p.last - p.first + 1 }, (_, i) => {
            const n = p.first + i;
            return <i key={n} data-on={answered[n - 1] || undefined} data-current={n === current || undefined} />;
          })}
        </div>
      </div>
      {full && <p className="rv-stage-legal">{ownership}</p>}
    </div>
  );
}
