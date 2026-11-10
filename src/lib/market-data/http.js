import { AppError, ErrorCodes } from "../errors.js";
import { logger } from "../logger.js";
import { redactUrl } from "../security/redact.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * GET a JSON document with a timeout and limited retries.
 * Retries only transient failures (network errors, timeouts, 502/503/504).
 * Rate limits (429) and client errors are returned to the caller immediately,
 * because retrying them wastes the user's provider credits.
 *
 * Returns { status, body } where body is parsed JSON (or null).
 */
export async function fetchJson(
  url,
  { provider, timeoutMs = 10_000, retries = 2, backoffMs = 400, fetchImpl = globalThis.fetch, headers = {} } = {}
) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
      const res = await fetchImpl(url, {
        method: "GET",
        headers: { accept: "application/json", ...headers },
        signal: controller.signal,
        cache: "no-store",
      });
      const text = await res.text();
      let body = null;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          throw new AppError(ErrorCodes.PROVIDER_BAD_RESPONSE, `${provider} returned a response that is not valid JSON.`, {
            status: 502,
          });
        }
      }
      logger.debug("market.http", { provider, url: redactUrl(url), status: res.status, ms: Date.now() - started, attempt });
      if ([502, 503, 504].includes(res.status) && attempt < retries) {
        lastError = new AppError(ErrorCodes.PROVIDER_UNAVAILABLE, `${provider} is temporarily unavailable.`, { status: 503 });
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }
      return { status: res.status, body, headers: res.headers };
    } catch (err) {
      if (err instanceof AppError) throw err;
      const timedOut = err?.name === "AbortError";
      lastError = timedOut
        ? new AppError(ErrorCodes.PROVIDER_TIMEOUT, `${provider} did not respond within ${Math.round(timeoutMs / 1000)}s.`, {
            status: 504,
            cause: err,
          })
        : new AppError(ErrorCodes.PROVIDER_UNAVAILABLE, `Could not reach ${provider}. Check network connectivity or provider status.`, {
            status: 503,
            cause: err,
          });
      logger.warn("market.http.failure", { provider, url: redactUrl(url), attempt, timedOut, err });
      if (attempt < retries) {
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}
