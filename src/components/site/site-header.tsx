import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { MobileMenu } from "./mobile-menu";
import { bookingHref } from "./nav";
import { NavList, SiteNavLinks } from "./site-nav-links";

/** Sticky, discreet header (brief §6): logo left, navigation, main CTA right. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--jg-light-gray)] bg-white">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-[7px] focus:bg-navy focus:px-4 focus:py-3 focus:text-white"
      >
        Aller au contenu
      </a>
      <div className="mx-auto flex h-[72px] w-[calc(100%-40px)] max-w-[1240px] items-center gap-6 md:w-[calc(100%-48px)] xl:h-[84px] xl:gap-4">
        {/* Monogram + name and tagline as real text, so they stay readable in the bar.
            Desktop too: name on one line, « Révéler votre potentiel » underneath. On wide screens the logo moves
            into the left margin (16 px kept from the edge). */}
        <Link
          href="/"
          aria-label="Jérémy Galéa — accueil"
          className="-ml-1 flex shrink-0 items-center gap-2.5 xl:-ml-[min(56px,calc((100vw-1272px)/2))]"
        >
          <Image src="/brand/jg-monogram.svg" alt="" width={48} height={51} unoptimized priority className="h-12 w-auto xl:h-[54px]" />
          <span className="grid leading-none">
            <span className="font-heading text-[15px] font-semibold tracking-[0.16em] text-navy uppercase xl:text-[14px] xl:tracking-[0.15em]">
              Jérémy Galéa
            </span>
            <span className="mt-1.5 font-heading text-[10.5px] font-medium tracking-[0.2em] text-[var(--jg-anthracite)]/80 uppercase xl:text-[10px]">
              Révéler votre potentiel
            </span>
          </span>
        </Link>
        <nav aria-label="Navigation principale" className="mx-auto hidden xl:block">
          <Suspense fallback={<NavList />}>
            <SiteNavLinks />
          </Suspense>
        </nav>
        <div className="ml-auto flex items-center gap-2 xl:ml-0">
          {/* Sized like the navigation: same 14 px type, slim navy button (hit area stays 44 px). */}
          <Link
            href={bookingHref("en-tete")}
            className="relative hidden h-10 shrink-0 items-center rounded-[7px] bg-navy px-[18px] whitespace-nowrap font-heading text-[14px] font-medium text-white transition-colors duration-200 after:absolute after:inset-x-0 after:-inset-y-0.5 hover:bg-[var(--jg-navy-hover)] sm:inline-flex"
          >
            Réserver un échange
          </Link>
          <Suspense fallback={null}>
            <MobileMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
