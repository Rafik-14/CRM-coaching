"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { siteButton } from "@/components/site/button";
import {
  answerRevelateur,
  confirmRevelateur,
  moveRevelateur,
  restartRevelateur,
  saveOpenAndContinue,
  startRevelateur,
  type RevelateurState,
} from "@/server/actions/revelateur";
import type { Screen } from "@/server/revelateur/session";
import { AtelierStage, PARTS, partOf } from "./atelier";
import { playPreparation } from "./preparation";

export type ExperienceTexts = {
  welcome: { title: string; paragraphs: readonly string[]; closing: string };
  openQuestion: string;
  saveNotice: string;
  preparation: { title: string; lead: string };
  scale: readonly string[];
  ownership: string;
};

type Phase = "boot" | "screen" | "preparing" | "ready";

/**
 * The passation (dossier maître v2.0 §2): the story page hands over behind a navy curtain → each part
 * is explained full screen → its statements, one at a time beside the part's drawing (no automatic
 * move) → open question → summary → final confirmation → preparation.
 * State lives on the server; this component only shows the screen it receives.
 */
export function RevelateurExperience({ initial, resumed, texts }: { initial: Screen | null; resumed: boolean; texts: ExperienceTexts }) {
  const [phase, setPhase] = useState<Phase>(initial === null || (initial.kind === "welcome" && !resumed) ? "boot" : initial.kind === "complete" ? "ready" : "screen");
  const [screen, setScreen] = useState<Screen>(initial ?? { kind: "welcome" });
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [fromRecap, setFromRecap] = useState(false);
  const fromRecapRef = useRef(false);
  const [prep, setPrep] = useState<{ answers: string[]; axes: number[] }>();
  // The part explained full screen (null: the questions are shown), and the explanation sliding away.
  const [explain, setExplain] = useState<number | null>(initial?.kind === "question" ? partOf(initial.number) : null);
  const [leaving, setLeaving] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const [curtain, setCurtain] = useState(true);
  const live = useRef<HTMLDivElement>(null);

  const apply = useCallback((r: RevelateurState) => {
    setScreen((prev) => {
      // A new screen (next statement, summary…) starts at the top — on a phone the page may be scrolled.
      const changed = prev.kind !== r.screen.kind || (prev.kind === "question" && r.screen.kind === "question" && prev.id !== r.screen.id);
      if (changed) window.scrollTo({ top: 0 });
      // Entering a part (going forward, or arriving at the questions): explain it first. Never when
      // going back, nor when correcting an answer from the summary.
      if (r.screen.kind === "question" && !fromRecapRef.current) {
        const n = r.screen.number, part = partOf(n);
        const forwardIntoPart = prev.kind === "question" && n === prev.number + 1 && PARTS[part].first === n;
        if (forwardIntoPart || prev.kind === "welcome") setExplain(part);
      }
      return r.screen;
    });
    setError(r.error);
    if (r.screen.kind === "complete") setPhase("ready");
    requestAnimationFrame(() => live.current?.querySelector<HTMLElement>("[data-focus]")?.focus({ preventScroll: true }));
  }, []);
  const run = (action: () => Promise<RevelateurState>) => startTransition(async () => apply(await action()));
  const setRecapMode = (on: boolean) => { fromRecapRef.current = on; setFromRecap(on); };

  // Arriving from the story page: open (or resume) the passation behind the curtain, go straight to
  // the first statement, then lift the curtain onto the explanation of the first part.
  useEffect(() => {
    if (phase !== "boot") {
      const t = window.setTimeout(() => setCurtain(false), 350);
      return () => window.clearTimeout(t);
    }
    let cancelled = false;
    startTransition(async () => {
      let r = await startRevelateur();
      if (!r.error && r.screen.kind === "welcome") r = await moveRevelateur({ to: "start" });
      if (cancelled) return;
      apply(r);
      setPhase("screen");
      window.setTimeout(() => setCurtain(false), 250);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on arrival
  }, []);

  const begin = () => {
    if (leaving) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLeaving(true);
    setExplain(null);
    window.setTimeout(() => setLeaving(false), reduce ? 0 : 1100);
  };

  // The summary stays on screen while the answers are frozen; then its rows become the five points.
  const confirm = () =>
    startTransition(async () => {
      if (screen.kind !== "recap") return;
      const answers = screen.items.map((it) => it.label);
      const r = await confirmRevelateur();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      window.scrollTo({ top: 0 });
      setPrep({ answers, axes: r.axes });
      setPhase("preparing");
      // v2.0 §3: about 5–7 s, never an artificial wait beyond that; shorter if motion is reduced.
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(() => setPhase("ready"), reduce ? 2500 : 6800);
    });

  const errorBox = error && (
    <p role="alert" className="mx-auto mt-6 w-full max-w-[860px] rounded-[7px] border border-[#e3bdb5] bg-[#fbf1ef] px-4 py-3 text-[15px] text-[#9a3b2e]">
      {error}
    </p>
  );

  const atelier = phase === "screen" && screen.kind === "question";
  return (
    <div ref={live} className="flex flex-1 flex-col">
      <div className={cn("rv-curtain", !curtain && "is-up")} aria-hidden>
        <span>Le Révélateur</span>
      </div>

      {atelier && screen.kind === "question" && (
        <div className={cn("rv-atelier", explain !== null && "is-full")} aria-busy={pending}>
          <AtelierStage
            part={explain ?? partOf(screen.number)}
            full={explain !== null}
            leaving={leaving}
            pulseKey={pulseKey}
            answered={screen.answered}
            current={screen.number}
            ownership={texts.ownership}
            onBegin={begin}
          />
          <div className="rv-panel">
            {explain === null && (
              <>
                {errorBox}
                <Question
                  key={screen.id}
                  screen={screen}
                  scale={texts.scale}
                  saveNotice={texts.saveNotice}
                  pending={pending}
                  fromRecap={fromRecap}
                  onAnswer={(v) => {
                    setPulseKey((k) => k + 1);
                    setScreen({ ...screen, value: v });
                    run(() => answerRevelateur(screen.id, v));
                  }}
                  onPrevious={() => run(() => moveRevelateur({ to: "previous" }))}
                  onNext={() => run(() => moveRevelateur({ to: "next" }))}
                  onBackToRecap={() => {
                    setRecapMode(false);
                    run(() => moveRevelateur({ to: "recap" }));
                  }}
                />
                <p className="rv-panel-legal">{texts.ownership}</p>
              </>
            )}
          </div>
        </div>
      )}

      {!atelier && (
        <Classic ownership={texts.ownership}>
          {phase === "preparing" && prep && <Preparation texts={texts.preparation} answers={prep.answers} axes={prep.axes} />}
          {phase === "ready" && (
            <Ready
              onRestart={() =>
                startTransition(async () => {
                  let r = await restartRevelateur();
                  if (!r.error && r.screen.kind === "welcome") r = await moveRevelateur({ to: "start" });
                  setPhase("screen");
                  apply(r);
                })
              }
              pending={pending}
            />
          )}
          {phase === "screen" && (
            <div className="flex flex-1 flex-col" aria-busy={pending}>
              {errorBox}
              {screen.kind === "welcome" && (
                <Welcome texts={texts.welcome} resumed={resumed} pending={pending} onStart={() => run(() => moveRevelateur({ to: "start" }))} />
              )}
              {screen.kind === "open" && (
                <OpenQuestion question={texts.openQuestion} initial={screen.value} pending={pending} onMove={(text, dir) => run(() => saveOpenAndContinue(text, dir))} />
              )}
              {screen.kind === "recap" && (
                <Recap
                  screen={screen}
                  pending={pending}
                  onEdit={(index) => {
                    setRecapMode(true);
                    run(() => moveRevelateur({ to: "question", index }));
                  }}
                  onEditOpen={() => run(() => moveRevelateur({ to: "previous" }))}
                  onConfirm={confirm}
                />
              )}
            </div>
          )}
        </Classic>
      )}
    </div>
  );
}

/** Open question, summary, confirmation and the end: the calm frame with the JG® mark and the notice. */
function Classic({ children, ownership }: { children: React.ReactNode; ownership: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-4 py-5">
        <Link href="/revelateur" className="inline-flex items-center gap-3 font-heading text-[12px] font-semibold tracking-[.2em] text-navy uppercase">
          <Image src="/brand/jg-monogram.svg" alt="" width={26} height={28} unoptimized />
          Le Révélateur
        </Link>
        <span className="font-heading text-[11px] font-semibold tracking-[.16em] text-[var(--jg-anthracite)] uppercase">Test Signature JG®</span>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="mx-auto w-full max-w-[1100px] px-4 py-6 text-center text-[12px] leading-relaxed text-[var(--jg-anthracite)]">{ownership}</footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("mx-auto w-full max-w-[860px] flex-1 px-4 py-10 md:py-16", "rv-screen", className)}>{children}</section>;
}

function Welcome({ texts, resumed, pending, onStart }: { texts: ExperienceTexts["welcome"]; resumed: boolean; pending: boolean; onStart: () => void }) {
  return (
    <Frame>
      <h1 className="jg-h1 text-navy" tabIndex={-1} data-focus style={{ outline: "none" }}>
        {resumed ? "Votre exploration vous attend." : texts.title}
      </h1>
      <div className={cn("mt-6 w-16", "rv-gold-line")} />
      <div className="mt-8 grid max-w-[640px] gap-4 text-[17px] leading-relaxed">
        {resumed ? (
          <p>Vos réponses ont été conservées. Vous pouvez reprendre là où vous vous étiez arrêté.</p>
        ) : (
          texts.paragraphs.map((p, i) => (
            <p key={i} className={i === 2 ? "font-heading font-semibold text-navy" : undefined}>
              {p}
            </p>
          ))
        )}
        {!resumed && <p className="font-heading font-medium text-navy">{texts.closing}</p>}
      </div>
      <div className="mt-10">
        <button type="button" className={siteButton()} onClick={onStart} disabled={pending}>
          {resumed ? "Reprendre" : "Commencer"} <ArrowRight aria-hidden />
        </button>
      </div>
    </Frame>
  );
}

function Question({
  screen,
  scale,
  saveNotice,
  pending,
  fromRecap,
  onAnswer,
  onPrevious,
  onNext,
  onBackToRecap,
}: {
  screen: Extract<Screen, { kind: "question" }>;
  scale: readonly string[];
  saveNotice: string;
  pending: boolean;
  fromRecap: boolean;
  onAnswer: (v: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onBackToRecap: () => void;
}) {
  const num = String(screen.number).padStart(2, "0");
  const count = screen.answered.filter(Boolean).length;
  // Keys 1–5 choose (no automatic move); Enter continues once answered. An Enter pressed while the
  // choice is still being saved is remembered and carried out as soon as the save is done.
  const [enterQueued, setEnterQueued] = useState(false);
  const goOn = fromRecap ? onBackToRecap : onNext;
  useEffect(() => {
    if (!enterQueued || pending) return;
    const t = window.setTimeout(() => {
      setEnterQueued(false);
      if (screen.value !== null) goOn();
    }, 0);
    return () => clearTimeout(t);
  }, [enterQueued, pending, screen.value, goOn]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("textarea, input[type=text], input[type=email]")) return;
      if (/^[1-5]$/.test(e.key)) {
        if (!pending) onAnswer(Number(e.key));
      } else if (e.key === "Enter" && screen.value !== null && !(e.target instanceof HTMLButtonElement)) {
        if (pending) setEnterQueued(true);
        else goOn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Frame className="flex flex-col">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-heading text-[12px] font-semibold tracking-[.2em] text-[var(--jg-anthracite)] uppercase" aria-live="polite">
          Question <span className="text-[15px] tracking-[.06em] text-navy">{num}</span> / {screen.total}
        </p>
        <p className="text-[13px] text-[var(--jg-anthracite)]">{count} {count > 1 ? "réponses enregistrées" : "réponse enregistrée"}</p>
      </div>
      <div className={cn("rv-film", "mt-4")} aria-hidden>
        {screen.answered.map((on, i) => (
          <i key={i} data-on={on} data-current={i === screen.index} />
        ))}
      </div>

      <fieldset className="mt-10 md:mt-14">
        <legend className="font-heading text-[clamp(1.375rem,2.4vw,1.875rem)] leading-snug font-medium text-navy" tabIndex={-1} data-focus style={{ outline: "none" }}>
          {screen.text}
        </legend>
        <p className="mt-4 text-[15px] text-[var(--jg-anthracite)]">Dans quelle mesure cette affirmation est-elle vraie pour vous&nbsp;?</p>
        {/* While a choice is saved or the next statement loads, the options are paused: a click there would
            otherwise land on the previous statement (slow connections). */}
        <div
          className={cn(
            "mt-8 grid gap-2 transition-opacity md:grid-cols-5 md:gap-0 md:border-y md:border-[var(--jg-light-gray)]",
            pending && "pointer-events-none opacity-60",
          )}
          aria-busy={pending}
        >
          {scale.map((label, i) => {
            const value = i + 1;
            const size = [22, 17, 12, 17, 22][i];
            return (
              <label
                key={value}
                className={cn(
                  "rv-option",
                  "flex cursor-pointer items-center gap-4 rounded-[7px] border border-[var(--jg-light-gray)] bg-white px-4 py-3.5 transition-colors hover:border-navy md:flex-col md:rounded-none md:border-0 md:bg-transparent md:px-2 md:py-6 md:text-center md:hover:bg-white",
                )}
              >
                <input
                  type="radio"
                  name={`answer-${screen.id}`}
                  value={value}
                  checked={screen.value === value}
                  onChange={() => {
                    if (!pending) onAnswer(value);
                  }}
                  className="sr-only"
                />
                <span className={"rv-marker"} aria-hidden>
                  <i style={{ width: size, height: size }} />
                </span>
                <span className="text-[16px] leading-snug md:text-[14.5px]">{label}</span>
                <span className="hidden rounded-[3px] border border-[var(--jg-light-gray)] px-1.5 py-0.5 font-heading text-[11px] text-[var(--jg-anthracite)] md:inline" aria-hidden>
                  {value}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--jg-light-gray)] pt-5">
        <button type="button" onClick={onPrevious} disabled={pending} className="inline-flex min-h-11 items-center gap-2 font-heading text-[15px] font-semibold text-[var(--jg-anthracite)] hover:text-navy">
          <ArrowLeft aria-hidden className="size-4" /> Précédente
        </button>
        {fromRecap ? (
          <button type="button" onClick={onBackToRecap} disabled={pending || screen.value === null} className={siteButton()}>
            Retour au récapitulatif <Check aria-hidden />
          </button>
        ) : (
          <button type="button" onClick={onNext} disabled={pending || screen.value === null} className={siteButton({ variant: screen.value === null ? "secondary" : "primary" })}>
            {screen.number === screen.total ? "Terminer" : "Suivante"} <ArrowRight aria-hidden />
          </button>
        )}
      </div>
      <p className="mt-6 flex gap-2 text-[13px] text-[var(--jg-anthracite)]">
        <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--jg-teal)]" /> {saveNotice}
      </p>
    </Frame>
  );
}

function OpenQuestion({ question, initial, pending, onMove }: { question: string; initial: string; pending: boolean; onMove: (text: string, dir: "next" | "previous") => void }) {
  const [text, setText] = useState(initial);
  return (
    <Frame>
      <p className="font-heading text-[12px] font-semibold tracking-[.2em] text-[var(--jg-gold-ink)] uppercase">Une dernière question · facultative</p>
      <label htmlFor="open-answer" className="mt-5 block font-heading text-[clamp(1.375rem,2.4vw,1.875rem)] leading-snug font-medium text-navy" tabIndex={-1} data-focus style={{ outline: "none" }}>
        {question}
      </label>
      <textarea
        id="open-answer"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        rows={6}
        className="mt-8 w-full rounded-[7px] border border-[var(--jg-light-gray)] bg-white p-4 text-[17px] leading-relaxed focus:border-navy focus:outline-2 focus:outline-navy"
      />
      <p className="mt-2 flex justify-between text-[13px] text-[var(--jg-anthracite)]">
        <span>Facultatif — cette réponse ne modifie pas vos résultats.</span>
        <span>{text.length} / 1000</span>
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <button type="button" onClick={() => onMove(text, "previous")} disabled={pending} className="inline-flex min-h-11 items-center gap-2 font-heading text-[15px] font-semibold text-[var(--jg-anthracite)] hover:text-navy">
          <ArrowLeft aria-hidden className="size-4" /> Précédente
        </button>
        <button type="button" onClick={() => onMove(text, "next")} disabled={pending} className={siteButton()}>
          {text.trim() ? "Continuer" : "Passer"} <ArrowRight aria-hidden />
        </button>
      </div>
    </Frame>
  );
}

function Recap({
  screen,
  pending,
  onEdit,
  onEditOpen,
  onConfirm,
}: {
  screen: Extract<Screen, { kind: "recap" }>;
  pending: boolean;
  onEdit: (index: number) => void;
  onEditOpen: () => void;
  onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);
  return (
    <Frame>
      <h1 className="jg-h2 text-navy" tabIndex={-1} data-focus style={{ outline: "none" }}>
        Vérifiez vos réponses
      </h1>
      <p className="mt-4 max-w-[640px] text-[17px]">Vous pouvez revenir sur chaque réponse avant de confirmer. Après confirmation, elles ne pourront plus être modifiées.</p>
      <ol className="mt-8 grid gap-x-8 md:grid-cols-2">
        {screen.items.map((it) => (
          <li key={it.index} className="flex items-center justify-between gap-3 border-b border-[var(--jg-light-gray)] py-3">
            <span className="flex items-baseline gap-3">
              <span className="font-heading text-[12px] font-semibold tracking-[.12em] text-[var(--jg-gold-ink)]">Q{String(it.number).padStart(2, "0")}</span>
              <span className="text-[15.5px] text-navy">{it.label}</span>
            </span>
            <button type="button" onClick={() => onEdit(it.index)} disabled={pending} className="inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold text-[var(--jg-anthracite)] hover:text-navy" aria-label={`Modifier la réponse à la question ${it.number}`}>
              <Pencil aria-hidden className="size-3.5" /> Modifier
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-6 rounded-[7px] border border-[var(--jg-light-gray)] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-heading text-[13px] font-semibold text-navy">Question ouverte</p>
          <button type="button" onClick={onEditOpen} disabled={pending} className="inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold text-[var(--jg-anthracite)] hover:text-navy">
            <Pencil aria-hidden className="size-3.5" /> Modifier
          </button>
        </div>
        <p className="mt-2 text-[15px] whitespace-pre-line">{screen.openAnswer || "Aucune réponse (facultatif)."}</p>
      </div>

      <div className="mt-10 rounded-[7px] border border-navy bg-white p-5 md:p-6">
        {!asking ? (
          <>
            <p className="text-[16px]">Lorsque vous êtes prêt, confirmez vos réponses. Votre rapport sera alors préparé.</p>
            <button type="button" onClick={() => setAsking(true)} disabled={pending} className={cn(siteButton(), "mt-5")}>
              Je confirme mes réponses <ArrowRight aria-hidden />
            </button>
          </>
        ) : (
          <div role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-desc">
            <p id="confirm-title" className="font-heading text-[18px] font-semibold text-navy">
              Confirmer définitivement&nbsp;?
            </p>
            <p id="confirm-desc" className="mt-2 text-[16px]">Vos 30 réponses seront figées et ne pourront plus être modifiées.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={onConfirm} disabled={pending} className={siteButton()} autoFocus>
                Oui, je confirme <Check aria-hidden />
              </button>
              <button type="button" onClick={() => setAsking(false)} disabled={pending} className={siteButton({ variant: "secondary" })}>
                Revenir à mes réponses
              </button>
            </div>
          </div>
        )}
      </div>
    </Frame>
  );
}

/** « Votre valeur prend forme. » — the summary becomes the five points (see ./preparation.ts). */
function Preparation({ texts, answers, axes }: { texts: ExperienceTexts["preparation"]; answers: string[]; axes: number[] }) {
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => (stage.current ? playPreparation(stage.current, answers, axes) : undefined), [answers, axes]);
  return (
    <section className="mx-auto flex w-full max-w-[960px] flex-1 flex-col px-4 py-8 md:py-12" aria-live="polite">
      <h1 className="sr-only">{texts.title}</h1>
      <div ref={stage} className="relative h-[460px] w-full overflow-hidden rounded-[14px] border border-[var(--jg-light-gray)] bg-[#f8f6f2] sm:h-[400px]" aria-hidden />
      <p className="rv-develop mx-auto mt-6 max-w-[520px] text-center text-[17px]" style={{ animationDelay: "4.4s" }}>
        {texts.lead}
      </p>
    </section>
  );
}

/** After confirmation. The e-mail step (address + confirmation link) comes next in development. */
function Ready({ onRestart, pending }: { onRestart: () => void; pending: boolean }) {
  return (
    <Frame>
      <h1 className="jg-h2 text-navy" tabIndex={-1} data-focus style={{ outline: "none" }}>
        Vos réponses sont confirmées.
      </h1>
      <div className={cn("mt-6 w-16", "rv-gold-line")} />
      <p className="mt-8 max-w-[640px] text-[17px]">
        Votre cartographie est calculée. L&apos;étape suivante — votre adresse e-mail, confirmée par un lien, pour recevoir votre rapport — est en cours de
        développement.
      </p>
      <button type="button" onClick={onRestart} disabled={pending} className={cn(siteButton({ variant: "secondary" }), "mt-10")}>
        Faire une nouvelle passation
      </button>
    </Frame>
  );
}
