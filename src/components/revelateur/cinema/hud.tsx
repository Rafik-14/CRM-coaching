"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX } from "lucide-react";
import { cinemaAudio } from "./audio";
import { SECTION_GROUPS } from "./gsap";

/** The JG® mark, drawn small for the corner button. */
export function JgMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M19 10V28.5C19 33.2 15.6 36.5 11.2 36.5C8.5 36.5 6.4 35.3 5 33.4" stroke="#F8F6F2" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M39.5 20.5C37.6 16.4 33.6 13.8 28.8 13.8C22 13.8 17 18.8 17 25.5C17 32.3 22 37.2 28.9 37.2C35.2 37.2 39.8 33 40.3 26.8H30.2" stroke="#F8F6F2" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M12.5 34.5L39.5 8.5M32.5 8.2L40.2 7.8L39.2 15.5" stroke="#D4A866" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Discreet corner HUD: the JG® mark (back to the start page), the statement counter with five series
 * dots while answering, and the sound switch.
 */
export function CinemaHUD({ progress }: { progress?: { index: number; answered: number; group: number } }) {
  const [scrolled, setScrolled] = useState(false);
  const [sound, setSound] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved choice lives in localStorage, read after hydration
    setSound(cinemaAudio.enabled);
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed top-0 right-0 left-0 z-40 flex items-center justify-between px-4 pt-[max(0.85rem,env(safe-area-inset-top))] pb-3 transition-all duration-500 sm:px-9 sm:py-5 ${
        scrolled ? "border-b border-[#F8F6F2]/10 bg-[#0E1825]/85 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="pointer-events-auto flex items-center gap-4">
        <Link
          href="/revelateur"
          onClick={() => cinemaAudio.playTick()}
          className="flex h-10 w-10 items-center justify-center border border-[#F8F6F2]/18 bg-[#0E1825]/65 backdrop-blur-md transition-colors hover:border-[#D4A866]"
          title="Retour à l'accueil du Révélateur"
          aria-label="Retour à l'accueil du Révélateur"
        >
          <JgMark />
        </Link>

        {progress ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <span className="font-display text-[12px] font-medium tracking-[0.18em] text-[#F8F6F2] uppercase" aria-live="polite">
                Question {String(progress.index + 1).padStart(2, "0")} / 30
              </span>
              {progress.answered > 0 && (
                <span className="font-film hidden text-[10px] tracking-[0.08em] text-[#D4A866]/85 sm:inline">
                  · {progress.answered} {progress.answered > 1 ? "réponses enregistrées" : "réponse enregistrée"}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2" aria-hidden>
              {SECTION_GROUPS.map((g) => (
                <span
                  key={g.index}
                  className={`block h-1.5 w-1.5 rounded-full transition-all duration-500 ${
                    g.index === progress.group
                      ? "scale-125 bg-[#D4A866] shadow-[0_0_6px_rgba(212,168,102,0.5)]"
                      : g.index < progress.group
                        ? "bg-[#D4A866]/70"
                        : "border border-[#F8F6F2]/30 bg-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="hidden flex-col sm:flex">
            <span className="font-display text-[11px] font-medium tracking-[0.26em] text-[#F8F6F2]/90 uppercase">Le Révélateur</span>
            <span className="font-film text-[9.5px] tracking-[0.2em] text-[#D4A866]/80 uppercase">Test Signature JG®</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          const next = !sound;
          cinemaAudio.setEnabled(next);
          setSound(next);
          if (next) cinemaAudio.playTick();
        }}
        aria-pressed={sound}
        aria-label={sound ? "Couper le son" : "Activer le son"}
        className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#F8F6F2]/20 bg-[#0E1825]/65 text-[#F8F6F2]/85 backdrop-blur-md transition-all hover:border-[#D4A866] hover:text-[#D4A866]"
      >
        {sound ? <Volume2 size={17} strokeWidth={1.4} className="text-[#D4A866]" /> : <VolumeX size={17} strokeWidth={1.4} />}
      </button>
    </div>
  );
}
