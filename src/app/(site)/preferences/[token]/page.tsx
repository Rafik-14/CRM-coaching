import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { EmailPreference } from "@/components/site/email-preference";
import { ButtonLink, Container, GoldLine, Section } from "@/components/site/ui";
import { db } from "@/server/db";
import { contacts } from "@/server/db/schema";
import { findToken } from "@/server/access-tokens";

export const metadata: Metadata = {
  title: "Mes e-mails",
  robots: { index: false, follow: false },
};

/** Linked from the bottom of non-essential e-mails (follow-up, thank-you…). */
export default function PreferencesPage({ params }: PageProps<"/preferences/[token]">) {
  return (
    <Section className="pt-10 md:pt-16 lg:pt-20">
      <Container className="max-w-[860px]">
        <Suspense fallback={<div className="h-60 animate-pulse rounded-[12px] bg-ivory" />}>
          <Preferences params={params} />
        </Suspense>
      </Container>
    </Section>
  );
}

async function Preferences({ params }: { params: PageProps<"/preferences/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  const row = await findToken(db, "unsubscribe", token);
  const contact = row?.contactId
    ? await db.query.contacts.findFirst({ where: eq(contacts.id, row.contactId), columns: { firstName: true, emailOptOut: true } })
    : null;

  if (!contact) {
    return (
      <div>
        <h1 className="jg-h2">Lien invalide</h1>
        <p className="mt-4">Ce lien ne permet plus de gérer vos e-mails. Écrivez-moi si besoin.</p>
        <div className="mt-8">
          <ButtonLink href="/contact?source=preferences">Me contacter</ButtonLink>
        </div>
      </div>
    );
  }
  return (
    <div>
      <h1 className="jg-h1">Vos e-mails, {contact.firstName}</h1>
      <GoldLine className="mt-6" />
      <EmailPreference token={token} optedOut={contact.emailOptOut} />
    </div>
  );
}
