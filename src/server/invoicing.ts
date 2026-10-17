import { and, eq, sql } from "drizzle-orm";
import { clientPackages, invoiceSequences, invoices, payments, type InvoiceLine, type InvoiceParty } from "@/server/db/schema";
import type { AnyDb } from "@/server/db/types";
import { computeTotals, formatInvoiceNumber, type InvoicingSettings } from "@/lib/invoices";

/**
 * Invoices (Phase 2 · M6). French rules: a number is given only when the invoice is issued, in a transaction
 * (never twice, never skipped); an issued invoice is never edited or deleted — a credit note cancels it.
 * No "server-only" import: the tests run it against PGlite; only server code imports it.
 */
export type Invoice = typeof invoices.$inferSelect;

export type DraftInput = {
  contactId: string | null;
  clientPackageId?: string | null;
  currency: string;
  billTo: InvoiceParty;
  lines: InvoiceLine[];
  vatRateBps: number;
  vatExempt: boolean;
  notes?: string | null;
};

export async function createDraft(db: AnyDb, input: DraftInput) {
  const [row] = await db
    .insert(invoices)
    .values({ ...input, notes: input.notes ?? null, ...computeTotals(input.lines, input.vatRateBps) })
    .returning();
  return row;
}

/** Drafts only; returns null when the invoice is already issued. */
export async function updateDraft(db: AnyDb, id: string, input: Omit<DraftInput, "contactId" | "clientPackageId">) {
  const [row] = await db
    .update(invoices)
    .set({ ...input, notes: input.notes ?? null, ...computeTotals(input.lines, input.vatRateBps) })
    .where(and(eq(invoices.id, id), eq(invoices.status, "draft")))
    .returning();
  return row ?? null;
}

export async function deleteDraft(db: AnyDb, id: string) {
  const rows = await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.status, "draft"))).returning({ id: invoices.id });
  return rows.length === 1;
}

type Tx = Parameters<Parameters<AnyDb["transaction"]>[0]>[0];

/** Next number of the year, taken inside the caller's transaction (the row lock serialises issuers). */
async function takeNumber(tx: Tx, year: number, firstNumber: number) {
  const [row] = await tx
    .insert(invoiceSequences)
    .values({ year, lastNumber: firstNumber })
    .onConflictDoUpdate({
      target: invoiceSequences.year,
      set: { lastNumber: sql`greatest(${invoiceSequences.lastNumber} + 1, ${firstNumber})` },
    })
    .returning({ n: invoiceSequences.lastNumber });
  return formatInvoiceNumber(year, row.n);
}

/** Copy of the seller printed on the invoice (later changes in Paramètres never rewrite it). */
export function sellerSnapshot(s: InvoicingSettings) {
  return {
    isSample: s.isSample,
    legalName: s.legalName,
    tradeName: s.tradeName,
    legalForm: s.legalForm,
    siret: s.siret,
    address: s.address,
    email: s.email,
    phone: s.phone,
    vatMode: s.vatMode,
    vatNumber: s.vatNumber,
    vatRate: s.vatRate,
    iban: s.iban,
    bic: s.bic,
    latePenaltyText: s.latePenaltyText,
  };
}

/**
 * Gives the draft its number, freezes seller and totals, sets the due date.
 * A credit note also cancels the invoice it refers to when it covers it in full.
 */
export async function issueInvoice(db: AnyDb, id: string, settings: InvoicingSettings, now = new Date()) {
  return db.transaction(async (tx) => {
    const [inv] = await tx.select().from(invoices).where(eq(invoices.id, id)).for("update");
    if (!inv) return { error: "Facture introuvable." } as const;
    if (inv.status !== "draft") return { error: "Cette facture est déjà émise." } as const;
    if (!inv.lines.length) return { error: "Ajoutez au moins une ligne." } as const;

    const number = await takeNumber(tx, now.getFullYear(), settings.firstNumber);
    const totals = computeTotals(inv.lines, inv.vatRateBps);
    const isInvoice = inv.kind === "invoice";
    const [issued] = await tx
      .update(invoices)
      .set({
        number,
        status: "issued",
        issuedAt: now,
        dueAt: isInvoice ? new Date(now.getTime() + settings.paymentTermsDays * 86_400_000) : null,
        seller: sellerSnapshot(settings),
        ...totals,
      })
      .where(eq(invoices.id, id))
      .returning();

    if (!isInvoice && inv.creditForId) {
      const [original] = await tx.select().from(invoices).where(eq(invoices.id, inv.creditForId));
      if (original && totals.totalCents >= original.totalCents) {
        await tx.update(invoices).set({ status: "cancelled" }).where(eq(invoices.id, original.id));
      }
    }
    return { invoice: issued } as const;
  });
}

/** Draft credit note (« avoir ») with the same lines as the invoice; editable before it is issued. */
export async function createCreditNote(db: AnyDb, invoiceId: string) {
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv || inv.kind !== "invoice" || inv.status === "draft") return null;
  const [row] = await db
    .insert(invoices)
    .values({
      kind: "credit_note",
      contactId: inv.contactId,
      clientPackageId: inv.clientPackageId,
      creditForId: inv.id,
      currency: inv.currency,
      billTo: inv.billTo,
      lines: inv.lines,
      vatRateBps: inv.vatRateBps,
      vatExempt: inv.vatExempt,
      subtotalCents: inv.subtotalCents,
      vatCents: inv.vatCents,
      totalCents: inv.totalCents,
      notes: `Avoir sur la facture n° ${inv.number}.`,
    })
    .returning();
  return row;
}

export async function paidCents(db: AnyDb, invoiceId: string) {
  const [row] = await db
    .select({ sum: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
  return row.sum;
}

/** Invoice paid when payments cover it; the linked package follows (payé / partiel / en attente). */
export async function syncPaid(db: AnyDb, invoiceId: string, now = new Date()) {
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv || inv.kind !== "invoice") return null;
  const paid = await paidCents(db, invoiceId);
  if (inv.status === "issued" && paid >= inv.totalCents) {
    await db.update(invoices).set({ status: "paid", paidAt: now }).where(eq(invoices.id, invoiceId));
  } else if (inv.status === "paid" && paid < inv.totalCents) {
    await db.update(invoices).set({ status: "issued", paidAt: null }).where(eq(invoices.id, invoiceId));
  }
  if (inv.clientPackageId && inv.status !== "cancelled") {
    const status = paid >= inv.totalCents ? "paid" : paid > 0 ? "partial" : "pending";
    await db.update(clientPackages).set({ paymentStatus: status }).where(eq(clientPackages.id, inv.clientPackageId));
  }
  return { paid, total: inv.totalCents };
}

/** Records a payment (a Stripe payment only once, whatever how many times Stripe notifies). */
export async function recordPayment(
  db: AnyDb,
  p: { invoiceId: string; amountCents: number; method: string; paidAt: Date; reference?: string | null; stripePaymentId?: string | null },
) {
  const rows = await db
    .insert(payments)
    .values({ ...p, reference: p.reference ?? null, stripePaymentId: p.stripePaymentId ?? null })
    .onConflictDoNothing({ target: payments.stripePaymentId })
    .returning({ id: payments.id });
  await syncPaid(db, p.invoiceId, p.paidAt);
  return rows.length === 1;
}

export async function deletePayment(db: AnyDb, paymentId: string) {
  const [row] = await db.delete(payments).where(eq(payments.id, paymentId)).returning({ invoiceId: payments.invoiceId });
  if (row) await syncPaid(db, row.invoiceId);
  return !!row;
}

/**
 * Payment reminders due now (`days` after the due date, e.g. [3, 10]). Each reminder is claimed with one
 * UPDATE … WHERE reminders_sent = k, so two runs never send the same reminder twice.
 */
export async function claimDueReminders(db: AnyDb, now: Date, days: number[]) {
  const claimed: { id: string; step: number }[] = [];
  for (const [k, d] of days.entries()) {
    const rows = await db
      .update(invoices)
      .set({ remindersSent: k + 1, lastReminderAt: now })
      .where(
        and(
          eq(invoices.kind, "invoice"),
          eq(invoices.status, "issued"),
          eq(invoices.remindersSent, k),
          sql`${invoices.dueAt} + make_interval(days => ${d}::int) <= ${now.toISOString()}::timestamptz`,
        ),
      )
      .returning({ id: invoices.id });
    claimed.push(...rows.map((r) => ({ id: r.id, step: k })));
  }
  return claimed;
}

/** A reminder that could not be sent is released for the next run. */
export async function releaseReminder(db: AnyDb, invoiceId: string, step: number) {
  await db
    .update(invoices)
    .set({ remindersSent: step })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.remindersSent, step + 1)));
}
