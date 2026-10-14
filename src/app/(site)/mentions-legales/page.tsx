import type { Metadata } from "next";
import { LegalPage, LegalSection, ToComplete } from "@/components/site/legal";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site de Jérémy Galéa — Méthode JG®.",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales">
      <LegalSection title="Éditeur du site">
        <ul>
          <li>Jérémy Galéa — Coach &amp; formateur, créateur de la Méthode JG®</li>
          <li>
            Forme juridique et immatriculation : <ToComplete>statut, SIRET (France) ou IDE (Suisse)</ToComplete>
          </li>
          <li>
            Adresse : <ToComplete />
          </li>
          <li>
            E-mail : <ToComplete />
          </li>
          <li>
            Téléphone : <ToComplete />
          </li>
          <li>Directeur de la publication : Jérémy Galéa</li>
        </ul>
      </LegalSection>
      <LegalSection title="Hébergement">
        <p>
          Le site est hébergé par <ToComplete>nom, adresse et téléphone de l’hébergeur</ToComplete>.
        </p>
      </LegalSection>
      <LegalSection title="Conception et réalisation">
        <p>
          Site réalisé par SwissWAI <ToComplete>coordonnées</ToComplete>.
        </p>
      </LegalSection>
      <LegalSection title="Propriété intellectuelle">
        <p>
          L’ensemble des contenus de ce site (textes, photographies, schémas, logo, marque Méthode JG®) est la propriété
          de Jérémy Galéa, sauf mention contraire. Toute reproduction, même partielle, est interdite sans autorisation
          écrite préalable. <ToComplete>numéro de dépôt de la marque, crédits photo</ToComplete>
        </p>
      </LegalSection>
      <LegalSection title="Données personnelles">
        <p>
          Le traitement des informations envoyées par les formulaires du site est décrit dans la politique de
          confidentialité.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
