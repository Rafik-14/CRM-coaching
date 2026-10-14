import { timingSafeEqual } from "node:crypto";
import { runJobs } from "@/server/jobs";

/**
 * Scheduled jobs entry point. Called every 5 minutes by the server's cron:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/run
 * Public route (not in the proxy matcher): the secret is the only protection.
 */
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  const startedAt = new Date();
  const jobs = await runJobs(startedAt);
  const ok = Object.values(jobs).every((j) => j.ok);
  return Response.json(
    { ok, startedAt: startedAt.toISOString(), ms: Date.now() - startedAt.getTime(), jobs },
    { status: ok ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  );
}
