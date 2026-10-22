"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DESKTOP_MORE, SITE_NAV, isActive } from "./nav";

/**
 * Desktop navigation. Ten pages don't fit on one line next to the logo and the button, so the last ones sit in a
 * « Plus » menu and « Accueil » is the logo (the phone menu lists every page). The active page gets a gold
 * underline (not colour alone) and aria-current.
 */
export function SiteNavLinks() {
  const pathname = usePathname();
  return <NavList pathname={pathname} />;
}

const linkClass = (active: boolean) =>
  cn(
    "relative inline-flex min-h-11 items-center font-heading text-[13.5px] font-medium whitespace-nowrap text-navy transition-colors duration-200 hover:text-gold 2xl:text-[14px]",
    "after:absolute after:inset-x-0 after:bottom-1.5 after:h-0.5 after:bg-gold after:transition-opacity after:duration-200",
    active ? "after:opacity-100" : "after:opacity-0",
  );

export function NavList({ pathname }: { pathname?: string }) {
  const main = SITE_NAV.filter((item) => item.href !== "/" && !DESKTOP_MORE.includes(item.href));
  const more = SITE_NAV.filter((item) => DESKTOP_MORE.includes(item.href));
  return (
    <ul className="flex items-center gap-x-[clamp(0.75rem,1.1vw,1.5rem)]">
      {main.map((item) => {
        const active = pathname ? isActive(pathname, item.href) : false;
        return (
          <li key={item.href}>
            <Link href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
              {item.label}
            </Link>
          </li>
        );
      })}
      <li>
        <MoreMenu items={more} pathname={pathname} />
      </li>
    </ul>
  );
}

function MoreMenu({ items, pathname }: { items: { href: string; label: string }[]; pathname?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const active = !!pathname && items.some((item) => isActive(pathname, item.href));

  // Closes on a click elsewhere or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className={cn(linkClass(active), "gap-1")}>
        Plus
        <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <ul
          id={id}
          className="absolute top-full right-0 z-50 mt-1 grid min-w-52 gap-0.5 rounded-[10px] border border-[var(--jg-light-gray)] bg-white p-2 shadow-[0_12px_32px_rgba(23,37,54,0.12)]"
        >
          {items.map((item) => {
            const current = !!pathname && isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center rounded-[7px] px-3 font-heading text-[14px] font-medium text-navy transition-colors hover:bg-ivory",
                    current && "bg-ivory",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
