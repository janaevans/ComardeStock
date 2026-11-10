import { getExchange } from "./exchanges.js";
import { zonedParts } from "./marketStatus.js";

/**
 * Every record returned by the market-data engine carries a provenance block:
 *
 *   source        provider display name
 *   retrievedAt   ISO time we fetched it
 *   dataDate      the as-of date/time the provider reports for the data
 *   currency      ISO currency of price fields (null when not applicable)
 *   frequency     "quote" | "daily" | "annual" | "quarterly" | "static"
 *   freshness     "real-time" | "delayed" | "end-of-day" | "periodic" | "unknown"
 *   freshnessNote human explanation
 *   stale         true when the data is older than expected
 *
 * Rule: data is labelled "real-time" ONLY when the operator has declared that
 * their provider plan delivers real-time data for that exchange
 * (MARKET_DATA_REALTIME_EXCHANGES). Otherwise intraday data is "delayed".
 */
export const FRESHNESS = Object.freeze({
  REAL_TIME: "real-time",
  DELAYED: "delayed",
  END_OF_DAY: "end-of-day",
  PERIODIC: "periodic",
  UNKNOWN: "unknown",
});

export function realtimeExchanges(env = process.env) {
  return new Set(
    String(env.MARKET_DATA_REALTIME_EXCHANGES || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  );
}

/** Calendar-day difference between two YYYY-MM-DD dates. */
export function daysBetween(a, b) {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Freshness for a latest-price quote.
 * @param {object} p
 * @param {string} p.exchange       our exchange code
 * @param {boolean|null} p.isMarketOpen  provider's flag, or schedule fallback
 * @param {string|null} p.dataDate  provider as-of timestamp (ISO or "YYYY-MM-DD[ HH:mm:ss]")
 * @param {Date} [p.now]
 */
export function classifyQuoteFreshness({ exchange, isMarketOpen, dataDate, now = new Date(), env = process.env }) {
  const ex = getExchange(exchange);
  const today = ex ? zonedParts(now, ex.timezone).date : now.toISOString().slice(0, 10);
  const dataDay = dataDate ? String(dataDate).slice(0, 10) : null;
  const ageDays = dataDay ? daysBetween(dataDay, today) : null;
  // More than 4 calendar days covers a normal weekend plus one holiday.
  const stale = ageDays === null ? true : ageDays > 4;

  if (!dataDay) {
    return { freshness: FRESHNESS.UNKNOWN, stale: true, freshnessNote: "The provider did not report an as-of time." };
  }
  if (isMarketOpen && dataDay === today) {
    if (realtimeExchanges(env).has(exchange)) {
      return {
        freshness: FRESHNESS.REAL_TIME,
        stale: false,
        freshnessNote: "Operator has declared a real-time data plan for this exchange.",
      };
    }
    return {
      freshness: FRESHNESS.DELAYED,
      stale: false,
      freshnessNote: "Intraday price. May be delayed depending on the data provider plan; not labelled live.",
    };
  }
  return {
    freshness: FRESHNESS.END_OF_DAY,
    stale,
    freshnessNote: stale
      ? `Latest available price is from ${dataDay}, which is ${ageDays} days old.`
      : `Last available closing price as of ${dataDay}.`,
  };
}

/** True when a daily data date is older than expected (> 4 calendar days, exchange-local). */
export function isStaleDataDate(exchange, dataDate, now = new Date()) {
  if (!dataDate) return true;
  const ex = getExchange(exchange);
  const today = ex ? zonedParts(now, ex.timezone).date : now.toISOString().slice(0, 10);
  return daysBetween(String(dataDate).slice(0, 10), today) > 4;
}

export function buildProvenance({
  source,
  dataDate = null,
  currency = null,
  frequency,
  freshness,
  freshnessNote,
  stale = false,
  retrievedAt = new Date(),
  extra,
}) {
  return {
    source,
    retrievedAt: retrievedAt.toISOString(),
    dataDate,
    currency,
    frequency,
    freshness,
    freshnessNote,
    stale,
    ...(extra || {}),
  };
}
