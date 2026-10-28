"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { bookingHref } from "./nav";
import { whatsappHref } from "./whatsapp";

const ACTION_LABEL =
  "rounded-[7px] bg-white px-3 py-1.5 font-heading text-[14px] font-semibold text-navy shadow-[0_4px_14px_rgba(23,37,54,0.18)]";
const ACTION_ICON = "flex size-12 items-center justify-center rounded-full shadow-[0_6px_18px_rgba(23,37,54,0.25)] [&_svg]:size-5";

/**
 * Floating action button, bottom right of every page: one round gold button that opens the two quick ways to reach
 * Jérémy, « Réserver un échange » and « WhatsApp ». Closes on Escape, on a click outside, or once an action is chosen.
 */
export function ContactFab() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-3 md:right-6 md:bottom-6"
    >
      <ul
        id="contact-fab-actions"
        hidden={!open}
        className="flex flex-col items-end gap-3"
      >
        <li>
          <Link href={bookingHref("bouton-flottant")} onClick={() => setOpen(false)} className="flex items-center gap-3">
            <span className={ACTION_LABEL}>Réserver un échange</span>
            <span aria-hidden className={cn(ACTION_ICON, "bg-navy text-white")}>
              <CalendarDays strokeWidth={1.75} />
            </span>
          </Link>
        </li>
        <li>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3"
          >
            <span className={ACTION_LABEL}>
              WhatsApp<span className="sr-only"> (nouvel onglet)</span>
            </span>
            <span aria-hidden className={cn(ACTION_ICON, "bg-[#25D366] text-[#0b3d22]")}>
              <MessageCircle strokeWidth={2} />
            </span>
          </a>
        </li>
      </ul>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="contact-fab-actions"
        aria-label={open ? "Fermer" : "Contacter Jérémy Galéa : réserver un échange ou écrire sur WhatsApp"}
        onClick={() => setOpen((v) => !v)}
        className="flex size-14 items-center justify-center rounded-full bg-gold text-navy shadow-[0_8px_24px_rgba(23,37,54,0.3)] transition-transform duration-200 hover:-translate-y-px motion-reduce:hover:translate-y-0 [&_svg]:size-6"
      >
        {open ? <X aria-hidden strokeWidth={2} /> : <MessageCircle aria-hidden strokeWidth={2} />}
      </button>
    </div>
  );
}
