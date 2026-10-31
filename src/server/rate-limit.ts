import "server-only";
import { headers } from "next/headers";

/**
 * Small in-memory rate limit for the public forms (one server process; enough against casual spam).
 * Returns true when the caller has made more than `max` requests in the last `windowMs`.
 */
const buckets = new Map<string, number[]>();

export function rateLimited(key: string, max = 5, windowMs = 60_000) {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) {
    for (const [k, times] of buckets) if (times.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
  return recent.length > max;
}

/**
 * Failure counters (login, second step): only failed attempts count, so a user who signs in often is never blocked.
 * `tooManyFailures` checks without recording; `recordFailure` adds one; `clearFailures` resets after a success.
 */
export function tooManyFailures(key: string, max: number, windowMs: number) {
  const now = Date.now();
  return (buckets.get(key) ?? []).filter((t) => now - t < windowMs).length >= max;
}

export function recordFailure(key: string) {
  const list = buckets.get(key) ?? [];
  list.push(Date.now());
  buckets.set(key, list);
}

export function clearFailures(key: string) {
  buckets.delete(key);
}

/** Visitor IP from the proxy headers (Vercel / nginx), for rate limiting only. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
