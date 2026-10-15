import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestDb } from "./db/test-db";
import { accessTokens } from "./db/schema";
import { currentToken, findToken, issueToken, looksLikeToken, revokeTokens } from "./access-tokens";

// The token secret is read when a token is made, not at import time.
process.env.BETTER_AUTH_SECRET ??= "test-secret-for-unit-tests-only-0123456789";

describe("access tokens", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  before(async () => {
    t = await createTestDb();
  });
  after(() => t.close());

  it("stores only the hash and finds the row from the token", async () => {
    const { token, row } = await issueToken(t.db, { purpose: "calendar_feed" });
    assert.ok(looksLikeToken(token));
    const stored = await t.db.select().from(accessTokens);
    assert.ok(stored.every((r) => r.tokenHash !== token && !r.tokenHash.includes(token)));
    assert.equal((await findToken(t.db, "calendar_feed", token))?.id, row.id);
  });

  it("rejects malformed, unknown or wrong-purpose tokens", async () => {
    const { token } = await issueToken(t.db, { purpose: "calendar_feed" });
    assert.equal(await findToken(t.db, "calendar_feed", "abc"), null);
    assert.equal(await findToken(t.db, "calendar_feed", `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`), null);
    assert.equal(await findToken(t.db, "manage", token), null);
  });

  it("rejects expired tokens", async () => {
    const { token } = await issueToken(t.db, { purpose: "manage", expiresAt: new Date("2026-01-01T00:00:00Z") });
    assert.equal(await findToken(t.db, "manage", token, new Date("2026-02-01T00:00:00Z")), null);
    assert.ok(await findToken(t.db, "manage", token, new Date("2025-12-01T00:00:00Z")));
  });

  it("« Régénérer » revokes the old link and shows the same new one again", async () => {
    const old = await currentToken(t.db, "calendar_feed");
    assert.ok(old);
    await revokeTokens(t.db, "calendar_feed");
    assert.equal(await findToken(t.db, "calendar_feed", old.token), null);
    const fresh = await issueToken(t.db, { purpose: "calendar_feed" });
    assert.equal((await currentToken(t.db, "calendar_feed"))?.token, fresh.token);
  });
});
