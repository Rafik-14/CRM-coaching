import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
        <Link href="/" aria-label="Jérémy Galéa — accueil" className="shrink-0">
          <Image
            src="/brand/jg-logo.svg"
            alt="Jérémy Galéa — Révéler votre potentiel"
            width={78}
            height={56}
            unoptimized
            priority
            className="h-12 w-auto xl:h-14"
          />
        </Link>
        <nav aria-label="Navigation principale" className="mx-auto hidden xl:block">
          <Suspense fallback={<NavList />}>
            <SiteNavLinks />
          </Suspense>
        </nav>
        <div className="ml-auto flex items-center gap-2 xl:ml-0">
          {/* Light outline so it doesn't outweigh the navigation; fills navy on hover. */}
          <Link
            href={bookingHref("en-tete")}
            className="group hidden h-11 items-center gap-2.5 rounded-[7px] border border-navy px-4 font-heading text-[13.5px] font-semibold tracking-[0.01em] text-navy transition-colors duration-200 hover:bg-navy hover:text-white sm:inline-flex"
          >
            Réserver un échange
            <ArrowRight
              aria-hidden
              className="size-4 text-gold transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
            />
          </Link>
          <Suspense fallback={null}>
            <MobileMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
