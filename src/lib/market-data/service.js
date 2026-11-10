import { AppError, ErrorCodes } from "../errors.js";
import { createTwelveDataProvider } from "./providers/twelveData.js";
import { createAlphaVantageProvider } from "./providers/alphaVantage.js";
import { createTtlCache, TTL } from "./cache.js";
import { getExchange } from "./exchanges.js";
import { scheduleMarketStatus } from "./marketStatus.js";
import { logger } from "../logger.js";

/**
 * Market-data service: the only module the rest of the app uses for market data.
 * Agent logic (Phase 3+) depends on this interface, never on a specific provider:
 *
 *   searchSymbols(query, { exchange })
 *   getQuote(symbol, exchange)
 *   getHistory(symbol, exchange, range)
 *   getProfile(symbol, exchange)
 *   getFundamentals(symbol, exchange)
 *
 * Provider choice (no silent switching):
 *   1. The user's own key, preferring the provider in their settings, else Twelve Data, else Alpha Vantage.
 *   2. Otherwise the server's key from environment variables, per MARKET_DATA_PROVIDER.
 * The provider that served each response is named in its provenance.
 */

export const PROVIDER_FACTORIES = {
  TWELVE_DATA: createTwelveDataProvider,
  ALPHA_VANTAGE: createAlphaVantageProvider,
};

const ENV_KEYS = { TWELVE_DATA: "TWELVE_DATA_API_KEY", ALPHA_VANTAGE: "ALPHA_VANTAGE_API_KEY" };

/**
 * Picks a provider id and key. `getUserKey(providerId)` returns { apiKey } or null.
 * Pure apart from the injected lookups, so it is unit-testable.
 */
export async function resolveMarketDataCredentials({ getUserKey, preferred, env = process.env }) {
  const order = [];
  if (preferred && PROVIDER_FACTORIES[preferred]) order.push(preferred);
  for (const id of ["TWELVE_DATA", "ALPHA_VANTAGE"]) if (!order.includes(id)) order.push(id);

  if (getUserKey) {
    for (const id of order) {
      const key = await getUserKey(id);
      if (key?.apiKey) return { providerId: id, apiKey: key.apiKey, keySource: "user" };
    }
  }

  const envPreferred = String(env.MARKET_DATA_PROVIDER || "").toUpperCase();
  const envOrder = PROVIDER_FACTORIES[envPreferred] ? [envPreferred, ...order.filter((o) => o !== envPreferred)] : order;
  for (const id of envOrder) {
    if (env[ENV_KEYS[id]]) return { providerId: id, apiKey: env[ENV_KEYS[id]], keySource: "server" };
  }

  throw new AppError(
    ErrorCodes.PROVIDER_NOT_CONFIGURED,
    "No market-data provider is configured. Add a Twelve Data or Alpha Vantage API key in Settings → API providers.",
    { status: 503, details: { setupPath: "/settings/providers" } }
  );
}

const sharedCache = createTtlCache({ maxEntries: 1000 });

export function createMarketDataService({ provider, cache = sharedCache, keySource = "server" }) {
  const cached = async (kind, keyParts, ttl, fn) => {
    // Cache keys include the provider so results from different sources never mix.
    const key = [provider.id, kind, ...keyParts].join("|");
    const hit = cache.get(key);
    if (hit) return { ...hit, cached: true };
    const value = await fn();
    cache.set(key, value, ttl);
    return { ...value, cached: false };
  };

  const checkExchange = (exchange) => {
    if (!getExchange(exchange)) {
      throw new AppError(ErrorCodes.UNSUPPORTED_EXCHANGE, `Exchange "${exchange}" is not supported.`, { status: 400 });
    }
  };

  return {
    providerId: provider.id,
    providerName: provider.name,
    keySource,

    async searchSymbols(query, { exchange = null } = {}) {
      if (exchange) checkExchange(exchange);
      const q = query.trim();
      const result = await cached("search", [q.toLowerCase(), exchange || "ALL"], TTL.search, async () => ({
        results: await provider.searchSymbols(q, { exchange }),
      }));
      return {
        query: q,
        exchange,
        source: provider.name,
        results: result.results,
        // The UI must ask for confirmation whenever this is not exactly one unambiguous match.
        requiresConfirmation: result.results.length !== 1 || !result.results[0].exchange,
        cached: result.cached,
      };
    },

    async getQuote(symbol, exchange) {
      checkExchange(exchange);
      return cached("quote", [symbol, exchange], TTL.quote, () => provider.getQuote(symbol, exchange));
    },

    async getHistory(symbol, exchange, range = "1Y") {
      checkExchange(exchange);
      return cached("history", [symbol, exchange, range], TTL.history, () => provider.getHistory(symbol, exchange, range));
    },

    async getProfile(symbol, exchange) {
      checkExchange(exchange);
      return cached("profile", [symbol, exchange], TTL.profile, () => provider.getProfile(symbol, exchange));
    },

    async getFundamentals(symbol, exchange) {
      checkExchange(exchange);
      return cached("fundamentals", [symbol, exchange], TTL.fundamentals, () => provider.getFundamentals(symbol, exchange));
    },

    getMarketStatus(exchange, now = new Date()) {
      checkExchange(exchange);
      return scheduleMarketStatus(exchange, now);
    },
  };
}

/**
 * Builds the service for a signed-in user. Lazily imports DB modules so the
 * pure parts of this file stay testable without a database.
 */
export async function getMarketDataServiceForUser(userId, { env = process.env } = {}) {
  const { getDecryptedProviderKey } = await import("../db/providerConfigs.js");
  const { getUserSettings } = await import("../db/users.js");
  const settings = await getUserSettings(userId);
  const creds = await resolveMarketDataCredentials({
    getUserKey: (id) => getDecryptedProviderKey(userId, id),
    preferred: settings?.marketDataProvider,
    env,
  });
  logger.debug("market.provider.selected", { userId, providerId: creds.providerId, keySource: creds.keySource });
  const provider = PROVIDER_FACTORIES[creds.providerId]({ apiKey: creds.apiKey, env });
  return createMarketDataService({ provider, keySource: creds.keySource });
}
