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
      <div className="mx-auto flex h-[72px] w-[calc(100%-40px)] max-w-[1240px] items-center gap-6 md:w-[calc(100%-48px)] xl:h-[84px]">
        {/* Bigger logo in the same bar height; on wide screens it moves into the left margin (16 px kept from the edge). */}
        <Link
          href="/"
          aria-label="Jérémy Galéa — accueil"
          className="-ml-1 shrink-0 xl:-ml-[min(56px,calc((100vw-1272px)/2))]"
        >
          <Image
            src="/brand/jg-logo.svg"
            alt="Jérémy Galéa — Révéler votre potentiel"
            width={92}
            height={66}
            unoptimized
            priority
            className="h-[62px] w-auto xl:h-[74px]"
          />
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
            className="relative hidden h-10 items-center rounded-[7px] bg-navy px-[18px] font-heading text-[14px] font-medium text-white transition-colors duration-200 after:absolute after:inset-x-0 after:-inset-y-0.5 hover:bg-[var(--jg-navy-hover)] sm:inline-flex"
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
