"use client";

/**
 * GSAP set-up for the Révélateur (ported from the "cinema" prototype Jérémy approved).
 * Only the plugins actually used are registered: SplitText, ScrambleText and three house curves.
 */
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

let ready = false;
if (typeof window !== "undefined" && !ready) {
  gsap.registerPlugin(useGSAP, CustomEase, SplitText, ScrambleTextPlugin);
  CustomEase.create("dr.develop", "M0,0 C0.22,0 0.18,1 1,1"); // emergence, liquid, light
  CustomEase.create("dr.cinema", "M0,0 C0.19,1 0.22,1 1,1"); // weighted entrances
  CustomEase.create("dr.exit", "M0,0 C0.55,0 0.85,0.22 1,1"); // accelerating departures
  ready = true;
}

export { gsap, useGSAP, SplitText };

/** JG® palette used by the experience (closer to Jérémy's brand than the prototype's obsidian). */
export const C = {
  ivory: "#F8F6F2",
  gold: "#D4A866",
  goldBright: "#E2C08A",
  navy: "#172536",
  deep: "#0E1825",
} as const;

/** Five answer positions (I → V): teal-grey to JG gold, with soft glows (kept low: no flashing). */
export const COLUMN_META: Record<number, { accent: string; glow: string; roman: string }> = {
  1: { accent: "#8FB5B1", glow: "rgba(143,181,177,0.32)", roman: "I" },
  2: { accent: "#C3C9C8", glow: "rgba(195,201,200,0.30)", roman: "II" },
  3: { accent: "#DDCFB4", glow: "rgba(221,207,180,0.32)", roman: "III" },
  4: { accent: "#E0C08A", glow: "rgba(224,192,138,0.36)", roman: "IV" },
  5: { accent: "#E8CB93", glow: "rgba(232,203,147,0.40)", roman: "V" },
};

export const SECTION_GROUPS = [
  { index: 0, roman: "I", rangeLabel: "Q01 — Q06", subtitle: "Premier regard · 6 affirmations" },
  { index: 1, roman: "II", rangeLabel: "Q07 — Q12", subtitle: "Deuxième regard · 6 affirmations" },
  { index: 2, roman: "III", rangeLabel: "Q13 — Q18", subtitle: "Troisième regard · 6 affirmations" },
  { index: 3, roman: "IV", rangeLabel: "Q19 — Q24", subtitle: "Quatrième regard · 6 affirmations" },
  { index: 4, roman: "V", rangeLabel: "Q25 — Q30", subtitle: "Cinquième regard · Dernière série" },
] as const;

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
