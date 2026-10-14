import type { Metadata } from "next";
import { LegalPage, LegalSection, ToComplete } from "@/components/site/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment Jérémy Galéa utilise et protège les informations envoyées par le site.",
  alternates: { canonical: "/confidentialite" },
};

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <LegalSection title="Responsable du traitement">
        <p>
          Jérémy Galéa — <ToComplete>adresse et e-mail de contact pour les données personnelles</ToComplete>
        </p>
      </LegalSection>
      <LegalSection title="Informations collectées">
        <p>Uniquement ce que vous saisissez dans les formulaires du site :</p>
        <ul>
          <li>formulaire de contact : nom, prénom, e-mail, téléphone (facultatif), type de profil, message ;</li>
          <li>
            réservation d’un échange stratégique : les mêmes informations, le créneau choisi, votre enjeu et quelques
            mots sur votre situation (facultatifs).
          </li>
        </ul>
      </LegalSection>
      <LegalSection title="Utilisation">
        <p>
          Ces informations servent uniquement à vous répondre, à organiser l’échange stratégique et, le cas échéant,
          l’accompagnement. Elles sont enregistrées dans l’outil de gestion de Jérémy Galéa et ne sont ni vendues ni
          transmises à des tiers à des fins commerciales.
        </p>
        <p>Base légale : votre consentement et les mesures précontractuelles prises à votre demande.</p>
      </LegalSection>
      <LegalSection title="Hébergement et sécurité">
        <p>
          Les données sont hébergées en Europe <ToComplete>hébergeur et pays</ToComplete>. L’accès est protégé et
          réservé à Jérémy Galéa.
        </p>
      </LegalSection>
      <LegalSection title="Durée de conservation">
        <p>
          <ToComplete>par exemple : 3 ans après le dernier contact pour un prospect ; durée légale pour les clients</ToComplete>
        </p>
      </LegalSection>
      <LegalSection title="Vos droits">
        <p>
          Vous pouvez à tout moment demander l’accès à vos données, leur rectification, leur effacement, leur portabilité
          ou vous opposer à leur traitement, en écrivant à <ToComplete>e-mail</ToComplete>. Vous pouvez aussi adresser une
          réclamation à la CNIL (France) ou au Préposé fédéral à la protection des données et à la transparence (Suisse).
        </p>
      </LegalSection>
      <LegalSection title="Cookies">
        <p>Voir la page Gestion des cookies.</p>
      </LegalSection>
    </LegalPage>
  );
}
