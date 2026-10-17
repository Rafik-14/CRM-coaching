import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { activityLog, invoices, paymentEvents } from "@/server/db/schema";
import { recordPayment } from "@/server/invoicing";
import { sendInvoiceMail } from "@/server/billing-mail";
import { methodFromStripe, verifyStripeSignature } from "@/lib/stripe-signature";

/**
 * Stripe webhook (POST /api/webhooks/stripe). Public route: the signature is the protection.
 * Each event is stored once (unique id), so a replayed event changes nothing.
 */
type Session = {
  id: string;
  payment_status?: string;
  amount_total?: number;
  payment_intent?: string;
  payment_method_types?: string[];
  metadata?: { invoice_id?: string };
  client_reference_id?: string;
};

export async function POST(request: Request) {
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET ?? "")) {
    return new Response("Signature invalide", { status: 400 });
  }
  const event = JSON.parse(payload) as { id: string; type: string; data: { object: Session } };
  const s = event.data.object;
  const invoiceId = s.metadata?.invoice_id ?? s.client_reference_id ?? null;

  const stored = await db
    .insert(paymentEvents)
    .values({ stripeEventId: event.id, type: event.type, invoiceId: invoiceId && /^[0-9a-f-]{36}$/.test(invoiceId) ? invoiceId : null, payload: event })
    .onConflictDoNothing({ target: paymentEvents.stripeEventId })
    .returning({ id: paymentEvents.id });
  if (!stored.length) return Response.json({ received: true, duplicate: true });

  const paid =
    (event.type === "checkout.session.completed" && s.payment_status === "paid") || event.type === "checkout.session.async_payment_succeeded";
  if (paid && invoiceId && s.amount_total) {
    const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
    if (inv) {
      const before = inv.status;
      await recordPayment(db, {
        invoiceId,
        amountCents: s.amount_total,
        method: methodFromStripe(s.payment_method_types?.[0]),
        paidAt: new Date(),
        reference: `Stripe ${s.payment_intent ?? s.id}`,
        stripePaymentId: s.payment_intent ?? s.id,
      });
      if (inv.contactId) await db.insert(activityLog).values({ entity: "contact", entityId: inv.contactId, action: "payment_online" });
      const after = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId), columns: { status: true } });
      if (before === "issued" && after?.status === "paid") await sendInvoiceMail(invoiceId, "payment_received");
    }
  }
  return Response.json({ received: true });
}
