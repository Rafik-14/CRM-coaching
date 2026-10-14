import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SiteTheme } from "@/components/site/site-theme";

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
    </div>
  );
}
