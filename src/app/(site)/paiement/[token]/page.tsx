import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { PayButton } from "@/components/site/pay-button";
import { ButtonLink, Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import { db } from "@/server/db";
import { invoices } from "@/server/db/schema";
import { findToken } from "@/server/access-tokens";
import { paidCents } from "@/server/invoicing";
import { getInvoicingSettings, stripeEnabled } from "@/server/billing";
import { formatCents } from "@/lib/invoices";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Paiement de votre facture", robots: { index: false, follow: false } };

/** Private payment page of one invoice (link in the invoice e-mail and on the PDF). */
export default function PaymentPage({ params, searchParams }: PageProps<"/paiement/[token]">) {
  return (
    <Section className="pt-10 md:pt-16 lg:pt-20">
      <Container className="max-w-[760px]">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-[12px] bg-ivory" />}>
          <Payment params={params} searchParams={searchParams} />
        </Suspense>
      </Container>
    </Section>
  );
}

async function Payment({ params, searchParams }: { params: PageProps<"/paiement/[token]">["params"]; searchParams: PageProps<"/paiement/[token]">["searchParams"] }) {
  await connection();
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const row = await findToken(db, "payment", token);
  const inv = row?.invoiceId ? await db.query.invoices.findFirst({ where: eq(invoices.id, row.invoiceId) }) : null;
  if (!inv?.number || inv.status === "draft") {
    return (
      <div>
        <h1 className="jg-h2">Lien invalide</h1>
        <p className="mt-4">Ce lien de paiement n’est plus valable. Écrivez-moi si besoin.</p>
        <div className="mt-8">
          <ButtonLink href="/contact?source=paiement">Me contacter</ButtonLink>
        </div>
      </div>
    );
  }
  const [s, paid] = await Promise.all([getInvoicingSettings(), paidCents(db, inv.id)]);
  const due = Math.max(0, inv.totalCents - paid);
  const done = inv.status === "paid" || due === 0;

  return (
    <div>
      <Eyebrow>Facture n° {inv.number}</Eyebrow>
      <GoldLine className="mt-4" />
      <h1 className="jg-h1 mt-6">
        {sp.merci === "1" && !done ? "Merci, votre paiement est en cours." : done ? "Cette facture est réglée. Merci !" : "Régler votre facture"}
      </h1>
      <dl className="mt-8 grid gap-4 rounded-[12px] border border-[var(--jg-light-gray)] bg-ivory p-7 sm:grid-cols-3">
        <div>
          <dt className="jg-small">Montant</dt>
          <dd className="mt-1 font-heading text-[1.125rem] font-semibold text-navy">{formatCents(inv.totalCents, inv.currency)}</dd>
        </div>
        <div>
          <dt className="jg-small">Reste à payer</dt>
          <dd className="mt-1 font-heading text-[1.125rem] font-semibold text-navy">{formatCents(inv.status === "cancelled" ? 0 : due, inv.currency)}</dd>
        </div>
        <div>
          <dt className="jg-small">Échéance</dt>
          <dd className="mt-1 font-heading text-[1.125rem] font-semibold text-navy">{inv.dueAt ? formatDate(inv.dueAt) : "—"}</dd>
        </div>
      </dl>

      {!done && inv.status === "issued" && (
        <div className="mt-10 grid gap-8">
          {sp.merci === "1" ? (
            <p>La confirmation arrive dans quelques instants ; vous recevrez un e-mail dès que le paiement sera validé.</p>
          ) : (
            stripeEnabled() && <PayButton token={token} label={`Payer ${formatCents(due, inv.currency)} en ligne`} />
          )}
          <div>
            <p className="font-heading text-[15px] font-semibold text-navy">Ou par virement</p>
            <p className="mt-2">
              IBAN {s.iban}
              {s.bic ? ` · BIC ${s.bic}` : ""}
              <br />
              Référence à indiquer : {inv.number}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
