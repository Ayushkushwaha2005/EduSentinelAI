/*
 * In-memory sliding-window rate limiter for auth endpoints (R1).
 * Known limitation (SECURITY-NOTES SN-003): per-instance and resets on
 * restart — adequate for single-node deployment; Cloudflare rate rules
 * add the network-level layer at launch. Account lockout (persistent)
 * lives in the database, not here.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false; // limited
  }
  hits.push(now);
  buckets.set(key, hits);
  // opportunistic cleanup
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}

/** Progressive lockout duration after `failures` consecutive failed logins. */
export function lockoutMs(failures: number): number {
  if (failures < 5) return 0;
  return Math.min(60_000 * 2 ** (failures - 5), 15 * 60_000); // 1m → 15m cap
}
