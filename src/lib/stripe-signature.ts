import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Checks the « Stripe-Signature » header of a webhook (t=<timestamp>,v1=<hmac>…), as described by Stripe:
 * HMAC-SHA256 of « <timestamp>.<raw body> » with the webhook secret, and a timestamp no older than `toleranceSec`.
 */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now(), toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isFinite(t) || !signatures.length) return false;
  if (Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex"));
  return signatures.some((s) => {
    const given = Buffer.from(s);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** Stripe payment method → our label key. */
export function methodFromStripe(type: string | undefined) {
  if (type === "twint") return "twint";
  if (type === "sepa_debit") return "prelevement";
  return "carte";
}
