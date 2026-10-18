import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Download, Receipt, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { NewInvoiceDialog } from "@/components/invoices/invoice-actions";
import { requireCoach } from "@/server/dal";
import { forecastNextMonth, getInvoicingSettings, listInvoices } from "@/server/billing";
import { invoiceContactOptions } from "@/server/actions/invoices";
import { INVOICE_STATUS, formatCents, vatFor } from "@/lib/invoices";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Factures" };

const FILTERS = [
  { key: "", label: "Toutes" },
  { key: "draft", label: "Brouillons" },
  { key: "issued", label: "À encaisser" },
  { key: "overdue", label: "En retard" },
  { key: "paid", label: "Payées" },
  { key: "cancelled", label: "Annulées" },
] as const;

export default function InvoicesPage({ searchParams }: PageProps<"/factures">) {
  return (
    <>
      <PageHeader title="Factures" description="Vos factures, vos avoirs et ce qui reste à encaisser">
        <Suspense fallback={<Skeleton className="h-9 w-40" />}>
          <HeaderActions />
        </Suspense>
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <InvoiceList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function HeaderActions() {
  await requireCoach();
  const [contacts, s] = await Promise.all([invoiceContactOptions(), getInvoicingSettings()]);
  return (
    <>
      <Button variant="outline" asChild>
        <a href="/api/factures/export">
          <Download /> Export comptable
        </a>
      </Button>
      <NewInvoiceDialog contacts={contacts} vatRateBps={vatFor(s).vatRateBps} />
    </>
  );
}

const statusStyle: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  issued: "bg-info/10 text-info",
  paid: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground line-through",
  overdue: "bg-destructive/10 text-destructive",
};

async function InvoiceList({ searchParams }: { searchParams: PageProps<"/factures">["searchParams"] }) {
  await requireCoach();
  const sp = await searchParams;
  const status = FILTERS.find((f) => f.key === sp.statut)?.key ?? "";
  const [all, s] = await Promise.all([listInvoices(), getInvoicingSettings()]);
  const isOverdue = (i: (typeof all)[number]) => i.overdue;
  const forecast = forecastNextMonth(all);
  const rows = all.filter((i) => (status === "overdue" ? isOverdue(i) : status ? i.status === status : true));

  // To collect, per currency (never mixed): issued invoices minus what has been paid.
  const toCollect: Record<string, { due: number; late: number }> = {};
  for (const i of all) {
    if (i.kind !== "invoice" || i.status !== "issued") continue;
    const left = Math.max(0, i.totalCents - i.paidCents);
    toCollect[i.currency] ??= { due: 0, late: 0 };
    toCollect[i.currency].due += left;
    if (isOverdue(i)) toCollect[i.currency].late += left;
  }

  return (
    <div className="grid gap-5">
      {s.isSample && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <TriangleAlert className="size-4 text-warning" />
          <span className="font-medium">Vos coordonnées de facturation sont des données d’exemple.</span>
          <Link href="/parametres?onglet=facturation" className="underline">
            Les remplacer dans Paramètres › Facturation
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {Object.keys(toCollect).length === 0 ? (
          <Card className="sm:col-span-3">
            <CardContent className="text-sm text-muted-foreground">Rien à encaisser pour le moment.</CardContent>
          </Card>
        ) : (
          Object.entries(toCollect).map(([cur, v]) => (
            <Card key={cur}>
              <CardContent>
                <p className="text-xs text-muted-foreground uppercase">À encaisser · {cur}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{formatCents(v.due, cur)}</p>
                {v.late > 0 && <p className="mt-1 text-xs font-medium text-destructive">dont {formatCents(v.late, cur)} en retard</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Prévu en {forecast.month} :{" "}
        <span className="font-medium text-foreground">
          {Object.keys(forecast.byCurrency).length
            ? Object.entries(forecast.byCurrency)
                .map(([cur, cents]) => formatCents(cents, cur))
                .join(" · ")
            : "aucune facture à échéance"}
        </span>
        {Object.keys(forecast.byCurrency).length > 0 && " (factures arrivant à échéance)"}
      </p>

      <nav className="flex flex-wrap gap-1.5" aria-label="Filtrer">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/factures?statut=${f.key}` : "/factures"}
            className={cn("rounded-lg border px-3 py-1.5 text-sm", status === f.key ? "border-primary bg-primary/10 font-medium" : "border-border text-muted-foreground hover:text-foreground")}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={Receipt} layout="horizontal" title="Aucune facture ici" description="Créez une facture, ou générez-la depuis l’accompagnement d’un client." className="py-2" />
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <ul className="divide-y divide-border">
            {rows.map((i) => {
              const late = isOverdue(i);
              const label = late ? "En retard" : INVOICE_STATUS[i.status as keyof typeof INVOICE_STATUS] ?? i.status;
              const partial = i.status === "issued" && i.paidCents > 0;
              return (
                <li key={i.id}>
                  <Link href={`/factures/${i.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-muted/50">
                    <span className="w-28 shrink-0 font-medium tabular-nums">
                      {i.kind === "credit_note" ? "Avoir " : ""}
                      {i.number ?? "Brouillon"}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{i.billTo.company || i.billTo.name}</span>
                    <span className="w-24 text-muted-foreground tabular-nums">{i.issuedAt ? formatDate(i.issuedAt) : "—"}</span>
                    <span className="w-28 text-right font-medium tabular-nums">
                      {i.kind === "credit_note" ? "−" : ""}
                      {formatCents(i.totalCents, i.currency)}
                    </span>
                    <span className={cn("w-24 rounded-md px-2 py-0.5 text-center text-xs font-medium", statusStyle[late ? "overdue" : i.status])}>
                      {partial ? "Partiel" : label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
