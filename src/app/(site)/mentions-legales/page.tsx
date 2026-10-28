import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL_PAGES_PUBLISHED } from "@/components/site/nav";
import { LegalPage, LegalSection, ToComplete } from "@/components/site/legal";

export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Mentions légales du site de Jérémy Galéa — Méthode JG® : éditeur, hébergement, propriété intellectuelle, données personnelles et cookies.",
  alternates: { canonical: "/mentions-legales" },
};

/**
 * Jérémy's text (« MODIFICATIONS suite », Oct. 2026). It replaces the former « Politique de confidentialité » and
 * « Gestion des cookies » pages, which now point here. Bracketed pieces are still to be supplied by Jérémy.
 */
export default function MentionsLegalesPage() {
  if (!LEGAL_PAGES_PUBLISHED) notFound();
  return (
    <LegalPage title="Mentions légales">
      <p className="jg-small">Dernière mise à jour : 25 octobre 2026</p>

      <LegalSection title="1. Éditeur du site" id="editeur">
        <p>
          Le site internet accessible à l’adresse <ToComplete>URL définitive du site</ToComplete> est édité par Jérémy
          Galéa, entrepreneur individuel exerçant sous le nom commercial JG® <ToComplete>à confirmer</ToComplete>.
        </p>
        <p>
          Adresse professionnelle : <ToComplete>adresse de domiciliation professionnelle</ToComplete>
        </p>
        <p>
          E-mail de contact : <ToComplete>adresse e-mail professionnelle</ToComplete>
        </p>
        <p>
          SIRET : <ToComplete>numéro à renseigner après vérification</ToComplete>
        </p>
        <p>Directeur de la publication : Jérémy Galéa.</p>
      </LegalSection>

      <LegalSection title="2. Hébergement" id="hebergement">
        <p>
          Le site est hébergé par <ToComplete>nom de l’hébergeur</ToComplete>, dont les coordonnées sont les suivantes :
        </p>
        <p>
          Adresse : <ToComplete>adresse de l’hébergeur</ToComplete>
        </p>
        <p>
          Site internet : <ToComplete>URL de l’hébergeur</ToComplete>
        </p>
        <p>
          Les informations relatives à l’hébergement doivent être complétées avec les coordonnées du prestataire
          effectivement utilisé.
        </p>
      </LegalSection>

      <LegalSection title="3. Propriété intellectuelle" id="propriete-intellectuelle">
        <p>
          L’ensemble des éléments présents sur ce site, notamment les textes, visuels, photographies, logos, graphismes,
          contenus pédagogiques, supports et éléments distinctifs de la marque JG®, est protégé par les règles applicables
          en matière de propriété intellectuelle.
        </p>
        <p>
          Sauf mention contraire, ces éléments appartiennent à Jérémy Galéa ou sont utilisés avec l’autorisation de leurs
          titulaires.
        </p>
        <p>
          Toute reproduction, représentation, adaptation ou utilisation de tout ou partie de ces éléments sans autorisation
          préalable est interdite, sous réserve des exceptions prévues par la loi.
        </p>
        <p>
          Le roman Le Chant du Merle demeure soumis aux droits de propriété intellectuelle de son auteur et aux éventuels
          droits de tiers.
        </p>
      </LegalSection>

      <LegalSection title="4. Données personnelles" id="donnees-personnelles">
        <p>
          Jérémy Galéa est responsable des traitements de données personnelles réalisés dans le cadre du fonctionnement du
          site.
        </p>
        <p>
          Les données transmises par les formulaires de contact et de réservation sont utilisées pour répondre aux
          demandes, organiser les rendez-vous et assurer le suivi des échanges professionnels.
        </p>
        <p>
          Les données collectées sont limitées à celles nécessaires à ces finalités. Elles ne sont pas vendues à des
          tiers.
        </p>
        <p>
          Elles peuvent être accessibles aux prestataires techniques intervenant dans le fonctionnement du site, des
          formulaires et des outils de réservation, dans la limite de leurs missions.
        </p>
        <p>
          Les données sont conservées pendant une durée adaptée à leur finalité et aux obligations légales applicables.
          Les durées précises, les destinataires et les modalités de conservation sont définis en fonction des outils
          réellement utilisés.
        </p>
        <p>
          Conformément à la réglementation applicable, vous pouvez demander l’accès à vos données, leur rectification,
          leur effacement ou la limitation de certains traitements. Vous pouvez également vous opposer à certains
          traitements et, lorsque les conditions sont réunies, demander la portabilité de vos données ou retirer votre
          consentement.
        </p>
        <p>
          Pour exercer vos droits ou poser une question relative à vos données personnelles, vous pouvez écrire à :{" "}
          <ToComplete>adresse e-mail dédiée</ToComplete>.
        </p>
        <p>
          Vous pouvez également adresser une réclamation à la Commission nationale de l’informatique et des libertés
          (CNIL) :{" "}
          <a
            href="https://www.cnil.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-navy underline underline-offset-2"
          >
            https://www.cnil.fr/
          </a>
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies et traceurs" id="cookies">
        <p>
          Le site peut utiliser des cookies ou autres traceurs nécessaires à son fonctionnement, ainsi que, le cas échéant,
          des outils de mesure d’audience ou des services tiers.
        </p>
        <p>
          Les traceurs soumis au consentement ne sont activés qu’après recueil de celui-ci. Vous pouvez gérer ou retirer
          votre consentement selon les modalités proposées sur le site.
        </p>
        <p>
          Les informations détaillées sur les traceurs effectivement utilisés, leurs finalités et les moyens de gérer vos
          préférences sont accessibles via le dispositif de gestion des cookies du site.
        </p>
      </LegalSection>

      <LegalSection title="6. Sécurité des données" id="securite">
        <p>
          Jérémy Galéa met en œuvre des mesures techniques et organisationnelles adaptées afin de protéger les données
          personnelles contre la perte, l’altération, la divulgation ou l’accès non autorisé.
        </p>
        <p>
          Les prestataires techniques sont sélectionnés et utilisés en tenant compte des exigences applicables en matière
          de protection des données.
        </p>
      </LegalSection>

      <LegalSection title="7. Mise à jour" id="mise-a-jour">
        <p>
          Les présentes mentions légales peuvent être modifiées afin de tenir compte de l’évolution du site, de l’activité
          ou de la réglementation applicable.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
