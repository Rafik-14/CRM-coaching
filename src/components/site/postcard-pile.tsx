"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The postcards of Le Chant du Merle (.jg-pile, globals.css): on tablets and computers they fan out into a row when
 * the pile comes on screen and gather back into a pile when it leaves. Open by default, so without JavaScript (or
 * before it runs) every card shows; phones get a row to swipe instead.
 */
export function PostcardPile({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLOListElement>(null);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => setOpen(entry.isIntersecting), { threshold: 0.45 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <ol ref={ref} className="jg-pile" data-open={open ? "" : undefined} aria-label={label}>
      {children}
    </ol>
  );
}
