/**
 * Small in-process TTL cache for provider responses. It saves provider credits
 * for repeated views within one server instance. It is not shared across
 * serverless instances; persistent snapshots are stored in the database when an
 * analysis runs.
 */
export function createTtlCache({ maxEntries = 500 } = {}) {
  const map = new Map();
  return {
    get(key, now = Date.now()) {
      const hit = map.get(key);
      if (!hit) return undefined;
      if (hit.expiresAt <= now) {
        map.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key, value, ttlMs, now = Date.now()) {
      if (map.size >= maxEntries) map.delete(map.keys().next().value);
      map.set(key, { value, expiresAt: now + ttlMs });
    },
    clear() {
      map.clear();
    },
    get size() {
      return map.size;
    },
  };
}

export const TTL = Object.freeze({
  search: 60 * 60_000,
  quote: 30_000,
  history: 15 * 60_000,
  profile: 24 * 60 * 60_000,
  fundamentals: 12 * 60 * 60_000,
});
