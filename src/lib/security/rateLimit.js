import { AppError, ErrorCodes } from "../errors.js";

/**
 * Fixed-window rate limiter.
 *
 * The default store is in-memory, which limits per server instance. On Vercel
 * each serverless instance has its own memory, so this is a first line of
 * defence, not a global quota. For a strict global limit, implement the same
 * `increment(key, windowMs)` interface over Redis (e.g. Upstash) and pass it in.
 */
export function createMemoryStore() {
  const buckets = new Map();
  return {
    async increment(key, windowMs, now = Date.now()) {
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        const fresh = { count: 1, resetAt: now + windowMs };
        buckets.set(key, fresh);
        if (buckets.size > 10_000) {
          for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
        }
        return fresh;
      }
      bucket.count += 1;
      return bucket;
    },
  };
}

const defaultStore = createMemoryStore();

/** Named limits used across the API. */
export const LIMITS = Object.freeze({
  search: { limit: 30, windowMs: 60_000 },
  marketData: { limit: 60, windowMs: 60_000 },
  settingsWrite: { limit: 10, windowMs: 60_000 },
  general: { limit: 120, windowMs: 60_000 },
});

export async function enforceRateLimit(identity, name, { store = defaultStore, now = Date.now() } = {}) {
  const cfg = LIMITS[name] || LIMITS.general;
  const bucket = await store.increment(`${name}:${identity}`, cfg.windowMs, now);
  const remaining = Math.max(0, cfg.limit - bucket.count);
  if (bucket.count > cfg.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw new AppError(ErrorCodes.RATE_LIMITED, "Too many requests. Please wait and try again.", {
      status: 429,
      retryAfterSeconds,
    });
  }
  return { limit: cfg.limit, remaining, resetAt: bucket.resetAt };
}
