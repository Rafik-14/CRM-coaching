import Link from "next/link";
import Image from "next/image";
import { SiteTheme } from "@/components/site/site-theme";
import { OWNERSHIP_NOTICE } from "@/server/revelateur/questionnaire";

/**
 * The passation screens: no site menu (an immersive, uninterrupted experience), the JG® mark,
 * and the ownership notice at the foot of every screen (dossier maître v2.0 §5).
 */
export default function RevelateurLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="jg-site flex min-h-dvh flex-col bg-[var(--jg-ivory)] text-[var(--jg-anthracite)]">
      {/* Always light, like the public site — even when arriving from the CRM in dark mode. */}
      <SiteTheme />
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-4 py-5">
        <Link href="/revelateur" className="inline-flex items-center gap-3 font-heading text-[12px] font-semibold tracking-[.2em] text-navy uppercase">
          <Image src="/brand/jg-monogram.svg" alt="" width={26} height={28} unoptimized />
          Le Révélateur
        </Link>
        <span className="font-heading text-[11px] font-semibold tracking-[.16em] text-[var(--jg-anthracite)] uppercase">Test Signature JG®</span>
      </header>
      <main id="contenu" className="flex flex-1 flex-col">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-[1100px] px-4 py-6 text-center text-[12px] leading-relaxed text-[var(--jg-anthracite)]">
        {OWNERSHIP_NOTICE}
      </footer>
    </div>
  );
}
