"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

const DURATION = 900;
const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
// French numbers: « 5 930 », « 1 190 », « 39 », « 4,5 » (grouping with a (narrow) no-break space).
const NUMBER = /\d{1,3}(?:[   ]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Calls `onVisible` once, the first time the element scrolls into view. */
function useOnVisible(ref: React.RefObject<Element | null>, onVisible: () => void) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          onVisible();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Animated figure: every number inside `value` counts up from 0 when it comes into view
 * (« 6 750 € · 1 190 CHF », « 39 % »…). The server renders the final text; the count only runs in the browser,
 * and is skipped when the visitor prefers reduced motion.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const parts = value.split(NUMBER);
  const numbers = value.match(NUMBER) ?? [];

  const render = (progress: number) =>
    parts
      .map((part, i) => {
        if (i >= numbers.length) return part;
        const raw = numbers[i];
        const sep = raw.match(/[   ]/)?.[0] ?? " ";
        const decimals = raw.split(",")[1]?.length ?? 0;
        const target = Number(raw.replace(/[   ]/g, "").replace(",", "."));
        const current = target * progress;
        const formatted = new Intl.NumberFormat("fr-FR", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
          .format(decimals ? current : Math.round(current))
          .replace(/[  ]/g, sep);
        return part + formatted;
      })
      .join("");

  // Before the first paint: show zeros, so the figure doesn't flash its final value first.
  useLayoutEffect(() => {
    if (ref.current && numbers.length && !reducedMotion()) ref.current.textContent = render(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useOnVisible(ref, () => {
    if (!numbers.length || reducedMotion()) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      if (ref.current) ref.current.textContent = render(ease(t));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

/**
 * Starts the CSS entrance animations (bars growing, donut drawing) of its children
 * when they scroll into view: CSS keeps them paused until `data-visible` is set.
 */
export function AnimateOnView({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useOnVisible(ref, () => ref.current?.setAttribute("data-visible", ""));
  return (
    <div ref={ref} data-animate className={className}>
      {children}
    </div>
  );
}
