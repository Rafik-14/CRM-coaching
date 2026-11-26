"use client";

import Link from "next/link";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DESKTOP_MORE, DESKTOP_MORE_BELOW_WIDE, SITE_NAV, TEST_NAV_AFTER, TEST_NAV_ITEM, isActive } from "./nav";

/**
 * Desktop navigation. Ten pages don't fit on one line next to the logo and the button, so the last ones sit in a
 * « Plus » menu and « Accueil » is the logo (the phone menu lists every page). The active page gets a gold
 * underline (not colour alone) and aria-current.
 */
export function SiteNavLinks({ showTest = false }: { showTest?: boolean }) {
  const pathname = usePathname();
  return <NavList pathname={pathname} showTest={showTest} />;
}

const linkClass = (active: boolean) =>
  cn(
    "relative inline-flex min-h-11 items-center font-heading text-[13px] font-medium whitespace-nowrap text-white transition-colors duration-200 hover:text-gold min-[1440px]:text-[13.5px] 2xl:text-[14px]",
    "after:absolute after:inset-x-0 after:bottom-1.5 after:h-0.5 after:bg-gold after:transition-opacity after:duration-200",
    active ? "after:opacity-100" : "after:opacity-0",
  );

export function NavList({ pathname, showTest = false }: { pathname?: string; showTest?: boolean }) {
  const main = SITE_NAV.filter((item) => item.href !== "/" && !DESKTOP_MORE.includes(item.href));
  const more: { href: string; label: string; wideHidden?: boolean }[] = [
    ...SITE_NAV.filter((item) => DESKTOP_MORE_BELOW_WIDE.includes(item.href)).map((item) => ({ ...item, wideHidden: true })),
    ...SITE_NAV.filter((item) => DESKTOP_MORE.includes(item.href)),
  ];
  return (
    <ul className="flex items-center gap-x-[clamp(0.6rem,0.8vw,1.5rem)]">
      {main.map((item) => {
        const active = pathname ? isActive(pathname, item.href) : false;
        return (
          <Fragment key={item.href}>
            <li className={DESKTOP_MORE_BELOW_WIDE.includes(item.href) ? "hidden min-[1900px]:list-item" : undefined}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                {item.label}
              </Link>
            </li>
            {showTest && item.href === TEST_NAV_AFTER && (
              <li>
                <TestTab active={pathname ? isActive(pathname, TEST_NAV_ITEM.href) : false} />
              </li>
            )}
          </Fragment>
        );
      })}
      <li>
        <MoreMenu items={more} pathname={pathname} />
      </li>
    </ul>
  );
}

/** Le Révélateur's own tab: gold, a small star above, so it stands out from the other pages. */
function TestTab({ active }: { active: boolean }) {
  return (
    <Link
      href={TEST_NAV_ITEM.href}
      aria-label={TEST_NAV_ITEM.label}
      aria-current={active ? "page" : undefined}
      className={cn(linkClass(active), "flex-col items-start justify-center leading-none text-gold hover:text-white")}
    >
      <span className="flex items-center gap-1 font-heading text-[9.5px] font-semibold tracking-[0.18em] uppercase">
        <span aria-hidden className="text-[11px] tracking-normal">★</span>
        {TEST_NAV_ITEM.kicker}
      </span>
      {/* The title on two short lines, so the tab stays narrow in a full bar. */}
      <span className="mt-1 grid text-[12.5px] leading-[1.15] 2xl:text-[13px]">
        <span>Test de personnalité </span>
        <span>Le Révélateur</span>
      </span>
    </Link>
  );
}

function MoreMenu({ items, pathname }: { items: { href: string; label: string; wideHidden?: boolean }[]; pathname?: string }) {
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
          className="absolute top-full right-0 z-50 mt-1 grid min-w-52 gap-0.5 rounded-[10px] border border-[var(--jg-light-gray)] bg-white p-2 shadow-[0_12px_32px_rgba(23,37,54,0.12)] [&_a:focus-visible]:outline-[var(--jg-navy)]!"
        >
          {items.map((item) => {
            const current = !!pathname && isActive(pathname, item.href);
            return (
              <li key={item.href} className={item.wideHidden ? "min-[1900px]:hidden" : undefined}>
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
