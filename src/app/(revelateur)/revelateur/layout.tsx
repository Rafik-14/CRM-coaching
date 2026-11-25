import { Fragment_Mono } from "next/font/google";
import { CinemaWorld } from "@/components/revelateur/cinema/world";
import { SiteTheme } from "@/components/site/site-theme";

// Mono labels of the experience (counters, series, scale numerals). Self-hosted by next/font.
const mono = Fragment_Mono({ variable: "--font-film", subsets: ["latin"], weight: "400", display: "swap" });

/**
 * The Révélateur (landing + passation): an immersive navy space with a slow living background, kept
 * across the two pages so nothing flashes between them. No site menu.
 */
export default function RevelateurLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${mono.variable} rvc relative min-h-dvh w-full overflow-x-hidden bg-[#0E1825] text-[#F8F6F2]`}>
      <SiteTheme />
      <CinemaWorld />
      <div className="rvc-grain" aria-hidden />
      <main id="contenu" className="relative z-10">
        {children}
      </main>
    </div>
  );
}
