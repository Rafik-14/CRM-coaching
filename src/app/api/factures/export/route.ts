import { connection } from "next/server";
import { getCurrentUser } from "@/server/dal";
import { listInvoices } from "@/server/billing";
import { APP_TIME_ZONE } from "@/lib/format";

/** CSV of issued invoices and credit notes, for the accountant (opens in Excel: « ; » separator, UTF-8 BOM). */
export async function GET() {
  await connection();
  const user = await getCurrentUser();
  if (!user || user.role !== "coach") return new Response("Non autorisé", { status: 401 });
  const rows = (await listInvoices()).filter((i) => i.status !== "draft");
  const date = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });
  const money = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
  const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = ["Numéro", "Type", "Date", "Échéance", "Client", "Devise", "Total HT", "TVA", "Total TTC", "Payé", "Statut"];
  const lines = rows
    .sort((a, b) => (a.number ?? "").localeCompare(b.number ?? ""))
    .map((i) => {
      const sign = i.kind === "credit_note" ? -1 : 1;
      return [
        i.number ?? "",
        i.kind === "credit_note" ? "Avoir" : "Facture",
        i.issuedAt ? date.format(i.issuedAt) : "",
        i.dueAt ? date.format(i.dueAt) : "",
        i.billTo.company || i.billTo.name,
        i.currency,
        money(sign * i.subtotalCents),
        money(sign * i.vatCents),
        money(sign * i.totalCents),
        money(i.paidCents),
        { issued: "Émise", paid: "Payée", cancelled: "Annulée" }[i.status] ?? i.status,
      ]
        .map((v) => cell(String(v)))
        .join(";");
    });
  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="factures.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
