"use client";

import { useEffect } from "react";
import { siteButton } from "@/components/site/button";
import { ArrowLink, Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";

/** Unexpected error on a website page: shown inside the site's header and footer, with a way to try again. */
export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = (error as { digest?: string } | null)?.digest;

  return (
    <Section>
      <Container className="max-w-[860px]">
        <Eyebrow>Erreur</Eyebrow>
        <GoldLine className="mt-4" />
        <h1 className="jg-h1 mt-6">Un problème est survenu.</h1>
        <p className="mt-6">Cette page n’a pas pu s’afficher. Réessayez dans un instant.</p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <button type="button" onClick={() => retry()} className={siteButton()}>
            Réessayer
          </button>
          <ArrowLink href="/">Retour à l’accueil</ArrowLink>
        </div>
        {digest && <p className="jg-small mt-10">Référence de l’erreur : {digest}</p>}
      </Container>
    </Section>
  );
}
