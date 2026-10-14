import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SiteTheme } from "@/components/site/site-theme";
import { ArrowLink, BookingButton, Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";

/** Unknown address: shown in the website's layout (most visitors who land here come from the site). */
export default function NotFound() {
  return (
    <div className="jg-site flex min-h-screen flex-col bg-white">
      <SiteTheme />
      <SiteHeader />
      <main id="contenu" className="flex-1">
        <Section>
          <Container className="max-w-[860px]">
            <Eyebrow>Erreur 404</Eyebrow>
            <GoldLine className="mt-4" />
            <h1 className="jg-h1 mt-6">Cette page n’existe pas.</h1>
            <p className="mt-6">Elle a peut-être été déplacée. Voici où reprendre :</p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              <BookingButton source="page-introuvable" />
              <ArrowLink href="/">Retour à l’accueil</ArrowLink>
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
