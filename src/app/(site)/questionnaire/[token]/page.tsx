import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { QuestionnaireForm } from "@/components/site/questionnaire-form";
import { ButtonLink, Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import { db } from "@/server/db";
import { contacts } from "@/server/db/schema";
import { getQuestionnaire } from "@/server/questionnaire";
import { findQuestionnaire } from "@/server/questionnaire-links";

export const metadata: Metadata = {
  title: "Questionnaire de départ",
  robots: { index: false, follow: false },
};

/** Private link sent in the welcome e-mail or from the client file (valid 30 days, one submission). */
export default function QuestionnairePage({ params }: PageProps<"/questionnaire/[token]">) {
  return (
    <Section className="pt-10 md:pt-16 lg:pt-20">
      <Container className="max-w-[860px]">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-[12px] bg-ivory" />}>
          <Questionnaire params={params} />
        </Suspense>
      </Container>
    </Section>
  );
}

async function Questionnaire({ params }: { params: PageProps<"/questionnaire/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  const found = await findQuestionnaire(db, token);

  if (!found) {
    return (
      <div>
        <h1 className="jg-h2">Ce lien n’est plus valide</h1>
        <p className="mt-4 max-w-[640px]">
          Le lien du questionnaire a expiré (il reste valable 30 jours) ou a été remplacé. Écrivez-moi et je vous en envoie un nouveau.
        </p>
        <div className="mt-8">
          <ButtonLink href="/contact?source=questionnaire">Me contacter</ButtonLink>
        </div>
      </div>
    );
  }
  if (found.submitted) {
    return (
      <div>
        <h1 className="jg-h2">Merci, vos réponses sont déjà envoyées.</h1>
        <p className="mt-4 max-w-[640px]">Je les ai bien reçues. Si vous souhaitez ajouter quelque chose, répondez simplement à mon e-mail.</p>
      </div>
    );
  }

  const [{ intro, questions }, contact] = await Promise.all([
    getQuestionnaire(),
    db.query.contacts.findFirst({ where: eq(contacts.id, found.response.contactId), columns: { firstName: true } }),
  ]);
  return (
    <div>
      <Eyebrow>Questionnaire de départ</Eyebrow>
      <GoldLine className="mt-4" />
      <h1 className="jg-h1 mt-6">Bonjour {contact?.firstName},</h1>
      {intro && <p className="mt-4 max-w-[680px] font-heading text-[1.125rem] leading-snug font-medium text-navy">{intro}</p>}
      <div className="mt-10 rounded-[12px] border border-[var(--jg-light-gray)] bg-ivory p-6 md:p-10">
        <QuestionnaireForm token={token} questions={questions} />
      </div>
    </div>
  );
}
