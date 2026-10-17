"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { activityLog, clientPackages, contacts, invoices, settings } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { forgetPdf, getInvoicingSettings, issueAndStore } from "@/server/billing";
import { sendInvoiceMail } from "@/server/billing-mail";
import { createCreditNote, createDraft, deleteDraft, deletePayment, recordPayment, updateDraft } from "@/server/invoicing";
import { INVOICING_KEY, PAYMENT_METHODS, invoiceFormSchema, invoicingSettingsSchema, parseAmount, vatFor } from "@/lib/invoices";
import type { ActionState } from "./coaching";

const fieldErrors = (e: z.ZodError) => ({ fieldErrors: z.flattenError(e).fieldErrors as Record<string, string[]> });

async function log(actorId: string, contactId: string | null, action: string) {
  if (contactId) await db.insert(activityLog).values({ actorId, entity: "contact", entityId: contactId, action });
}

// ------------------------------------------------------------------ Paramètres › Facturation

export async function saveInvoicingSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const parsed = invoicingSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  await db
    .insert(settings)
    .values({ key: INVOICING_KEY, value: parsed.data })
    .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value` } });
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ drafts

function draftFields(v: z.infer<typeof invoiceFormSchema>) {
  return {
    currency: v.currency,
    billTo: {
      name: v.billName,
      company: v.billCompany || undefined,
      address: v.billAddress || undefined,
      email: v.billEmail || undefined,
      vatNumber: v.billVatNumber || undefined,
      reference: v.billReference || undefined,
    },
    lines: v.lines,
    notes: v.notes || null,
  };
}

/** « Nouvelle facture » (Factures page or client file). */
export async function createInvoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const parsed = invoiceFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const contactId = z.uuid().nullable().catch(null).parse(formData.get("contactId") || null);
  const s = await getInvoicingSettings();
  const draft = await createDraft(db, { contactId, ...draftFields(parsed.data), ...vatFor(s) });
  await log(user.id, contactId, "invoice_draft_created");
  redirect(`/factures/${draft.id}`);
}

/** « Générer la facture » for an offer sold to a client: draft filled from the offer and the client. */
export async function invoiceFromPackage(clientPackageId: string): Promise<ActionState> {
  const user = await requireCoach();
  const cp = await db.query.clientPackages.findFirst({
    where: eq(clientPackages.id, z.uuid().parse(clientPackageId)),
    with: { package: true, client: { with: { contact: true } } },
  });
  if (!cp) return { error: "Accompagnement introuvable." };
  const existing = await db.query.invoices.findFirst({ where: eq(invoices.clientPackageId, cp.id), columns: { id: true, status: true } });
  if (existing && existing.status !== "cancelled") redirect(`/factures/${existing.id}`);

  const contact = cp.client.contact;
  const s = await getInvoicingSettings();
  const unitCents = Math.round(Number(cp.price ?? cp.package.price) * 100);
  const draft = await createDraft(db, {
    contactId: contact.id,
    clientPackageId: cp.id,
    currency: cp.currency ?? contact.currency,
    billTo: {
      name: `${contact.firstName} ${contact.lastName}`.trim(),
      company: contact.organization ?? undefined,
      email: contact.email ?? undefined,
    },
    lines: [{ description: `${cp.package.name} — ${cp.package.sessionsCount} séance${cp.package.sessionsCount > 1 ? "s" : ""}`, quantity: 1, unitCents }],
    ...vatFor(s),
  });
  await log(user.id, contact.id, "invoice_draft_created");
  redirect(`/factures/${draft.id}`);
}

export async function saveInvoiceDraft(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  const parsed = invoiceFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const s = await getInvoicingSettings();
  const row = await updateDraft(db, z.uuid().parse(id), { ...draftFields(parsed.data), ...vatFor(s) });
  if (!row) return { error: "Cette facture est déjà émise : elle ne peut plus être modifiée." };
  refresh();
  return { ok: true };
}

export async function removeInvoiceDraft(id: string): Promise<ActionState> {
  await requireCoach();
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, z.uuid().parse(id)), columns: { pdfPath: true } });
  if (!(await deleteDraft(db, id))) return { error: "Une facture émise ne peut pas être supprimée : faites un avoir." };
  await forgetPdf(inv?.pdfPath ?? null);
  redirect("/factures");
}

// ------------------------------------------------------------------ issue, credit note

export async function issueInvoiceAction(id: string): Promise<ActionState> {
  const user = await requireCoach();
  const result = await issueAndStore(z.uuid().parse(id));
  if ("error" in result && result.error) return { error: result.error };
  await log(user.id, result.invoice?.contactId ?? null, result.invoice?.kind === "credit_note" ? "credit_note_issued" : "invoice_issued");
  const issued = result.invoice;
  if (issued?.kind === "invoice") after(() => sendInvoiceMail(issued.id, "invoice_issued").then(() => undefined));
  refresh();
  return { ok: true, message: `${result.invoice?.kind === "credit_note" ? "Avoir" : "Facture"} n° ${result.invoice?.number} émis${result.invoice?.kind === "credit_note" ? "" : "e"}.` };
}

export async function creditNoteAction(invoiceId: string): Promise<ActionState> {
  await requireCoach();
  const credit = await createCreditNote(db, z.uuid().parse(invoiceId));
  if (!credit) return { error: "Un avoir ne peut être fait que sur une facture émise." };
  redirect(`/factures/${credit.id}`);
}

// ------------------------------------------------------------------ payments

const paymentSchema = z.object({
  amount: z.string().transform((v, ctx) => {
    const cents = parseAmount(v);
    if (cents === null || cents <= 0) {
      ctx.addIssue({ code: "custom", message: "Montant invalide." });
      return z.NEVER;
    }
    return cents;
  }),
  method: z.enum(Object.keys(PAYMENT_METHODS) as [keyof typeof PAYMENT_METHODS, ...(keyof typeof PAYMENT_METHODS)[]]),
  paidOn: z.iso.date("Date invalide."),
  reference: z.string().trim().max(120).optional(),
});

export async function addPayment(invoiceId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, z.uuid().parse(invoiceId)) });
  if (!inv || inv.kind !== "invoice" || (inv.status !== "issued" && inv.status !== "paid")) {
    return { error: "Un paiement s’enregistre sur une facture émise." };
  }
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  await recordPayment(db, {
    invoiceId: inv.id,
    amountCents: v.amount,
    method: v.method,
    paidAt: new Date(`${v.paidOn}T12:00:00Z`),
    reference: v.reference || null,
  });
  await log(user.id, inv.contactId, "payment_recorded");
  const now = await db.query.invoices.findFirst({ where: eq(invoices.id, inv.id), columns: { status: true } });
  if (inv.status === "issued" && now?.status === "paid") after(() => sendInvoiceMail(inv.id, "payment_received").then(() => undefined));
  refresh();
  return { ok: true };
}

export async function removePayment(paymentId: string): Promise<ActionState> {
  await requireCoach();
  await deletePayment(db, z.uuid().parse(paymentId));
  refresh();
  return { ok: true };
}

/** Contacts offered in « Nouvelle facture ». */
export async function invoiceContactOptions() {
  await requireCoach();
  return db
    .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email, organization: contacts.organization, currency: contacts.currency })
    .from(contacts)
    .orderBy(contacts.firstName);
}
