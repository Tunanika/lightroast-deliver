// In-memory sliding-window rate limiter. Single-process scope; resets on
// restart. Used for the portal password endpoint.

// Persist across hot reloads in dev.
const store: Map<string, number[]> =
  (globalThis as unknown as { __lrRateLimit?: Map<string, number[]> })
    .__lrRateLimit ?? new Map();
(globalThis as unknown as { __lrRateLimit?: Map<string, number[]> }).__lrRateLimit =
  store;

export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Max `limit` hits per `windowMs` per key. Records a hit when allowed. */
export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 15 * 60 * 1000,
): RateResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (store.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    store.set(key, hits);
    const retryAfterMs = hits[0] + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  hits.push(now);
  store.set(key, hits);
  return { allowed: true, remaining: limit - hits.length, retryAfterSeconds: 0 };
}
