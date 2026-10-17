import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { methodFromStripe, verifyStripeSignature } from "./stripe-signature";

const secret = "whsec_test";
const body = '{"id":"evt_1","type":"checkout.session.completed"}';
const sign = (t: number, payload = body, key = secret) => `t=${t},v1=${createHmac("sha256", key).update(`${t}.${payload}`).digest("hex")}`;
const now = 1_792_000_000_000;

describe("Stripe webhook signature", () => {
  it("accepts a correctly signed, recent event", () => {
    assert.equal(verifyStripeSignature(body, sign(now / 1000), secret, now), true);
  });
  it("refuses a modified body, a wrong secret, an old event or no header", () => {
    assert.equal(verifyStripeSignature(body.replace("evt_1", "evt_2"), sign(now / 1000), secret, now), false);
    assert.equal(verifyStripeSignature(body, sign(now / 1000, body, "whsec_other"), secret, now), false);
    assert.equal(verifyStripeSignature(body, sign(now / 1000 - 3600), secret, now), false);
    assert.equal(verifyStripeSignature(body, null, secret, now), false);
  });
  it("maps payment methods", () => {
    assert.equal(methodFromStripe("twint"), "twint");
    assert.equal(methodFromStripe("card"), "carte");
    assert.equal(methodFromStripe("sepa_debit"), "prelevement");
  });
});
