import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { invoices, payments, settings } from "@/server/db/schema";
import { currentToken, issueToken } from "@/server/access-tokens";
import { appUrl } from "@/server/email/config";
import { buildInvoicePdf } from "@/server/invoice-pdf";
import { issueInvoice, type Invoice } from "@/server/invoicing";
import { deleteStoredFile, saveFile } from "@/server/storage";
import { INVOICING_KEY, normalizeInvoicing } from "@/lib/invoices";

/** Paramètres › Facturation (sample details until the coach saves his own). */
export async function getInvoicingSettings() {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, INVOICING_KEY) });
  return normalizeInvoicing(row?.value);
}

/** Online payment is offered only when Stripe keys are configured on the server. */
export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY?.trim();

/** /paiement/<token> of an invoice (one link per invoice, reused). */
export async function paymentUrl(invoiceId: string) {
  const link =
    (await currentToken(db, "payment", { invoiceId })) ?? (await issueToken(db, { purpose: "payment", invoiceId }));
  return `${appUrl()}/paiement/${link.token}`;
}

async function creditForNumber(inv: Invoice) {
  if (!inv.creditForId) return null;
  const original = await db.query.invoices.findFirst({ where: eq(invoices.id, inv.creditForId), columns: { number: true } });
  return original?.number ?? null;
}

/** PDF of an invoice: the stored one once issued, rendered on the fly for drafts. */
export async function invoicePdf(inv: Invoice) {
  const s = await getInvoicingSettings();
  return buildInvoicePdf(inv, s, {
    paymentUrl: inv.kind === "invoice" && inv.status !== "draft" && stripeEnabled() ? await paymentUrl(inv.id) : null,
    creditForNumber: await creditForNumber(inv),
  });
}

/** Issues the draft (number, frozen details) and stores its PDF. */
export async function issueAndStore(invoiceId: string) {
  const s = await getInvoicingSettings();
  const result = await issueInvoice(db, invoiceId, s);
  if (!("invoice" in result) || !result.invoice) return { error: result.error ?? "Émission impossible." };
  const inv = result.invoice;
  const storagePath = `facture-${inv.number}-${randomUUID().slice(0, 8)}.pdf`;
  await saveFile(storagePath, await invoicePdf(inv));
  const [stored] = await db.update(invoices).set({ pdfPath: storagePath }).where(eq(invoices.id, inv.id)).returning();
  return { invoice: stored };
}

/** Removes the stored PDF of a deleted draft (drafts normally have none). */
export async function forgetPdf(pdfPath: string | null) {
  if (pdfPath) await deleteStoredFile(pdfPath);
}

// ------------------------------------------------------------------ queries

export type InvoiceListItem = Invoice & { paidCents: number; contactName: string | null; overdue: boolean };

/** All invoices, newest first, with what has been paid. */
export async function listInvoices(filter: { status?: string; contactId?: string } = {}): Promise<InvoiceListItem[]> {
  const rows = await db.query.invoices.findMany({
    where: and(
      filter.status === "overdue"
        ? and(eq(invoices.status, "issued"), eq(invoices.kind, "invoice"), sql`${invoices.dueAt} < now()`)
        : filter.status
          ? eq(invoices.status, filter.status)
          : undefined,
      filter.contactId ? eq(invoices.contactId, filter.contactId) : undefined,
    ),
    orderBy: [desc(invoices.createdAt)],
    with: { contact: { columns: { firstName: true, lastName: true } } },
  });
  const ids = rows.map((r) => r.id);
  const sums = ids.length
    ? await db
        .select({ invoiceId: payments.invoiceId, sum: sql<number>`sum(${payments.amountCents})::int` })
        .from(payments)
        .where(inArray(payments.invoiceId, ids))
        .groupBy(payments.invoiceId)
    : [];
  const now = Date.now();
  return rows.map(({ contact, ...r }) => ({
    ...r,
    overdue: r.kind === "invoice" && r.status === "issued" && !!r.dueAt && r.dueAt.getTime() < now,
    paidCents: sums.find((x) => x.invoiceId === r.id)?.sum ?? 0,
    contactName: contact ? `${contact.firstName} ${contact.lastName}`.trim() : null,
  }));
}

export async function getInvoice(id: string) {
  const inv = await db.query.invoices.findFirst({
    where: eq(invoices.id, id),
    with: {
      contact: { columns: { id: true, firstName: true, lastName: true, email: true } },
      payments: { orderBy: [desc(payments.paidAt)] },
      clientPackage: { with: { package: { columns: { name: true } } } },
    },
  });
  if (!inv) return null;
  const credits = await db.query.invoices.findMany({
    where: eq(invoices.creditForId, id),
    columns: { id: true, number: true, status: true, totalCents: true },
  });
  const original = inv.creditForId
    ? await db.query.invoices.findFirst({ where: eq(invoices.id, inv.creditForId), columns: { id: true, number: true } })
    : null;
  return { ...inv, credits, original: original ?? null };
}

/** Expected next month, per currency: what is left to pay on invoices due that month. */
export function forecastNextMonth(items: InvoiceListItem[], now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const out: Record<string, number> = {};
  for (const i of items) {
    if (i.kind !== "invoice" || i.status !== "issued" || !i.dueAt || i.dueAt < start || i.dueAt >= end) continue;
    out[i.currency] = (out[i.currency] ?? 0) + Math.max(0, i.totalCents - i.paidCents);
  }
  return { month: new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(start), byCurrency: out };
}
