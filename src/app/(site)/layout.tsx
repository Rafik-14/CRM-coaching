import { Suspense } from "react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SiteTheme } from "@/components/site/site-theme";
import { ContactFab } from "@/components/site/contact-fab";
import { ScrollReveal } from "@/components/site/scroll-reveal";

/** Public website: own header and footer, always in the light JG® palette. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="jg-site flex min-h-screen flex-col bg-white">
      <SiteTheme />
      <SiteHeader />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <ContactFab />
      {/* Suspense: ScrollReveal reads the current page address, only known at request time. */}
      <Suspense fallback={null}>
        <ScrollReveal />
      </Suspense>
    </div>
  );
}
