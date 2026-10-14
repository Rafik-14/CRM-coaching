import type { Metadata } from "next";
import { LegalPage, LegalSection, ToComplete } from "@/components/site/legal";

export const metadata: Metadata = {
  title: "Gestion des cookies",
  description: "Les cookies utilisés par le site de Jérémy Galéa.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage title="Gestion des cookies">
      <LegalSection title="Ce que le site utilise">
        <p>
          Le site n’utilise aucun cookie publicitaire ni de mesure d’audience. Aucun cookie n’est déposé lorsque vous
          consultez les pages, envoyez un message ou réservez un échange stratégique : aucun bandeau de consentement
          n’est donc nécessaire.
        </p>
        <p>
          Seul l’espace privé de Jérémy Galéa (« Espace coach ») utilise un cookie de session, strictement nécessaire à
          la connexion.
        </p>
      </LegalSection>
      <LegalSection title="Liens externes">
        <p>
          Les liens vers Amazon (livre) et YouTube (bande-annonce) ouvrent ces sites, qui appliquent leurs propres
          règles en matière de cookies.
        </p>
      </LegalSection>
      <LegalSection title="Évolutions">
        <p>
          Si un outil de mesure d’audience est ajouté plus tard, cette page et un bandeau de choix seront mis à jour.{" "}
          <ToComplete>à valider</ToComplete>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
