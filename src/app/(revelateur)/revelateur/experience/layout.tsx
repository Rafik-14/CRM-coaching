import { SiteTheme } from "@/components/site/site-theme";

/**
 * The passation screens: no site menu (an immersive, uninterrupted experience). Each screen carries
 * the JG® mark and the ownership notice itself (dossier maître v2.0 §5): beside the questions in the
 * atelier view, at the foot of the page on the other screens.
 */
export default function RevelateurLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="jg-site flex min-h-dvh flex-col bg-[var(--jg-navy)] text-[var(--jg-anthracite)]">
      {/* Navy underneath: the story page closes on navy, so no light frame can show between the two. */}
      {/* Always light, like the public site — even when arriving from the CRM in dark mode. */}
      <SiteTheme />
      <main id="contenu" className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
