"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight, RotateCcw } from "lucide-react";
import { MONOGRAM_LETTERS, MONOGRAM_MARK, MONOGRAM_VIEWBOX } from "../monogram";
import { cinemaAudio } from "./audio";
import { CinemaHUD } from "./hud";
import { gsap, reducedMotion, SplitText, useGSAP } from "./gsap";
import { setWorld } from "./world";

export type LandingTexts = {
  intro: readonly string[]; // INTRO_LINES (server)
  welcome: { title: string; paragraphs: readonly string[]; closing: string };
  ownership: string;
};

/**
 * Le Révélateur — start page (ported from the approved prototype). A full-screen navy logo reveal,
 * then the kinetic overture, the validated welcome texts below, and the start.
 */
export function CinemaLanding({ texts, savedCount }: { texts: LandingTexts; savedCount: number }) {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // INTRO_LINES: presents · "Vous avez une valeur." · "Savez-vous…" · 5 dimensions · title · subtitle · lead · ready · facts
  const [presents, youHave, unique, dims, , , lead, ready, facts] = texts.intro;

  useEffect(() => {
    setWorld({ stage: "landing" });
    setWorld({ gravityActive: false });
    router.prefetch("/revelateur/experience");
    document.documentElement.classList.add("rs-locked");
    // The overture under the logo. Browsers may hold sound until a first click or tap: it is then
    // queued, plays if the person touches the page during the reveal, and is dropped otherwise.
    cinemaAudio.playOverture();
    const wake = () => cinemaAudio.wake();
    window.addEventListener("pointerdown", wake, { once: true });
    window.addEventListener("keydown", wake, { once: true });
    const t = window.setTimeout(() => setRevealed(true), reducedMotion() ? 300 : 3600);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      document.documentElement.classList.remove("rs-locked");
    };
  }, [router]);
  useEffect(() => {
    if (!revealed) return;
    document.documentElement.classList.remove("rs-locked");
    const t = window.setTimeout(() => cinemaAudio.dropIfSilent(), 1000);
    return () => window.clearTimeout(t);
  }, [revealed]);

  // The overture plays once the curtain has lifted.
  useGSAP(
    () => {
      if (!revealed || !root.current) return;
      if (reducedMotion()) {
        gsap.set(".ov-beat, .ov-kicker", { opacity: 1 });
        return;
      }
      let title: SplitText | null = null, leadSplit: SplitText | null = null, tl: gsap.core.Timeline | null = null, cancelled = false;
      document.fonts.ready.then(() => {
        if (cancelled || !root.current) return;
        const h1 = root.current.querySelector(".overture-title"), ld = root.current.querySelector(".overture-lead");
        if (h1) title = SplitText.create(h1, { type: "words, chars", mask: "words" });
        if (ld) leadSplit = SplitText.create(ld, { type: "lines, words", mask: "lines", linesClass: "split-line-mask" });
        tl = gsap.timeline({ defaults: { ease: "dr.cinema" } });
        tl.fromTo(".ov-kicker", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.55 }, 0.06).to(
          ".ov-kicker",
          { duration: 0.9, scrambleText: { text: "UNE EXCLUSIVITÉ JG®", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ·", revealDelay: 0.12, speed: 0.6 } },
          0.06,
        );
        if (title)
          tl.fromTo(
            title.chars,
            { yPercent: 120, rotationX: -62, opacity: 0, filter: "blur(9px)", color: "#E2C08A", transformOrigin: "50% 100% -24px" },
            { yPercent: 0, rotationX: 0, opacity: 1, filter: "blur(0px)", color: "#F8F6F2", duration: 1.05, stagger: { amount: 0.44 }, ease: "dr.develop" },
            0.16,
          );
        if (leadSplit)
          tl.fromTo(
            leadSplit.words,
            { yPercent: 110, rotationX: -36, opacity: 0, filter: "blur(5px)" },
            { yPercent: 0, rotationX: 0, opacity: 1, filter: "blur(0px)", duration: 0.78, stagger: { amount: 0.28 }, ease: "dr.develop" },
            0.46,
          );
        tl.fromTo(".ov-beat", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.72, stagger: 0.09 }, 0.62);
      });
      return () => {
        cancelled = true;
        tl?.kill();
        title?.revert();
        leadSplit?.revert();
      };
    },
    { scope: root, dependencies: [revealed] },
  );

  const launch = (fromStart: boolean) => {
    if (leaving) return;
    cinemaAudio.playActInterlude();
    setLeaving(true);
    const go = () => router.push(fromStart && savedCount > 0 ? "/revelateur/experience?depuis=debut" : "/revelateur/experience");
    if (reducedMotion() || !root.current) return go();
    gsap.to(root.current, { opacity: 0, duration: 0.45, ease: "dr.exit" });
    window.setTimeout(go, 650);
  };

  const startButton = (extra = "") => (
    <button
      type="button"
      onClick={() => launch(true)}
      disabled={leaving}
      className={`group inline-flex cursor-pointer items-center justify-center gap-3.5 border border-[#D4A866] bg-[#D4A866] px-8 py-4 font-display text-[12px] font-semibold tracking-[0.18em] whitespace-nowrap text-[#172536] uppercase shadow-[0_0_28px_rgba(212,168,102,0.18)] transition-all duration-300 hover:bg-[#E2C08A] active:scale-[0.98] sm:px-9 ${extra}`}
    >
      <span>Je commence l&apos;expérience</span>
      <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
    </button>
  );

  return (
    <>
      <div className={`rvc-reveal ${revealed ? "is-gone" : ""}`} onClick={() => setRevealed(true)} aria-hidden>
        <svg viewBox={MONOGRAM_VIEWBOX}>
          <path className="rs-logo-letters" d={MONOGRAM_LETTERS} pathLength={1} fillRule="evenodd" />
          <path className="rs-logo-mark" d={MONOGRAM_MARK} fillRule="evenodd" />
        </svg>
        <p>{presents}</p>
      </div>
      <div className={`rvc-veil ${leaving ? "is-on" : ""}`} aria-hidden />
      <CinemaHUD />

      <div ref={root} className="relative w-full text-[#F8F6F2]">
        <section className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center px-5 pt-16 pb-10 text-center sm:px-6 sm:pt-20 sm:pb-16">
          <p className="ov-kicker font-film text-[10px] tracking-[0.28em] text-[#D4A866] uppercase opacity-0 sm:text-[10.5px]">Une exclusivité JG®</p>
          <h1 className="overture-title kinetic-type mt-4 font-display text-[44px] leading-[1.04] font-extralight tracking-[-0.03em] text-[#F8F6F2] sm:mt-5 sm:text-[76px] md:text-[92px]">
            Le Révélateur
          </h1>
          <p className="ov-beat font-film mt-2 text-[10.5px] tracking-[0.26em] text-[#D4A866]/85 uppercase opacity-0 sm:mt-2.5 sm:text-[11px]">Test Signature JG®</p>
          <p className="overture-lead kinetic-type mt-5 max-w-xl font-display text-[19px] leading-[1.4] font-light text-[#F8F6F2]/92 sm:mt-6 sm:text-[25px]">{lead}</p>
          <p className="ov-beat mt-2.5 max-w-lg text-[14.5px] leading-[1.58] font-light text-[#F8F6F2]/72 opacity-0 sm:mt-3 sm:text-[15px]">{dims}</p>
          <p className="ov-beat font-film mt-4 text-[10px] tracking-[0.14em] text-[#F8F6F2]/58 uppercase opacity-0 sm:mt-5 sm:text-[10.5px] sm:tracking-[0.16em]">{facts}</p>
          <p className="ov-beat mt-4 font-display text-[12.5px] font-medium tracking-[0.12em] text-[#D4A866] uppercase opacity-0 sm:mt-5 sm:text-[13.5px] sm:tracking-[0.14em]">{ready}</p>

          <div className="ov-beat mt-7 flex w-full flex-col items-center justify-center gap-3.5 opacity-0 sm:mt-9 sm:w-auto sm:flex-row sm:gap-4">
            {startButton("w-full sm:w-auto")}
            {savedCount > 0 && (
              <button
                type="button"
                onClick={() => launch(false)}
                disabled={leaving}
                className="inline-flex cursor-pointer items-center gap-2.5 border border-[#F8F6F2]/28 bg-[#0E1825]/55 px-6 py-4 font-display text-[11.5px] font-medium tracking-[0.15em] whitespace-nowrap text-[#F8F6F2] uppercase backdrop-blur-md transition-colors hover:border-[#D4A866] hover:text-[#D4A866]"
              >
                <RotateCcw size={14} />
                <span>Reprendre ({savedCount}/30)</span>
              </button>
            )}
          </div>

          <a href="#preface" className="ov-beat font-film mt-14 inline-flex items-center gap-2 text-[10px] tracking-[0.22em] text-[#F8F6F2]/50 uppercase opacity-0 transition-colors hover:text-[#D4A866]">
            <span>{texts.welcome.title.replace(/\.$/, "")}</span>
            <ArrowDown size={12} />
          </a>
        </section>

        <section id="preface" className="mx-auto max-w-3xl border-t border-[#F8F6F2]/12 px-6 py-24 text-center sm:px-10">
          <p className="font-film text-[10.5px] tracking-[0.24em] text-[#D4A866] uppercase">
            {youHave} {unique}
          </p>
          <h2 className="mt-5 font-display text-[32px] font-extralight tracking-[-0.02em] text-[#F8F6F2] sm:text-[42px]">{texts.welcome.title}</h2>
          <div className="mx-auto mt-8 max-w-2xl space-y-5 text-[15.5px] leading-[1.82] font-light text-[#F8F6F2]/80">
            {texts.welcome.paragraphs.map((p, i) => (
              <p key={i} className={i === 2 ? "pt-1 font-display text-[18px] font-normal text-[#F8F6F2]" : undefined}>
                {p}
              </p>
            ))}
            <p className="font-display text-[16px] text-[#D4A866]">{texts.welcome.closing}</p>
          </div>
          <div className="mt-12 flex flex-col items-center">
            {startButton()}
            <p className="mt-12 max-w-2xl text-[11px] leading-[1.6] font-light text-[#F8F6F2]/45">{texts.ownership}</p>
          </div>
        </section>
      </div>
    </>
  );
}
