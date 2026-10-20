"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { bookingHref } from "./nav";

/** Phones only: a small gold « Réserver » button, shown once the visitor has scrolled past the opening photo. */
export function FloatingBooking({ source }: { source: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <Link
      href={bookingHref(source)}
      aria-hidden={!shown}
      tabIndex={shown ? undefined : -1}
      className={cn(
        "fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 inline-flex h-12 items-center gap-2 rounded-[7px] bg-gold px-5 font-heading text-[14px] font-bold text-navy shadow-[0_8px_24px_rgba(23,37,54,0.35)] transition-[opacity,translate] duration-300 md:hidden",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <span aria-hidden className="size-2 rounded-full bg-navy" />
      Réserver
    </Link>
  );
}
