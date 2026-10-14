import Image from "next/image";
import Link from "next/link";
import { BookingButton, Container, DotList, GoldLine } from "./ui";
import { LEGAL_NAV, SITE_NAV } from "./nav";

const footerLink =
  "inline-flex min-h-11 items-center text-white/80 md:min-h-9 transition-colors duration-200 hover:text-white hover:underline hover:decoration-gold hover:underline-offset-4";

export function SiteFooter() {
  return (
    <footer className="jg-on-navy border-t border-white/10 bg-navy text-white">
      <Container className="grid gap-12 py-16 md:py-20 lg:grid-cols-[1.2fr_0.8fr_1.2fr] lg:gap-16">
        <div>
          <Image
            src="/brand/jg-logo-white.svg"
            alt="Jérémy Galéa — Révéler votre potentiel"
            width={112}
            height={80}
            unoptimized
            className="h-20 w-auto"
          />
          <p className="mt-8 font-heading text-[17px] font-semibold">Coach &amp; formateur · Créateur de la Méthode JG®</p>
          <DotList
            className="jg-small mt-3 text-white/80"
            items={["Identité professionnelle", "Positionnement", "Évolution", "Leadership", "Recrutement"]}
          />
          <GoldLine className="mt-6" />
          <p className="mt-4 font-heading text-[15px] font-medium tracking-[0.08em]">France • Suisse</p>
        </div>

        <nav aria-label="Plan du site">
          <p className="font-heading text-[13px] font-semibold tracking-[0.16em] text-white uppercase">Le site</p>
          <ul className="jg-small mt-3 grid">
            {SITE_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={footerLink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="font-heading text-[13px] font-semibold tracking-[0.16em] text-white uppercase">
            Parlons de votre situation
          </p>
          <p className="jg-small mt-4 text-white/80">20 minutes pour parler de votre situation. Sans engagement.</p>
          <BookingButton source="pied-de-page" variant="light" className="mt-6 w-full sm:w-auto lg:w-full" />
          <p className="mt-8 font-heading text-[13px] font-semibold tracking-[0.16em] text-white uppercase">
            Informations
          </p>
          <ul className="jg-small mt-3 grid">
            {LEGAL_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={footerLink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/15">
        <Container className="jg-small flex flex-col gap-2 py-6 text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© Jérémy Galéa · Méthode JG®</p>
          <Link href="/connexion" className="inline-flex min-h-11 items-center text-white/60 hover:text-white">
            Espace coach
          </Link>
        </Container>
      </div>
    </footer>
  );
}
