/**
 * In-memory per-agent rate limiter (token bucket).
 * Key: agentId + route. Used for POST /api/cases and POST /api/cases/[id]/outputs.
 */

const DEFAULT_PER_MINUTE = 30;
const MS_PER_MINUTE = 60_000;

interface Bucket {
  tokens: number;
  lastRefillAt: number;
}

const buckets = new Map<string, Bucket>();

function getLimitPerMinute(): number {
  const n = process.env.RATE_LIMIT_PER_MINUTE;
  if (n === undefined || n === '') return DEFAULT_PER_MINUTE;
  const parsed = parseInt(n, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PER_MINUTE;
}

/**
 * Check and consume one token for (agentId, route).
 * Returns { allowed: true } or { allowed: false, retryAfterSeconds }.
 */
export function checkRateLimit(agentId: string, route: string): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const limit = getLimitPerMinute();
  const key = `${agentId}:${route}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: limit - 1, lastRefillAt: now };
    buckets.set(key, bucket);
    return { allowed: true };
  }

  const elapsed = (now - bucket.lastRefillAt) / MS_PER_MINUTE;
  const refill = elapsed * limit;
  bucket.tokens = Math.min(limit, bucket.tokens + refill);
  bucket.lastRefillAt = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true };
  }

  const timeUntilOneToken = ((1 - bucket.tokens) / limit) * MS_PER_MINUTE;
  const retryAfterSeconds = Math.ceil(timeUntilOneToken / 1000);
  return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
}
