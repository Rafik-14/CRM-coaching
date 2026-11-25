"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Pencil, RotateCcw, ShieldCheck } from "lucide-react";
import {
  answerRevelateur,
  confirmRevelateur,
  moveRevelateur,
  restartRevelateur,
  saveOpenAndContinue,
  startRevelateur,
  type RevelateurState,
} from "@/server/actions/revelateur";
import type { DeliveryState } from "@/server/revelateur/delivery";
import type { Screen } from "@/server/revelateur/session";
import { cinemaAudio } from "./audio";
import { CinemaHUD } from "./hud";
import { ReportStep, type EndTexts } from "./report-step";
import { C, COLUMN_META, gsap, reducedMotion, SECTION_GROUPS, SplitText, useGSAP } from "./gsap";
import { setWorld, surgeWorld, world } from "./world";

export type CinemaTexts = {
  openQuestion: string;
  saveNotice: string;
  preparation: { title: string; lead: string };
  scale: readonly string[];
  ownership: string;
  end: EndTexts;
};

type Stage = "boot" | "interlude" | "question" | "open" | "review" | "confirmed";
type Mode = "boot" | "forward" | "back" | "stay";
type QuestionScreen = Extract<Screen, { kind: "question" }>;
type RecapScreen = Extract<Screen, { kind: "recap" }>;

const wait = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Le Révélateur — the passation, in the "cinema" design Jérémy approved. The server keeps the state:
 * the browser only ever receives the current statement, sends the person's choice, and shows the
 * next screen it is given (resume 30 days, scoring and freezing stay server-side).
 */
export function CinemaExperience({
  initialComplete,
  initialDelivery,
  fromStart,
  texts,
}: {
  initialComplete: boolean;
  initialDelivery: DeliveryState;
  fromStart: boolean;
  texts: CinemaTexts;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(initialComplete ? "confirmed" : "boot");
  const [screen, setScreen] = useState<Screen>({ kind: initialComplete ? "complete" : "welcome" });
  const [group, setGroup] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [retry, setRetry] = useState(0); // remounts the statement after a failed save
  const [confirmedHere, setConfirmedHere] = useState(false); // a new confirmation: no address yet

  const apply = useCallback(
    (r: RevelateurState, mode: Mode) => {
      setError(r.error);
      const s = r.screen;
      if (s.kind === "welcome") {
        if (mode === "back") router.push("/revelateur");
        return;
      }
      setScreen(s);
      window.scrollTo({ top: 0 });
      if (s.kind === "question") {
        setWorld({ index: s.index });
        const g = Math.floor(s.index / 6);
        if (mode === "boot" || (mode === "forward" && s.index % 6 === 0)) {
          setGroup(g);
          setStage("interlude");
        } else setStage("question");
      } else if (s.kind === "open") setStage("open");
      else if (s.kind === "recap") setStage("review");
      else if (s.kind === "complete") setStage("confirmed");
    },
    [router],
  );

  const run = async (action: () => Promise<RevelateurState>, mode: Mode) => {
    setPending(true);
    try {
      apply(await action(), mode);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setPending(false);
    }
  };

  // Arrival: resume this device's passation (or open one), straight onto the current statement.
  useEffect(() => {
    if (initialComplete) return;
    let cancelled = false;
    (async () => {
      let r = await startRevelateur();
      if (!r.error && r.screen.kind === "welcome") r = await moveRevelateur({ to: "start" });
      if (!r.error && fromStart && r.screen.kind === "question" && r.screen.index > 0) r = await moveRevelateur({ to: "question", index: 0 });
      if (!cancelled) apply(r, "boot");
    })().catch(() => !cancelled && setError("Une erreur est survenue. Rechargez la page."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  useEffect(() => {
    world.stage =
      stage === "boot" ? "interlude" : stage === "confirmed" ? "confirmed" : stage === "review" ? "review" : stage;
    setWorld({ gravityActive: stage === "question" });
    if (stage !== "question") {
      setWorld({ hovered: null });
      setWorld({ passing: null });
    }
  }, [stage]);

  // One answer = save it, then move on (the light passes while the server answers).
  const commit = async (q: QuestionScreen, value: number) => {
    setPending(true);
    const t0 = performance.now();
    try {
      const saved = await answerRevelateur(q.id, value);
      if (saved.error) {
        apply(saved, "stay");
        setRetry((k) => k + 1);
        return;
      }
      const next = await moveRevelateur({ to: "next" });
      const left = 560 - (performance.now() - t0);
      if (left > 0) await wait(left);
      if (next.screen.kind === "question" && next.screen.index % 6 === 0) cinemaAudio.playActInterlude();
      apply(next, "forward");
      if (next.error) setRetry((k) => k + 1);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      setRetry((k) => k + 1);
    } finally {
      setWorld({ passing: null });
      setWorld({ hovered: null });
      setPending(false);
    }
  };

  const confirm = async () => {
    if (screen.kind !== "recap") return;
    setPending(true);
    const r = await confirmRevelateur().catch(() => ({ ok: false as const, error: "Une erreur est survenue. Réessayez." }));
    setPending(false);
    if (!r.ok) return setError(r.error);
    setWorld({ passing: 4 });
    surgeWorld();
    cinemaAudio.playReveal();
    window.scrollTo({ top: 0 });
    setConfirmedHere(true);
    setStage("confirmed");
  };

  const q = screen.kind === "question" ? screen : null;
  const hud =
    (stage === "question" || stage === "interlude") && q
      ? { index: q.index, answered: q.answered.filter(Boolean).length, group: stage === "interlude" ? group : Math.floor(q.index / 6) }
      : undefined;

  return (
    <div className="relative w-full">
      <CinemaHUD progress={hud} />

      {stage === "boot" && (
        <div className="flex min-h-[100dvh] items-center justify-center">
          <span className="font-film text-[10.5px] tracking-[0.3em] text-[#D4A866]/80 uppercase">Le Révélateur</span>
        </div>
      )}
      {stage === "interlude" && <Interlude group={group} onDone={() => setStage("question")} />}
      {stage === "question" && q && (
        <LightColumns
          key={`${q.id}-${retry}`}
          q={q}
          labels={texts.scale}
          saveNotice={texts.saveNotice}
          ownership={texts.ownership}
          pending={pending}
          onCommit={(v) => commit(q, v)}
          onBack={() => (q.index === 0 ? router.push("/revelateur") : run(() => moveRevelateur({ to: "previous" }), "back"))}
        />
      )}
      {stage === "open" && screen.kind === "open" && (
        <OpenIntention
          question={texts.openQuestion}
          initial={screen.value}
          pending={pending}
          onMove={(text, dir) => run(() => saveOpenAndContinue(text, dir), dir === "next" ? "forward" : "back")}
        />
      )}
      {stage === "review" && screen.kind === "recap" && (
        <Review
          screen={screen}
          labels={texts.scale}
          pending={pending}
          onEdit={(index, value) =>
            run(async () => {
              const at = await moveRevelateur({ to: "question", index });
              if (at.error || at.screen.kind !== "question") return at;
              const saved = await answerRevelateur(at.screen.id, value);
              if (saved.error) return saved;
              return moveRevelateur({ to: "recap" });
            }, "stay")
          }
          onEditOpen={() => run(() => moveRevelateur({ to: "previous" }), "back")}
          onConfirm={confirm}
        />
      )}
      {stage === "confirmed" && (
        <Confirmed
          ownership={texts.ownership}
          pending={pending}
          delivery={initialComplete && !confirmedHere ? initialDelivery : { status: "none" }}
          end={texts.end}
          onRestart={() =>
            run(async () => {
              const r = await restartRevelateur();
              return !r.error && r.screen.kind === "welcome" ? moveRevelateur({ to: "start" }) : r;
            }, "boot")
          }
        />
      )}

      {error && (
        <p role="alert" className="fixed bottom-[max(4.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-[min(92vw,520px)] -translate-x-1/2 border border-[#D4A866]/40 bg-[#0E1825]/92 px-4 py-3 text-center text-[14px] text-[#F8F6F2]">
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Series interlude (every six statements): letterbox shutters, « Regard I–V ».
// ---------------------------------------------------------------------------

function Interlude({ group, onDone }: { group: number; onDone: () => void }) {
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const done = useRef(false);
  const g = SECTION_GROUPS[group] ?? SECTION_GROUPS[0];
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => ["Enter", "Escape", " "].includes(e.key) && finish();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  useGSAP(
    () => {
      if (reducedMotion()) {
        const t = window.setTimeout(finish, 900);
        return () => window.clearTimeout(t);
      }
      let split: SplitText | null = null, tl: gsap.core.Timeline | null = null, cancelled = false;
      document.fonts.ready.then(() => {
        if (cancelled || !root.current) return;
        if (title.current) split = SplitText.create(title.current, { type: "words, chars", mask: "words" });
        tl = gsap.timeline({ onComplete: () => !cancelled && finish() });
        tl.fromTo(".shutter-top", { yPercent: -100 }, { yPercent: 0, duration: 0.55, ease: "dr.cinema" }, 0)
          .fromTo(".shutter-bottom", { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: "dr.cinema" }, 0)
          .fromTo(".shutter-veil", { opacity: 0 }, { opacity: 1, duration: 0.45 }, 0.05)
          .fromTo(".shutter-rule", { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.6, ease: "dr.cinema" }, 0.22)
          .fromTo(".shutter-kicker", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.55, ease: "dr.cinema" }, 0.26);
        if (split)
          tl.fromTo(
            split.chars,
            { yPercent: 118, rotationX: -58, opacity: 0, color: C.goldBright, transformOrigin: "50% 100% -20px" },
            { yPercent: 0, rotationX: 0, opacity: 1, color: C.ivory, duration: 0.85, stagger: { amount: 0.34 }, ease: "dr.develop" },
            0.3,
          );
        tl.fromTo(".shutter-sub", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: "dr.cinema" }, 0.55)
          .to(".shutter-content", { opacity: 0, y: -14, duration: 0.4, ease: "dr.exit" }, 1.75)
          .to(".shutter-top", { yPercent: -100, duration: 0.52, ease: "dr.exit" }, 1.85)
          .to(".shutter-bottom", { yPercent: 100, duration: 0.52, ease: "dr.exit" }, 1.85)
          .to(".shutter-veil", { opacity: 0, duration: 0.45 }, 1.88);
      });
      return () => {
        cancelled = true;
        tl?.kill();
        split?.revert();
      };
    },
    { scope: root, dependencies: [group] },
  );

  return (
    <section ref={root} onClick={finish} className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-hidden select-none" aria-label={`Série ${g.roman} — ${g.rangeLabel}`}>
      <div aria-hidden className="shutter-veil pointer-events-none absolute inset-0 bg-[#0E1825]/70" />
      <div aria-hidden className="shutter-top pointer-events-none absolute inset-x-0 top-0 h-[12vh] border-b border-[#D4A866]/20 bg-[#0B141F] md:h-[14vh]" />
      <div aria-hidden className="shutter-bottom pointer-events-none absolute inset-x-0 bottom-0 h-[12vh] border-t border-[#D4A866]/20 bg-[#0B141F] md:h-[14vh]" />
      <div className="shutter-content relative z-10 flex flex-col items-center px-6 text-center">
        <p className="shutter-kicker font-film text-[10.5px] tracking-[0.3em] text-[#D4A866] uppercase">
          Série {g.roman} / V · {g.rangeLabel}
        </p>
        <span aria-hidden className="shutter-rule my-5 block h-px w-24 origin-center bg-[#D4A866]/60" />
        <h2 ref={title} className="kinetic-type font-display text-[38px] leading-[1.1] font-extralight tracking-[-0.02em] text-[#F8F6F2] sm:text-[54px]">
          Regard {g.roman}
        </h2>
        <p className="shutter-sub mt-4 text-[14.5px] font-light tracking-[0.04em] text-[#F8F6F2]/72 italic sm:text-[15.5px]">{g.subtitle}</p>
        <button type="button" onClick={finish} className="font-film mt-10 text-[10px] tracking-[0.22em] text-[#F8F6F2]/45 uppercase hover:text-[#D4A866]">
          Passer
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The statement and the five light columns (desktop) / five strata (phone).
// ---------------------------------------------------------------------------

const TICKS = Array.from({ length: 41 }, (_, i) => i * 2.5);
const MAJOR = [10, 30, 50, 70, 90];

function LightColumns({
  q,
  labels,
  saveNotice,
  ownership,
  pending,
  onCommit,
  onBack,
}: {
  q: QuestionScreen;
  labels: readonly string[];
  saveNotice: string;
  ownership: string;
  pending: boolean;
  onCommit: (v: number) => void;
  onBack: () => void;
}) {
  const options = labels.map((label, i) => ({ value: i + 1, label }));
  const mobileOptions = [...options].reverse(); // V at the top, I at the bottom
  const existing = q.value;
  const [hovered, setHovered] = useState<number | null>(null);
  const [passing, setPassing] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(existing); // phone: chosen, waiting for « Valider »
  const root = useRef<HTMLElement>(null);
  const statement = useRef<HTMLHeadingElement>(null);
  const split = useRef<SplitText | null>(null);
  const axis = useRef<HTMLDivElement>(null);
  const reticle = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLDivElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const mReticle = useRef<HTMLDivElement>(null);
  const mTrail = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);
  const lastTick = useRef<number | null>(null);
  const to = useRef<Record<string, gsap.QuickToFunc | undefined>>({});
  const locked = passing !== null || pending;

  const setRatio = (r: number) => {
    const w = axis.current?.clientWidth ?? window.innerWidth, x = Math.min(Math.max(r, 0), 1) * w, c = w / 2;
    to.current.rx?.(x);
    to.current.tx?.(Math.min(c, x));
    to.current.tw?.(Math.abs(x - c));
  };
  const setMobileRatio = (r: number) => {
    const h = zone.current?.clientHeight ?? 340, y = Math.min(Math.max(r, 0), 1) * h, c = h / 2;
    to.current.my?.(y);
    to.current.ty?.(Math.min(c, y));
    to.current.th?.(Math.abs(y - c));
  };

  useEffect(() => {
    setWorld({ gravityX: 0 });
    if (axis.current) {
      const w = axis.current.clientWidth;
      to.current.rot = gsap.quickTo(axis.current, "rotation", { duration: 0.52, ease: "power3.out" });
      if (reticle.current) {
        gsap.set(reticle.current, { xPercent: -50, yPercent: -50, x: w / 2 });
        to.current.rx = gsap.quickTo(reticle.current, "x", { duration: 0.34, ease: "power3.out" });
      }
      if (trail.current) {
        gsap.set(trail.current, { x: w / 2, width: 0 });
        to.current.tx = gsap.quickTo(trail.current, "x", { duration: 0.34, ease: "power3.out" });
        to.current.tw = gsap.quickTo(trail.current, "width", { duration: 0.34, ease: "power3.out" });
      }
    }
    if (zone.current) {
      const h = zone.current.clientHeight || 340;
      if (mReticle.current) {
        gsap.set(mReticle.current, { xPercent: -50, yPercent: -50, y: h / 2 });
        to.current.my = gsap.quickTo(mReticle.current, "y", { duration: 0.24, ease: "power3.out" });
      }
      if (mTrail.current) {
        gsap.set(mTrail.current, { y: h / 2, height: 0 });
        to.current.ty = gsap.quickTo(mTrail.current, "y", { duration: 0.24, ease: "power3.out" });
        to.current.th = gsap.quickTo(mTrail.current, "height", { duration: 0.24, ease: "power3.out" });
      }
      if (existing) setMobileRatio((5 - existing + 0.5) * 0.2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set-up once per statement
  }, []);

  // The statement develops in, word by word, with a faint gold light passing over the letters.
  useGSAP(
    () => {
      if (reducedMotion()) return;
      let s: SplitText | null = null, tl: gsap.core.Timeline | null = null, cancelled = false;
      document.fonts.ready.then(() => {
        if (cancelled || !statement.current) return;
        s = SplitText.create(statement.current, { type: "lines, words, chars", mask: "lines", linesClass: "split-line-mask" });
        split.current = s;
        tl = gsap.timeline({ defaults: { ease: "dr.develop" } });
        tl.fromTo(".stmt-rule", { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.6, ease: "dr.cinema" }, 0)
          .fromTo(".stmt-prompt", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.65, ease: "dr.cinema" }, 0.04)
          .fromTo(
            s.words,
            { yPercent: 122, rotationX: -48, opacity: 0, transformOrigin: "50% 100% -18px" },
            { yPercent: 0, rotationX: 0, opacity: 1, duration: 0.84, stagger: { amount: 0.4, ease: "power2.out" } },
            0.08,
          )
          .fromTo(s.chars, { color: C.goldBright }, { color: C.ivory, duration: 0.72, stagger: { amount: 0.56 }, ease: "power2.out" }, 0.16);
      });
      return () => {
        cancelled = true;
        tl?.kill();
        split.current = null;
        s?.revert();
      };
    },
    { scope: root },
  );

  const hover = (v: number | null) => {
    setHovered(v);
    setWorld({ hovered: v });
  };

  const activate = (v: number) => {
    if (locked) return;
    if (v !== lastTick.current) {
      lastTick.current = v;
      cinemaAudio.playDialTick(v);
    }
    hover(v);
    const n = (v - 3) / 2;
    setWorld({ gravityX: n });
    to.current.rot?.(n * 4.4);
    setRatio((v - 0.5) * 0.2);
  };

  // The choice: light passes through the chosen column, the words peel away, then the next statement.
  const fly = (v: number) => {
    if (locked) return;
    setPassing(v);
    hover(v);
    setWorld({ passing: v });
    surgeWorld();
    setWorld({ gravityX: (v - 3) / 2 });
    setRatio((v - 0.5) * 0.2);
    cinemaAudio.playBeamPass(v);
    if (axis.current) gsap.timeline().to(axis.current, { y: 6, duration: 0.14, ease: "power2.out" }).to(axis.current, { y: 0, duration: 0.42, ease: "power3.out" });
    to.current.rot?.(0);
    const words = split.current?.words;
    if (words?.length && !reducedMotion())
      gsap.to(words, { yPercent: -108, rotationX: 40, opacity: 0, transformOrigin: "50% 0% -14px", duration: 0.4, stagger: { amount: 0.16, from: v <= 2 ? "start" : v >= 4 ? "end" : "center" }, ease: "dr.exit" });
    else if (statement.current) gsap.to(statement.current, { y: -30, opacity: 0, duration: 0.42, ease: "dr.exit" });
    onCommit(v);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || locked) return;
      if (/^[1-5]$/.test(e.key)) {
        e.preventDefault();
        fly(Number(e.key));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        cinemaAudio.playTick();
        onBack();
      } else if ((e.key === "ArrowRight" || e.key === "Enter") && existing) {
        e.preventDefault();
        fly(existing);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Phone: slide or tap across the five strata to choose (step 1), then « Valider » (step 2).
  const fromPointer = (clientY: number) => {
    const r = zone.current?.getBoundingClientRect();
    if (!r || r.height <= 0) return { v: 3, ratio: 0.5 };
    const ratio = Math.min(Math.max((clientY - r.top) / r.height, 0), 0.999);
    return { v: 5 - Math.min(4, Math.floor(ratio * 5)), ratio };
  };
  const mobileMove = (clientY: number) => {
    const { v, ratio } = fromPointer(clientY);
    setMobileRatio(ratio);
    if (v !== lastTick.current) {
      lastTick.current = v;
      cinemaAudio.playDialTick(v);
      navigator.vibrate?.(6);
    }
    hover(v);
    setPicked(v);
  };

  const active = passing ?? hovered ?? picked;
  const meta = active ? COLUMN_META[active] : null;
  const group = Math.floor(q.index / 6), step = (q.index % 6) + 1;

  return (
    <section
      ref={root}
      onPointerMove={(e) => {
        if (locked || e.pointerType !== "mouse") return;
        // The reticle sticks to the nearest of the five points (no free sliding between them).
        const r = e.currentTarget.getBoundingClientRect(), ratio = Math.min(Math.max((e.clientX - r.left) / Math.max(r.width, 1), 0), 0.999);
        const nearest = Math.min(5, Math.floor(ratio * 5) + 1);
        if (nearest !== hovered) activate(nearest);
      }}
      onPointerLeave={() => {
        if (locked) return;
        setWorld({ gravityX: 0 });
        to.current.rot?.(0);
        setRatio(0.5);
        lastTick.current = null;
        hover(null);
      }}
      className="relative flex h-[100dvh] w-full flex-col justify-between overflow-hidden select-none"
    >
      {/* Five-series progress hairline */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 grid grid-cols-5 gap-1.5 px-3 pt-1.5">
        {SECTION_GROUPS.map((g, i) => (
          <div key={g.roman} className="h-[1.5px] w-full overflow-hidden rounded-full bg-[#F8F6F2]/10">
            <div style={{ width: `${i < group ? 100 : i === group ? (step / 6) * 100 : 0}%` }} className="h-full bg-[#D4A866]/80 transition-all duration-700" />
          </div>
        ))}
      </div>

      {/* Desktop: the graduated horizon with its reticle */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-[25.5%] z-10 hidden items-center justify-center md:flex">
        <div ref={axis} className="relative flex h-10 w-full items-center will-change-transform">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#F8F6F2]/18" />
          <div ref={trail} style={{ left: 0, background: meta?.accent ?? C.gold, boxShadow: `0 0 8px ${meta?.glow ?? "rgba(212,168,102,0.25)"}` }} className="absolute top-1/2 h-[1.5px] -translate-y-1/2 opacity-80" />
          {TICKS.map((p) =>
            MAJOR.includes(p) ? null : (
              <span key={p} style={{ left: `${p}%` }} className={`absolute top-1/2 block w-px -translate-x-1/2 -translate-y-1/2 ${p % 10 === 0 ? "h-2.5 bg-[#F8F6F2]/20" : "h-1.5 bg-[#F8F6F2]/10"}`} />
            ),
          )}
          {options.map((o) => {
            const lit = active === o.value;
            return (
              <div key={o.value} style={{ left: `${(o.value - 0.5) * 20}%` }} className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                <span
                  style={{ backgroundColor: lit ? COLUMN_META[o.value].accent : undefined, boxShadow: lit ? `0 0 10px ${COLUMN_META[o.value].glow}` : undefined }}
                  className={`block transition-all duration-300 ${lit ? "h-6 w-[1.5px]" : o.value === 3 ? "h-3.5 w-px bg-[#D4A866]/45" : "h-3 w-px bg-[#F8F6F2]/26"}`}
                />
                {o.value === 3 && <span className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rotate-45 border border-[#D4A866]/65 bg-[#0E1825]" />}
              </div>
            );
          })}
          <div ref={reticle} style={{ left: 0 }} className="absolute top-1/2 flex items-center justify-center will-change-transform">
            <span className="pointer-events-none absolute h-20 w-px opacity-50" style={{ background: meta?.accent ?? C.gold }} />
            <div
              style={{ borderColor: meta ? `${meta.accent}99` : "rgba(212,168,102,0.45)", boxShadow: `0 0 12px ${meta?.glow ?? "rgba(212,168,102,0.15)"}` }}
              className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 ${active !== null ? "scale-100 opacity-100" : "scale-[0.85] opacity-55"}`}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[#F8F6F2]/25 bg-[#0E1825]/65">
                <span style={{ backgroundColor: meta?.accent ?? C.goldBright }} className="h-1.5 w-1.5 rounded-full transition-colors duration-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: five full-height columns — one click answers */}
      <div className="absolute inset-0 hidden grid-cols-5 md:grid" role="radiogroup" aria-label="Choisissez votre réponse">
        {options.map((o) => {
          const m = COLUMN_META[o.value];
          const isPassing = passing === o.value, isHover = hovered === o.value && passing === null, isPrev = existing === o.value && passing === null;
          const dim = (passing !== null && !isPassing) || (passing === null && hovered !== null && !isHover);
          const lit = isPassing || isHover;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={isPassing || isPrev}
              aria-label={o.label}
              disabled={locked}
              onMouseEnter={() => activate(o.value)}
              onFocus={() => activate(o.value)}
              onClick={() => fly(o.value)}
              className={`group relative flex h-full w-full cursor-pointer flex-col items-center justify-end pb-16 text-center transition-opacity duration-500 focus:outline-none lg:pb-20 ${dim ? "opacity-30" : "opacity-100"}`}
            >
              <div className={`relative z-10 flex flex-col items-center px-3 transition-transform duration-500 ${isPassing ? "-translate-y-4 scale-105" : isHover ? "-translate-y-2.5" : ""}`}>
                <span style={{ color: lit ? m.accent : undefined }} className={`font-film text-[10px] tracking-[0.3em] transition-colors duration-300 ${lit ? "" : isPrev ? "text-[#D4A866]" : "text-[#D4A866]/60"}`}>
                  {m.roman}
                </span>
                <span className={`mt-2.5 max-w-[172px] font-display text-[13.5px] leading-snug transition-all duration-300 lg:text-[15px] ${lit ? "font-medium text-[#FFFDF8]" : isPrev ? "font-normal text-[#F8F6F2]/95" : "font-light text-[#F8F6F2]/78"}`}>
                  {o.label}
                </span>
                <span aria-hidden style={{ backgroundColor: m.accent }} className={`mt-3 block h-px transition-all duration-500 ${lit ? "w-12 opacity-100" : isPrev ? "w-6 opacity-70" : "w-0 opacity-0"}`} />
                <span style={{ color: lit ? m.accent : undefined }} className={`font-film mt-2 text-[9px] tracking-[0.26em] uppercase transition-all duration-300 ${lit ? "opacity-100" : "text-[#F8F6F2]/35"}`}>
                  {lit ? "Choisir" : o.value}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* The statement */}
      <div className="pointer-events-none relative z-20 mx-auto flex w-full max-w-4xl flex-col items-center px-6 pt-20 text-center md:pt-28">
        <span aria-hidden className="stmt-rule mb-2.5 block h-px w-10 origin-center bg-[#D4A866]/60 md:mb-3 md:w-12" />
        <p className="stmt-prompt mb-2.5 text-[12px] tracking-[0.04em] text-[#D4A866]/85 italic md:mb-3.5 md:text-sm">Dans quelle mesure cette affirmation est-elle vraie pour vous ?</p>
        <h2
          ref={statement}
          tabIndex={-1}
          className="kinetic-type font-display text-[clamp(1.2rem,5.2vw,1.65rem)] leading-[1.32] font-light tracking-[-0.016em] text-[#F8F6F2] md:text-[clamp(1.38rem,2.85vw,2.4rem)] md:leading-[1.3]"
        >
          {q.text}
        </h2>
      </div>

      {/* Phone: five strata + the vertical rail; slide or tap to choose, then confirm */}
      <div
        ref={zone}
        onPointerDown={(e) => {
          if (locked) return;
          scrubbing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          mobileMove(e.clientY);
        }}
        onPointerMove={(e) => scrubbing.current && !locked && mobileMove(e.clientY)}
        onPointerUp={(e) => {
          if (!scrubbing.current) return;
          scrubbing.current = false;
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
          const v = fromPointer(e.clientY).v;
          setPicked(v);
          setMobileRatio((5 - v + 0.5) * 0.2);
          navigator.vibrate?.(10);
        }}
        onPointerCancel={() => {
          scrubbing.current = false;
        }}
        role="radiogroup"
        aria-label="Choisissez votre réponse"
        className="relative z-20 mx-auto mt-auto mb-2.5 flex max-h-[44svh] min-h-[220px] w-full flex-1 touch-none flex-col justify-between px-6 pr-16 md:hidden"
      >
        {mobileOptions.map((o) => {
          const m = COLUMN_META[o.value];
          const on = active === o.value, dim = active !== null && !on;
          return (
            <div
              key={o.value}
              role="radio"
              aria-checked={picked === o.value}
              tabIndex={0}
              onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), setPicked(o.value), hover(o.value))}
              className={`relative flex flex-1 items-center justify-between border-b border-[#F8F6F2]/[0.07] transition-all duration-300 last:border-b-0 ${dim ? "opacity-40" : "opacity-100"}`}
            >
              <div className={`flex items-center gap-3.5 transition-transform duration-300 ${on ? "translate-x-1.5" : ""}`}>
                <span style={{ color: on ? m.accent : undefined }} className={`font-film w-6 text-[10px] tracking-[0.24em] ${on ? "" : "text-[#D4A866]/60"}`}>
                  {m.roman}
                </span>
                <span className={`font-display text-[15px] leading-snug ${on ? "font-medium text-[#FFFDF8]" : "font-light text-[#F8F6F2]/80"}`}>{o.label}</span>
              </div>
            </div>
          );
        })}
        <div aria-hidden className="pointer-events-none absolute top-0 right-6 bottom-0 flex w-10 items-center justify-center">
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#F8F6F2]/18" />
          <div ref={mTrail} style={{ top: 0, background: meta?.accent ?? C.gold }} className="absolute left-1/2 w-[1.5px] -translate-x-1/2 opacity-80" />
          {TICKS.map((p) =>
            MAJOR.includes(p) ? null : (
              <span key={p} style={{ top: `${p}%` }} className={`absolute left-1/2 block h-px -translate-x-1/2 -translate-y-1/2 ${p % 10 === 0 ? "w-2.5 bg-[#F8F6F2]/22" : "w-1.5 bg-[#F8F6F2]/10"}`} />
            ),
          )}
          <div ref={mReticle} style={{ top: 0, left: "50%" }} className="absolute flex items-center justify-center will-change-transform">
            <div
              style={{ borderColor: meta ? `${meta.accent}AA` : "rgba(212,168,102,0.45)", boxShadow: `0 0 10px ${meta?.glow ?? "rgba(212,168,102,0.15)"}` }}
              className={`relative flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300 ${active !== null ? "scale-105 opacity-100" : "scale-[0.85] opacity-60"}`}
            >
              <span style={{ backgroundColor: meta?.accent ?? C.goldBright }} className="h-1.5 w-1.5 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20 md:mt-auto">
      {/* Phone: step 2, confirm the chosen answer */}
      <div className="px-6 md:hidden">
        <button
          type="button"
          disabled={picked === null || locked}
          onClick={() => picked !== null && fly(picked)}
          className="flex w-full items-center justify-center gap-3 border border-[#D4A866] bg-[#D4A866] py-3.5 font-display text-[12px] font-semibold tracking-[0.16em] text-[#172536] uppercase transition-all disabled:border-[#F8F6F2]/20 disabled:bg-transparent disabled:text-[#F8F6F2]/45"
        >
          {picked === null ? "Glissez ou touchez pour choisir" : "Valider ma réponse"}
          {picked !== null && <ArrowRight size={15} />}
        </button>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-6 pt-2.5 pb-2 md:px-10 md:pb-3">
        <button type="button" onClick={() => (cinemaAudio.playTick(), onBack())} disabled={locked} className="font-film inline-flex cursor-pointer items-center gap-2 text-[10px] tracking-[0.2em] text-[#F8F6F2]/60 uppercase transition-colors hover:text-[#E2C08A]">
          <ArrowLeft size={12} />
          <span>Précédente</span>
        </button>
        <span className="font-film hidden text-[10px] tracking-[0.14em] text-[#F8F6F2]/40 md:inline-block">{saveNotice}</span>
      </div>
      <p className="px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-[9px] leading-snug text-[#F8F6F2]/35 md:text-[9.5px]">{ownership}</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Open question, summary, preparation, end.
// ---------------------------------------------------------------------------

const MAX_OPEN = 1000;

function OpenIntention({ question, initial, pending, onMove }: { question: string; initial: string; pending: boolean; onMove: (text: string, dir: "next" | "previous") => void }) {
  const [text, setText] = useState(initial);
  const [focused, setFocused] = useState(false);
  return (
    <section className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
      <div className="mx-auto w-full max-w-2xl">
        <p className="font-film text-[10.5px] tracking-[0.24em] text-[#D4A866] uppercase">Une dernière question · facultative</p>
        <h1 className="mt-5 font-display text-[25px] leading-[1.28] font-extralight tracking-[-0.015em] text-[#F8F6F2] sm:text-[34px]">{question}</h1>
        <div className="mt-10 text-left">
          <div className="relative border-b border-[#F8F6F2]/28 pb-2">
            <textarea
              id="open-answer"
              value={text}
              maxLength={MAX_OPEN}
              rows={4}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(e) => setText(e.target.value)}
              aria-label="Votre réponse (facultative)"
              placeholder="Écrivez librement quelques lignes…"
              className="w-full resize-none bg-transparent py-3 text-[16.5px] leading-[1.75] font-light text-[#F8F6F2] placeholder:text-[#F8F6F2]/40 focus:outline-none"
            />
            <div aria-hidden className={`pointer-events-none absolute right-0 bottom-0 left-0 h-[1.5px] origin-left bg-[#D4A866] transition-transform duration-500 ${focused ? "scale-x-100" : "scale-x-0"}`} />
          </div>
          <div className="font-film mt-3 flex items-center justify-between gap-4 text-[10.5px] text-[#F8F6F2]/60">
            <span>Facultatif — cette réponse ne modifie pas vos résultats.</span>
            <span>
              {text.length} / {MAX_OPEN}
            </span>
          </div>
          <div className="mt-10 flex items-center justify-between gap-4">
            <button type="button" disabled={pending} onClick={() => (cinemaAudio.playTick(), onMove(text, "previous"))} className="font-film inline-flex cursor-pointer items-center gap-2 text-[11px] tracking-[0.14em] text-[#F8F6F2]/65 uppercase transition-colors hover:text-[#F8F6F2]">
              <ArrowLeft size={14} />
              <span>Précédente</span>
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => (cinemaAudio.playTick(), onMove(text, "next"))}
              className="group inline-flex cursor-pointer items-center gap-3 border border-[#D4A866] bg-[#D4A866] px-8 py-3.5 font-display text-[12px] font-semibold tracking-[0.16em] whitespace-nowrap text-[#172536] uppercase transition-colors hover:bg-[#E2C08A]"
            >
              <span>{text.trim() ? "Continuer" : "Passer"}</span>
              <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Review({
  screen,
  labels,
  pending,
  onEdit,
  onEditOpen,
  onConfirm,
}: {
  screen: RecapScreen;
  labels: readonly string[];
  pending: boolean;
  onEdit: (index: number, value: number) => void;
  onEditOpen: () => void;
  onConfirm: () => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [series, setSeries] = useState<number | "all">("all");
  const [asking, setAsking] = useState(false);
  const groups = series === "all" ? SECTION_GROUPS : SECTION_GROUPS.filter((g) => g.index === series);
  const tab = (on: boolean) => `font-film cursor-pointer border-b px-2.5 py-1.5 text-[10px] tracking-[0.18em] uppercase transition-all ${on ? "border-[#E2C08A] text-[#E8CB93]" : "border-transparent text-[#F8F6F2]/50 hover:text-[#F8F6F2]/90"}`;

  return (
    <section className="relative min-h-[100dvh] w-full px-6 pt-28 pb-32 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col justify-between gap-8 border-b border-[#F8F6F2]/12 pb-10 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="font-film text-[10.5px] tracking-[0.26em] text-[#D4A866] uppercase">Récapitulatif · 30 questions</p>
            <h1 className="mt-4 font-display text-[36px] leading-[1.08] font-extralight tracking-[-0.02em] text-[#F8F6F2] sm:text-[50px]">Vérifiez vos réponses</h1>
            <p className="mt-4 text-[15px] leading-[1.7] font-light text-[#F8F6F2]/72">
              Vous pouvez revenir sur chaque réponse avant de confirmer. Après confirmation, elles ne pourront plus être modifiées.
            </p>
          </div>
          <nav aria-label="Filtrer par série" className="flex max-w-full shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 whitespace-nowrap">
            <button type="button" aria-pressed={series === "all"} onClick={() => setSeries("all")} className={tab(series === "all")}>
              Toutes (30)
            </button>
            {SECTION_GROUPS.map((g) => (
              <button key={g.index} type="button" aria-pressed={series === g.index} onClick={() => setSeries(g.index)} className={tab(series === g.index)}>
                {g.roman}
              </button>
            ))}
          </nav>
        </header>

        <div className="mt-10 space-y-12">
          {groups.map((g) => (
            <div key={g.index}>
              <div className="flex items-center justify-between border-b border-[#D4A866]/25 pb-3">
                <div className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rotate-45 bg-[#D4A866]" />
                  <span className="font-film text-[10.5px] tracking-[0.24em] text-[#D4A866] uppercase">Série {g.roman}</span>
                </div>
                <span className="font-film text-[10px] tracking-[0.18em] text-[#F8F6F2]/45">{g.rangeLabel}</span>
              </div>
              <ol className="divide-y divide-[#F8F6F2]/[0.08]">
                {screen.items.slice(g.index * 6, g.index * 6 + 6).map((it) => {
                  const m = COLUMN_META[it.value] ?? COLUMN_META[3];
                  const open = editing === it.index, dot = ((it.value - 1) / 4) * 100, code = String(it.number).padStart(2, "0");
                  return (
                    <li key={it.index} className={`transition-colors duration-300 ${open ? "bg-[#F8F6F2]/[0.03]" : "hover:bg-[#F8F6F2]/[0.02]"}`}>
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-label={`Modifier la réponse à la question ${it.number}`}
                        onClick={() => (cinemaAudio.playTick(), setEditing(open ? null : it.index))}
                        className="flex w-full cursor-pointer flex-col justify-between gap-3 px-2 py-5 text-left sm:flex-row sm:items-center sm:px-3"
                      >
                        <span className="flex items-baseline gap-4">
                          <span className="font-film shrink-0 text-[10.5px] tracking-[0.16em] text-[#D4A866]/80">Q{code}</span>
                          <span className="font-display text-[15px] font-light text-[#F8F6F2]/90">Question {code}</span>
                        </span>
                        <span className="flex items-center justify-between gap-6 pl-9 sm:justify-end sm:pl-0">
                          <span className="relative flex h-5 w-28 items-center sm:w-32" aria-hidden>
                            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#F8F6F2]/16" />
                            <span style={{ left: `${Math.min(50, dot)}%`, width: `${Math.abs(dot - 50)}%`, backgroundColor: m.accent }} className="absolute top-1/2 h-[1.5px] -translate-y-1/2 opacity-80" />
                            {[0, 25, 50, 75, 100].map((p) => (
                              <span key={p} style={{ left: `${p}%` }} className="absolute top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 bg-[#F8F6F2]/22" />
                            ))}
                            <span style={{ left: `${dot}%`, backgroundColor: m.accent, boxShadow: `0 0 8px ${m.glow}` }} className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" />
                          </span>
                          <span className="flex min-w-[168px] items-center justify-end gap-3 text-right">
                            <span style={{ color: m.accent }} className="font-display text-[13px] leading-tight">
                              {it.label}
                            </span>
                            <span className="font-film w-5 text-right text-[10px] tracking-[0.18em] text-[#F8F6F2]/40">{m.roman}</span>
                          </span>
                        </span>
                      </button>
                      {open && (
                        <div className="px-2 pt-1 pb-6 pl-9 sm:px-3 sm:pl-12">
                          <div className="border-t border-[#D4A866]/25 pt-3 pb-2">
                            <p className="font-film mb-3 text-[9.5px] tracking-[0.22em] text-[#D4A866]/85 uppercase">Ajuster votre réponse · Question {code}</p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                              {labels.map((label, i) => {
                                const v = i + 1, sel = it.value === v, om = COLUMN_META[v];
                                return (
                                  <button
                                    key={v}
                                    type="button"
                                    disabled={pending}
                                    onClick={() => {
                                      cinemaAudio.playDialTick(v);
                                      setEditing(null);
                                      if (!sel) onEdit(it.index, v);
                                    }}
                                    style={{ borderColor: sel ? om.accent : "rgba(248,246,242,0.12)" }}
                                    className="flex cursor-pointer items-center justify-between gap-2 border-b px-3 py-2.5 text-left transition-all hover:bg-[#F8F6F2]/[0.04] sm:flex-col sm:items-start sm:border-t sm:border-b-0"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span style={{ color: om.accent }} className="font-film text-[10px] tracking-[0.2em]">
                                        {om.roman}
                                      </span>
                                      {sel && <Check size={12} style={{ color: om.accent }} />}
                                    </span>
                                    <span className={`font-display text-[12.5px] leading-snug ${sel ? "font-medium text-[#FFFDF8]" : "font-light text-[#F8F6F2]/70"}`}>{label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col justify-between gap-4 border-y border-[#F8F6F2]/14 py-7 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <span className="font-film text-[10px] tracking-[0.24em] text-[#D4A866] uppercase">Question ouverte · Facultative</span>
            <p className="mt-2 font-display text-[15.5px] leading-[1.65] font-light whitespace-pre-line text-[#F8F6F2]/85">{screen.openAnswer.trim() || "Aucune réponse (facultatif)."}</p>
          </div>
          <button type="button" disabled={pending} onClick={() => (cinemaAudio.playTick(), onEditOpen())} className="font-film inline-flex cursor-pointer items-center gap-2 self-start border-b border-transparent pb-1 text-[10.5px] tracking-[0.18em] text-[#F8F6F2]/65 uppercase transition-all hover:border-[#D4A866] hover:text-[#E2C08A] sm:self-center">
            <Pencil size={13} />
            <span>Modifier</span>
          </button>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="font-display text-[24px] font-extralight tracking-[-0.015em] text-[#F8F6F2] sm:text-[30px]">Lorsque vous êtes prêt, confirmez vos réponses.</p>
            <p className="mt-1.5 text-[14px] font-light text-[#F8F6F2]/62">Votre cartographie sera alors calculée à partir de vos 30 réponses.</p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => (cinemaAudio.playTick(), setAsking(true))}
            className="inline-flex cursor-pointer items-center justify-center gap-3 border border-[#D4A866] bg-[#D4A866] px-9 py-4 font-display text-[12px] font-semibold tracking-[0.18em] whitespace-nowrap text-[#172536] uppercase shadow-[0_0_28px_rgba(212,168,102,0.18)] transition-all hover:bg-[#E2C08A] active:scale-[0.98]"
          >
            <ShieldCheck size={16} />
            <span>Je confirme mes réponses</span>
          </button>
        </div>
      </div>

      {asking &&
        createPortal(
          <div role="alertdialog" aria-modal="true" aria-labelledby="rvc-confirm-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0B141F]/90 p-6">
            <div className="relative w-full max-w-lg py-12 text-center text-[#F8F6F2]">
              <span aria-hidden className="mx-auto mb-8 block h-px w-24 bg-[#D4A866]/60" />
              <p className="font-film text-[10.5px] tracking-[0.26em] text-[#D4A866] uppercase">Confirmation définitive</p>
              <h2 id="rvc-confirm-title" className="mt-4 font-display text-[32px] font-extralight tracking-[-0.02em] text-[#F8F6F2] sm:text-[40px]">
                Confirmer définitivement ?
              </h2>
              <p className="mt-3.5 text-[15px] leading-[1.7] font-light text-[#F8F6F2]/72">Vos 30 réponses seront figées et ne pourront plus être modifiées.</p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setAsking(false);
                    onConfirm();
                  }}
                  className="cursor-pointer border border-[#D4A866] bg-[#D4A866] px-9 py-4 font-display text-[12px] font-semibold tracking-[0.16em] whitespace-nowrap text-[#172536] uppercase transition-all hover:bg-[#E2C08A]"
                >
                  Oui, je confirme
                </button>
                <button type="button" onClick={() => setAsking(false)} className="font-film cursor-pointer px-5 py-3 text-[10.5px] tracking-[0.16em] text-[#F8F6F2]/65 uppercase transition-colors hover:text-[#F8F6F2]">
                  Revenir à mes réponses
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}

function Confirmed({
  ownership,
  pending,
  delivery,
  end,
  onRestart,
}: {
  ownership: string;
  pending: boolean;
  delivery: DeliveryState;
  end: EndTexts;
  onRestart: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.fromTo(".conf-reveal", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.78, stagger: 0.1, ease: "dr.cinema" });
    },
    { scope: root },
  );
  return (
    <section ref={root} className="relative flex min-h-[100dvh] w-full flex-col items-center justify-between px-6 pt-28 pb-10 text-center">
      <div className="conf-reveal mx-auto my-auto w-full">
        {delivery.status === "none" && (
          <p className="font-display mb-12 text-[15px] font-light tracking-[0.02em] text-[#F8F6F2]/70">Vos réponses sont confirmées.</p>
        )}
        <ReportStep initial={delivery} end={end} />
      </div>
      <div className="conf-reveal mt-12 flex flex-col items-center gap-6">
        <button
          type="button"
          disabled={pending}
          onClick={() => (cinemaAudio.playTick(), onRestart())}
          className="font-film inline-flex cursor-pointer items-center gap-2 text-[10px] tracking-[0.2em] text-[#F8F6F2]/45 uppercase transition-colors hover:text-[#E2C08A]"
        >
          <RotateCcw size={12} /> Faire une nouvelle passation
        </button>
        <p className="max-w-2xl text-[11px] leading-[1.6] font-light text-[#F8F6F2]/45">{ownership}</p>
      </div>
    </section>
  );
}
