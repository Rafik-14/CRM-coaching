"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { contacts, invoices } from "@/server/db/schema";
import { findToken } from "@/server/access-tokens";
import { paidCents } from "@/server/invoicing";
import { stripeEnabled } from "@/server/billing";
import { createCheckoutSession } from "@/server/stripe";
import { appUrl } from "@/server/email/config";
import { clientIp, rateLimited } from "@/server/rate-limit";

/** /paiement/<token> › « Payer en ligne »: opens Stripe Checkout for what is left to pay. */
export async function startPayment(token: string): Promise<{ error?: string }> {
  if (rateLimited(`payment:${await clientIp()}`, 10, 10 * 60_000)) return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  if (!stripeEnabled()) return { error: "Le paiement en ligne n’est pas disponible pour le moment." };
  const row = await findToken(db, "payment", token);
  const inv = row?.invoiceId ? await db.query.invoices.findFirst({ where: eq(invoices.id, row.invoiceId) }) : null;
  if (!inv || inv.status !== "issued" || !inv.number) return { error: "Cette facture ne peut plus être payée en ligne." };
  const due = inv.totalCents - (await paidCents(db, inv.id));
  if (due <= 0) return { error: "Cette facture est déjà réglée." };
  const contact = inv.contactId ? await db.query.contacts.findFirst({ where: eq(contacts.id, inv.contactId), columns: { email: true } }) : null;

  let url: string;
  try {
    url = await createCheckoutSession({
      invoiceId: inv.id,
      number: inv.number,
      amountCents: due,
      currency: inv.currency,
      email: inv.billTo.email || contact?.email || undefined,
      successUrl: `${appUrl()}/paiement/${token}?merci=1`,
      cancelUrl: `${appUrl()}/paiement/${token}`,
    });
  } catch (error) {
    console.error("[stripe]", error instanceof Error ? error.message : error);
    return { error: "Le paiement en ligne est momentanément indisponible. Vous pouvez régler par virement." };
  }
  redirect(url);
}
