import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditNoteButton,
  DeleteDraftButton,
  DraftEditor,
  IssueButton,
  PaymentDialog,
  RemovePaymentButton,
} from "@/components/invoices/invoice-actions";
import { requireCoach } from "@/server/dal";
import { getInvoice, getInvoicingSettings } from "@/server/billing";
import { INVOICE_STATUS, PAYMENT_METHODS, formatCents, vatFor } from "@/lib/invoices";
import { formatDate } from "@/lib/format";
import { todayKey } from "@/server/booking";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Facture" };

export default function InvoicePage({ params }: PageProps<"/factures/[id]">) {
  return (
    <>
      <Link href="/factures" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Factures
      </Link>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <InvoiceDetail params={params} />
      </Suspense>
    </>
  );
}

async function InvoiceDetail({ params }: { params: PageProps<"/factures/[id]">["params"] }) {
  await requireCoach();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [inv, s] = await Promise.all([getInvoice(id), getInvoicingSettings()]);
  if (!inv) notFound();

  const credit = inv.kind === "credit_note";
  const draft = inv.status === "draft";
  const paid = inv.payments.reduce((sum, p) => sum + p.amountCents, 0);
  const due = Math.max(0, inv.totalCents - paid);
  const today = todayKey();
  const title = `${credit ? "Avoir" : "Facture"} ${inv.number ?? "(brouillon)"}`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {INVOICE_STATUS[inv.status as keyof typeof INVOICE_STATUS] ?? inv.status}
            {inv.status === "issued" && paid > 0 ? " · paiement partiel" : ""}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {inv.billTo.company || inv.billTo.name}
            {inv.contact && (
              <>
                {" · "}
                <Link href={`/contacts/${inv.contact.id}`} className="underline">
                  fiche du contact
                </Link>
              </>
            )}
            {inv.clientPackage && ` · ${inv.clientPackage.package.name}`}
            {inv.original && (
              <>
                {" · avoir sur "}
                <Link href={`/factures/${inv.original.id}`} className="underline">
                  la facture {inv.original.number}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {draft ? (
            <>
              <DeleteDraftButton id={inv.id} />
              <IssueButton id={inv.id} credit={credit} />
            </>
          ) : (
            <>
              <Button variant="outline" asChild>
                <a href={`/api/factures/${inv.id}/pdf?telecharger`}>
                  <Download /> PDF
                </a>
              </Button>
              {!credit && inv.status !== "cancelled" && due > 0 && <PaymentDialog invoiceId={inv.id} dueCents={due} currency={inv.currency} today={today} />}
              {!credit && inv.status !== "cancelled" && <CreditNoteButton id={inv.id} />}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="grid content-start gap-6">
          {draft ? (
            <Card>
              <CardHeader>
                <CardTitle>Brouillon</CardTitle>
                <CardDescription>Modifiable jusqu’à son émission. Le numéro est donné à l’émission.</CardDescription>
              </CardHeader>
              <CardContent>
                <DraftEditor
                  id={inv.id}
                  vatRateBps={vatFor(s).vatRateBps}
                  defaults={{
                    currency: inv.currency,
                    billName: inv.billTo.name,
                    billCompany: inv.billTo.company ?? "",
                    billAddress: inv.billTo.address ?? "",
                    billEmail: inv.billTo.email ?? "",
                    billVatNumber: inv.billTo.vatNumber ?? "",
                    billReference: inv.billTo.reference ?? "",
                    notes: inv.notes ?? "",
                    lines: inv.lines,
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{credit ? "Montant de l’avoir" : "Règlement"}</CardTitle>
                {!credit && inv.dueAt && <CardDescription>Échéance : {formatDate(inv.dueAt)}</CardDescription>}
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <Row label="Total" value={formatCents(inv.totalCents, inv.currency)} strong />
                {!credit && (
                  <>
                    <Row label="Payé" value={formatCents(paid, inv.currency)} />
                    <Row label="Reste à payer" value={formatCents(inv.status === "cancelled" ? 0 : due, inv.currency)} strong={due > 0} />
                  </>
                )}
                {inv.payments.length > 0 && (
                  <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                    {inv.payments.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                        <span className="w-24 tabular-nums text-muted-foreground">{formatDate(p.paidAt)}</span>
                        <span className="flex-1">
                          {PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS] ?? p.method}
                          {p.reference && <span className="text-muted-foreground"> · {p.reference}</span>}
                        </span>
                        <span className="font-medium tabular-nums">{formatCents(p.amountCents, inv.currency)}</span>
                        {!p.stripePaymentId && <RemovePaymentButton id={p.id} />}
                      </li>
                    ))}
                  </ul>
                )}
                {inv.credits.length > 0 && (
                  <p className="text-muted-foreground">
                    Avoir :{" "}
                    {inv.credits.map((c) => (
                      <Link key={c.id} href={`/factures/${c.id}`} className="underline">
                        {c.number ?? "brouillon"}
                      </Link>
                    ))}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Détail</CardTitle>
            <CardDescription>{draft ? "Aperçu du brouillon (enregistrez pour mettre à jour le PDF)." : "Tel qu’imprimé sur la facture."}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <ul className="divide-y divide-border rounded-xl border border-border">
              {inv.lines.map((l, k) => (
                <li key={k} className="flex items-start gap-3 px-3 py-2">
                  <span className="flex-1">{l.description}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {String(l.quantity).replace(".", ",")} × {formatCents(l.unitCents, inv.currency)}
                  </span>
                  <span className="w-28 text-right font-medium tabular-nums">{formatCents(Math.round(l.quantity * l.unitCents), inv.currency)}</span>
                </li>
              ))}
            </ul>
            {!inv.vatExempt && (
              <>
                <Row label="Total HT" value={formatCents(inv.subtotalCents, inv.currency)} />
                <Row label={`TVA ${inv.vatRateBps / 100} %`} value={formatCents(inv.vatCents, inv.currency)} />
              </>
            )}
            <Row label={inv.vatExempt ? "Total (TVA non applicable, art. 293 B du CGI)" : "Total TTC"} value={formatCents(inv.totalCents, inv.currency)} strong />
            <Button variant="outline" asChild className="justify-self-start">
              <a href={`/api/factures/${inv.id}/pdf`} target="_blank" rel="noreferrer">
                <ExternalLink /> Ouvrir le PDF
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", strong && "text-base font-semibold")}>{value}</span>
    </div>
  );
}
