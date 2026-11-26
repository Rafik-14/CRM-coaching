"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { siteButton } from "./button";
import { BOOKING_LABEL, SITE_NAV, TEST_NAV_AFTER, TEST_NAV_ITEM, bookingHref, isActive } from "./nav";

/** Phone / tablet menu: white panel from the right (rendered in a portal, so it carries its own site styles). */
export function MobileMenu({ showTest = false }: { showTest?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <SheetPrimitive.Root open={open} onOpenChange={setOpen}>
      <SheetPrimitive.Trigger
        aria-label="Ouvrir le menu"
        className="inline-flex size-12 items-center justify-center rounded-[7px] text-white transition-colors hover:bg-white/10 xl:hidden"
      >
        <Menu className="size-6" strokeWidth={1.75} />
      </SheetPrimitive.Trigger>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-navy/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <SheetPrimitive.Content className="jg-site fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-lg data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:slide-in-from-right-10">
          <div className="flex h-[72px] items-center justify-between border-b border-[var(--jg-light-gray)] px-5">
            <SheetPrimitive.Title className="sr-only">Menu</SheetPrimitive.Title>
            <SheetPrimitive.Description className="sr-only">Navigation du site</SheetPrimitive.Description>
            <Image src="/brand/jg-monogram.svg" alt="" width={36} height={38} unoptimized />
            <SheetPrimitive.Close
              aria-label="Fermer le menu"
              className="inline-flex size-12 items-center justify-center rounded-[7px] text-navy hover:bg-ivory"
            >
              <X className="size-6" strokeWidth={1.75} />
            </SheetPrimitive.Close>
          </div>
          <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-5 py-3">
            <ul className="grid">
              {SITE_NAV.flatMap((item): { href: string; label: string }[] => (showTest && item.href === TEST_NAV_AFTER ? [item, TEST_NAV_ITEM] : [item])).map((item) => {
                const test = item.href === TEST_NAV_ITEM.href;
                const active = pathname ? isActive(pathname, item.href) : false;
                return (
                  <li key={item.href} className="border-b border-[var(--jg-light-gray)] last:border-0">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-14 items-center gap-3 font-heading text-[17px] font-medium text-navy",
                        active && "font-semibold",
                      )}
                    >
                      <span aria-hidden className={cn("h-5 w-0.5 bg-gold", active ? "opacity-100" : "opacity-0")} />
                      {test ? (
                        <span className="grid py-2 leading-tight text-gold">
                          <span className="flex items-center gap-1 text-[10.5px] font-semibold tracking-[0.18em] uppercase">
                            <span aria-hidden>★</span>
                            {TEST_NAV_ITEM.kicker}
                          </span>
                          <span className="mt-1 text-navy">{TEST_NAV_ITEM.title}</span>
                        </span>
                      ) : (
                        item.label
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="border-t border-[var(--jg-light-gray)] p-5">
            <Link
              href={bookingHref("menu-mobile")}
              onClick={() => setOpen(false)}
              className={siteButton({ variant: "primary", block: true })}
            >
              {BOOKING_LABEL}
              <ArrowRight aria-hidden />
            </Link>
            <p className="jg-small mt-3 text-center">20 minutes · Sans engagement</p>
          </div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}
