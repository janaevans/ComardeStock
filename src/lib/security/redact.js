/**
 * Helpers that keep secrets out of logs and API responses.
 */

const SECRET_KEY_PATTERN = /(api[_-]?key|apikey|secret|token|password|authorization|encrypted)/i;

/** Returns a display hint such as "••••a1b2". Never returns more than 4 chars of the secret. */
export function keyHint(secret) {
  if (typeof secret !== "string" || secret.length === 0) return "";
  if (secret.length <= 8) return "••••";
  return `••••${secret.slice(-4)}`;
}

/** Removes `apikey=...`-style query values from URLs before logging. */
export function redactUrl(url) {
  if (typeof url !== "string") return url;
  return url.replace(/([?&](?:apikey|api_key|token|key)=)[^&#]*/gi, "$1[REDACTED]");
}

/** Deep-copies a value, replacing anything under a secret-looking key. */
export function redactObject(value, depth = 0) {
  if (depth > 6 || value === null || typeof value !== "object") {
    return typeof value === "string" ? redactUrl(value) : value;
  }
  if (Array.isArray(value)) return value.map((v) => redactObject(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SECRET_KEY_PATTERN.test(k) ? "[REDACTED]" : redactObject(v, depth + 1);
  }
  return out;
}
