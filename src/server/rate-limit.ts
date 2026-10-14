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

/** Visitor IP from the proxy headers (Vercel / nginx), for rate limiting only. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
