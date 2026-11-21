"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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

export type ExperienceTexts = {
  intro: readonly string[];
  welcome: { title: string; paragraphs: readonly string[]; closing: string };
  openQuestion: string;
  saveNotice: string;
  preparation: { title: string; lead: string };
  scale: readonly string[];
};

type Phase = "intro" | "screen" | "preparing" | "ready";

/**
 * The passation, screen by screen (dossier maître v2.0 §2): immersion → welcome → 30 statements
 * (no automatic move) → open question → summary → final confirmation → preparation.
 * State lives on the server; this component only shows the screen it receives.
 */
export function RevelateurExperience({ initial, resumed, texts }: { initial: Screen | null; resumed: boolean; texts: ExperienceTexts }) {
  const [phase, setPhase] = useState<Phase>(initial === null ? "intro" : initial.kind === "complete" ? "ready" : "screen");
  const [screen, setScreen] = useState<Screen>(initial ?? { kind: "welcome" });
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [fromRecap, setFromRecap] = useState(false);
  const live = useRef<HTMLDivElement>(null);

  const apply = useCallback((r: RevelateurState) => {
    setScreen((prev) => {
      // A new screen (next statement, summary…) starts at the top — on a phone the page may be scrolled.
      const changed = prev.kind !== r.screen.kind || (prev.kind === "question" && r.screen.kind === "question" && prev.id !== r.screen.id);
      if (changed) window.scrollTo({ top: 0 });
      return r.screen;
    });
    setError(r.error);
    if (r.screen.kind === "complete") setPhase("ready");
    requestAnimationFrame(() => live.current?.querySelector<HTMLElement>("[data-focus]")?.focus({ preventScroll: true }));
  }, []);
  const run = (action: () => Promise<RevelateurState>) => startTransition(async () => apply(await action()));

  const start = () =>
    startTransition(async () => {
      const r = await startRevelateur();
      setPhase("screen");
      apply(r);
    });

  const confirm = () =>
    startTransition(async () => {
      setPhase("preparing");
      const began = Date.now();
      const r = await confirmRevelateur();
      if (!r.ok) {
        setPhase("screen");
        setError(r.error);
        return;
      }
      // v2.0 §3: about 5–7 s, never an artificial wait beyond that; shorter if motion is reduced.
      const min = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 800 : 5500;
      setTimeout(() => setPhase("ready"), Math.max(0, min - (Date.now() - began)));
    });

  return (
    <div ref={live} className="flex flex-1 flex-col">
      {phase === "intro" && <Intro lines={texts.intro} onStart={start} pending={pending} />}
      {phase === "preparing" && <Preparation texts={texts.preparation} />}
      {phase === "ready" && (
        <Ready
          onRestart={() =>
            startTransition(async () => {
              const r = await restartRevelateur();
              setPhase("screen");
              apply(r);
            })
          }
          pending={pending}
        />
      )}
      {phase === "screen" && (
        <div className="flex flex-1 flex-col" aria-busy={pending}>
          {error && (
            <p role="alert" className="mx-auto mt-6 w-full max-w-[860px] rounded-[7px] border border-[#e3bdb5] bg-[#fbf1ef] px-4 py-3 text-[15px] text-[#9a3b2e]">
              {error}
            </p>
          )}
          {screen.kind === "welcome" && (
            <Welcome
              texts={texts.welcome}
              resumed={resumed}
              pending={pending}
              onStart={() => run(() => moveRevelateur({ to: "start" }))}
            />
          )}
          {screen.kind === "question" && (
            <Question
              key={screen.id}
              screen={screen}
              scale={texts.scale}
              saveNotice={texts.saveNotice}
              pending={pending}
              fromRecap={fromRecap}
              onAnswer={(v) => {
                setScreen({ ...screen, value: v });
                run(() => answerRevelateur(screen.id, v));
              }}
              onPrevious={() => run(() => moveRevelateur({ to: "previous" }))}
              onNext={() => run(() => moveRevelateur({ to: "next" }))}
              onBackToRecap={() => {
                setFromRecap(false);
                run(() => moveRevelateur({ to: "recap" }));
              }}
            />
          )}
          {screen.kind === "open" && (
            <OpenQuestion
              question={texts.openQuestion}
              initial={screen.value}
              pending={pending}
              onMove={(text, dir) => run(() => saveOpenAndContinue(text, dir))}
            />
          )}
          {screen.kind === "recap" && (
            <Recap
              screen={screen}
              pending={pending}
              onEdit={(index) => {
                setFromRecap(true);
                run(() => moveRevelateur({ to: "question", index }));
              }}
              onEditOpen={() => run(() => moveRevelateur({ to: "previous" }))}
              onConfirm={confirm}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Immersion (≈ 11 s, skippable, respects reduced motion)
// ---------------------------------------------------------------------------

function Intro({ lines, onStart, pending }: { lines: readonly string[]; onStart: () => void; pending: boolean }) {
  const beats = lines.slice(0, 4);
  const final = lines.slice(4);
  const [beat, setBeat] = useState(0);
  const [out, setOut] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [step, setStep] = useState(0);

  // The sequence is scheduled once, when the intro appears. (Depending on `beats` — a new array on
  // every render — restarted it after each line, so only the first line ever showed.)
  const beatCount = beats.length;
  const finalCount = final.length;
  useEffect(() => {
    const timers: number[] = [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timers.push(window.setTimeout(() => { setShowFinal(true); setStep(99); }, 0));
      return () => timers.forEach(clearTimeout);
    }
    // Each opening line takes 2.2 s: 0.9 s to appear, about 1 s fully sharp and readable, 0.3 s to fade.
    // Then the title screen builds up line by line (0.6 s apart): about 11 s in all (dossier v2.0 §2).
    const BEAT = 2200;
    for (let i = 0; i < beatCount; i++) {
      timers.push(window.setTimeout(() => { setBeat(i); setOut(false); }, i * BEAT));
      timers.push(window.setTimeout(() => setOut(true), i * BEAT + 1900));
    }
    timers.push(window.setTimeout(() => setShowFinal(true), beatCount * BEAT));
    for (let k = 1; k <= finalCount + 1; k++) timers.push(window.setTimeout(() => setStep(k), beatCount * BEAT + (k - 1) * 600 + 50));
    return () => timers.forEach(clearTimeout);
  }, [beatCount, finalCount]);

  const skip = () => { setShowFinal(true); setStep(99); };
  const [title, subtitle, l1, l2, meta] = final;

  return (
    <section className="relative flex flex-1 items-center justify-center px-4 py-16 text-center" aria-label="Introduction">
      {!showFinal ? (
        <p key={beat} aria-live="polite" className={cn("rv-develop", out && "rv-out", beat === 0 ? "font-heading text-[13px] font-semibold tracking-[.3em] text-[var(--jg-gold-ink)]" : "jg-h1 max-w-[18ch] text-navy")}>
          {beats[beat]}
        </p>
      ) : (
        <div className="mx-auto max-w-[760px]">
          <div className={cn(step >= 1 ? "rv-develop" : "opacity-0")}>
            <h1 className="font-heading text-[clamp(2.25rem,6vw,4.5rem)] font-semibold tracking-[.06em] text-navy">{title}</h1>
            <p className="mt-3 font-heading text-[13px] font-semibold tracking-[.3em] text-[var(--jg-gold-ink)] uppercase">{subtitle}</p>
            <div className={cn("mx-auto mt-8 w-16", "rv-gold-line")} />
          </div>
          <p className={cn("mt-8 font-heading text-[clamp(1.125rem,2.2vw,1.5rem)] font-medium text-navy", step >= 2 ? "rv-develop" : "opacity-0")}>{l1}</p>
          <p className={cn("mt-3 text-[17px]", step >= 3 ? "rv-develop" : "opacity-0")}>{l2}</p>
          <p className={cn("mt-8 font-heading text-[12px] font-semibold tracking-[.22em] uppercase text-[var(--jg-anthracite)]", step >= 4 ? "rv-develop" : "opacity-0")}>{meta}</p>
          <div className={cn("mt-8", step >= 5 ? "rv-develop" : "opacity-0")}>
            <button type="button" className={siteButton()} onClick={onStart} disabled={pending} data-focus>
              Je commence l&apos;expérience <ArrowRight aria-hidden />
            </button>
          </div>
        </div>
      )}
      {step < 5 && (
        <button type="button" onClick={skip} className="absolute right-4 bottom-4 px-2 py-3 font-heading text-[12px] font-semibold tracking-[.16em] text-[var(--jg-anthracite)] uppercase hover:text-navy">
          Passer l&apos;introduction
        </button>
      )}
    </section>
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

/** « Votre valeur prend forme. » — fine lines connect five points (the five dimensions), on ivory. */
function Preparation({ texts }: { texts: ExperienceTexts["preparation"] }) {
  const pts = [0, 1, 2, 3, 4].map((i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return [120 + Math.cos(a) * 80, 120 + Math.sin(a) * 80] as const;
  });
  const edges: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2], [1, 3], [2, 4], [3, 0], [4, 1]];
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center" aria-live="polite">
      <svg viewBox="0 0 240 240" className="w-[200px] md:w-[240px]" aria-hidden>
        {edges.map(([a, b], i) => {
          const len = Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]);
          return (
            <line
              key={i}
              x1={pts[a][0]}
              y1={pts[a][1]}
              x2={pts[b][0]}
              y2={pts[b][1]}
              className={"rv-line"}
              stroke={i < 5 ? "var(--gold)" : "var(--jg-teal)"}
              strokeOpacity={i < 5 ? 0.9 : 0.45}
              strokeWidth={i < 5 ? 1.4 : 1}
              style={{ ["--len" as string]: len, animationDelay: `${i * 0.35}s` }}
            />
          );
        })}
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={4} fill="var(--jg-navy)" className={"rv-node"} style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </svg>
      <h1 className={cn("jg-h2 mt-10 text-navy", "rv-develop")}>{texts.title}</h1>
      <p className={cn("mt-4 max-w-[520px] text-[17px]", "rv-develop")} style={{ animationDelay: ".6s" }}>
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
