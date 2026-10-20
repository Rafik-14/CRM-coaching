import type { Metadata } from "next";
import { LegalPage, LegalSection, ToComplete } from "@/components/site/legal";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description: "Conditions générales de vente des accompagnements de Jérémy Galéa — Méthode JG®.",
  alternates: { canonical: "/cgv" },
};

export default function CgvPage() {
  return (
    <LegalPage title="Conditions générales de vente">
      <LegalSection title="1. Objet">
        <p>
          Les présentes conditions s’appliquent aux accompagnements proposés par Jérémy Galéa (Méthode JG®) :
          Architecture Identitaire JG®, Accompagnement Décisif JG® et Parcours Signature JG®.{" "}
          <ToComplete>interventions en entreprise, écoles et cabinets RH le cas échéant</ToComplete>
        </p>
      </LegalSection>
      <LegalSection title="2. Échange stratégique">
        <p>
          Le premier échange stratégique (20 minutes) est gratuit et sans engagement. Il permet de déterminer si un
          accompagnement est pertinent et lequel.
        </p>
      </LegalSection>
      <LegalSection title="3. Prix">
        <p>
          Les prix sont indiqués sur la page Accompagnements, en euros (France) et en francs suisses (Suisse).{" "}
          <ToComplete>TVA applicable ou non, mention légale correspondante</ToComplete>
        </p>
      </LegalSection>
      <LegalSection title="4. Commande et paiement">
        <p>
          <ToComplete>moyens de paiement, échéancier pour les accompagnements en plusieurs séances, acompte éventuel</ToComplete>
        </p>
      </LegalSection>
      <LegalSection title="5. Report et annulation des séances">
        <p>
          <ToComplete>délai de prévenance, séance due en cas d’absence non prévenue, durée de validité des séances</ToComplete>
        </p>
      </LegalSection>
      <LegalSection title="6. Droit de rétractation">
        <p>
          <ToComplete>conditions pour les clients particuliers (France : 14 jours), renonciation si la prestation commence avant la fin du délai</ToComplete>
        </p>
      </LegalSection>
      <LegalSection title="7. Nature de l’accompagnement">
        <p>
          L’accompagnement repose sur un engagement de moyens. <ToComplete>formulation à valider</ToComplete>
        </p>
      </LegalSection>
      <LegalSection title="8. Confidentialité et données personnelles">
        <p>
          Les échanges menés pendant l’accompagnement sont confidentiels. Le traitement des données est décrit dans la
          politique de confidentialité.
        </p>
      </LegalSection>
      <LegalSection title="9. Droit applicable et litiges">
        <p>
          <ToComplete>droit applicable (France / Suisse), médiateur de la consommation, juridiction compétente</ToComplete>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
