import "server-only";

/**
 * Minimal Stripe client (REST API with fetch, no SDK): only what online invoice payment needs.
 * Keys come from the server environment (STRIPE_SECRET_KEY), never from the database or the browser.
 */
const API = "https://api.stripe.com/v1";

function form(data: Record<string, string | number | undefined>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) if (v !== undefined && v !== "") body.append(k, String(v));
  return body;
}

/** Stripe Checkout page for one invoice amount (card, Apple / Google Pay, TWINT in CHF — as enabled in his dashboard). */
export async function createCheckoutSession(p: {
  invoiceId: string;
  number: string;
  amountCents: number;
  currency: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const res = await fetch(`${API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // Same invoice and amount within Stripe's idempotency window → the same session (double click safe).
      "Idempotency-Key": `invoice-${p.invoiceId}-${p.amountCents}-${new Date().toISOString().slice(0, 13)}`,
    },
    body: form({
      mode: "payment",
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": p.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": p.amountCents,
      "line_items[0][price_data][product_data][name]": `Facture n° ${p.number}`,
      customer_email: p.email,
      client_reference_id: p.invoiceId,
      "metadata[invoice_id]": p.invoiceId,
      "payment_intent_data[metadata][invoice_id]": p.invoiceId,
      locale: "fr",
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
    }),
  });
  const json = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !json.url) throw new Error(json.error?.message ?? `Stripe ${res.status}`);
  return json.url;
}
