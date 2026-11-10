import { AppError, ErrorCodes } from "../../errors.js";
import { fetchJson } from "../http.js";
import { getExchange, normalizeExchangeCode } from "../exchanges.js";
import { num, str, bool, rangeStartDate, cleanBars } from "../normalize.js";
import { buildProvenance, classifyQuoteFreshness, isStaleDataDate, FRESHNESS } from "../provenance.js";
import { scheduleMarketStatus } from "../marketStatus.js";

const BASE_URL = "https://api.twelvedata.com";
export const TWELVE_DATA_NAME = "Twelve Data";

/**
 * Maps a Twelve Data error body ({ code, message, status: "error" }) to an AppError.
 * Exported for unit tests.
 */
export function mapTwelveDataError(httpStatus, body, { symbol } = {}) {
  const code = num(body?.code) ?? httpStatus;
  const message = str(body?.message) || "";
  const lower = message.toLowerCase();
  if (code === 429 || lower.includes("run out of api credits") || lower.includes("rate limit")) {
    return new AppError(
      ErrorCodes.PROVIDER_RATE_LIMITED,
      "Twelve Data rate limit or credit limit reached. Wait a minute or upgrade the data plan.",
      { status: 429, retryAfterSeconds: 60 }
    );
  }
  if (code === 401) {
    return new AppError(ErrorCodes.PROVIDER_AUTH_FAILED, "Twelve Data rejected the API key. Check it in Settings → API providers.", {
      status: 502,
    });
  }
  const planRestricted = () =>
    new AppError(ErrorCodes.PROVIDER_PLAN_RESTRICTED, "This data is not included in the current Twelve Data plan.", {
      status: 403,
      details: { providerMessage: message.slice(0, 300) },
    });
  if (code === 403) return planRestricted();
  if (code === 404 || (code === 400 && /\bsymbol\b|not found|invalid/.test(lower))) {
    return new AppError(
      ErrorCodes.INVALID_TICKER,
      symbol ? `Twelve Data has no data for "${symbol}" on that exchange.` : "Symbol not found at Twelve Data.",
      { status: 404 }
    );
  }
  if (/\bupgrade\b|\bplan\b/.test(lower)) return planRestricted();
  if (code >= 500) {
    return new AppError(ErrorCodes.PROVIDER_UNAVAILABLE, "Twelve Data is temporarily unavailable.", { status: 503 });
  }
  return new AppError(ErrorCodes.PROVIDER_BAD_RESPONSE, "Twelve Data returned an unexpected error.", {
    status: 502,
    details: { providerMessage: message.slice(0, 300) },
  });
}

export function createTwelveDataProvider({ apiKey, fetchImpl, timeoutMs = 10_000, now = () => new Date(), env = process.env } = {}) {
  if (!apiKey) {
    throw new AppError(ErrorCodes.PROVIDER_NOT_CONFIGURED, "Twelve Data API key is not configured.", { status: 503 });
  }

  // TWELVE_DATA_BASE_URL exists only to point tests at a local mock server.
  const baseUrl = env.TWELVE_DATA_BASE_URL || BASE_URL;

  async function call(path, params, ctx = {}) {
    const qs = new URLSearchParams({ ...params, apikey: apiKey });
    const { status, body } = await fetchJson(`${baseUrl}${path}?${qs}`, {
      provider: TWELVE_DATA_NAME,
      timeoutMs,
      fetchImpl,
    });
    if (status >= 400 || body?.status === "error") throw mapTwelveDataError(status, body, ctx);
    if (!body || typeof body !== "object") {
      throw new AppError(ErrorCodes.PROVIDER_BAD_RESPONSE, "Twelve Data returned an empty response.", { status: 502 });
    }
    return body;
  }

  function exchangeParams(exchangeCode) {
    const ex = getExchange(exchangeCode);
    if (!ex) {
      throw new AppError(ErrorCodes.UNSUPPORTED_EXCHANGE, `Exchange "${exchangeCode}" is not supported.`, { status: 400 });
    }
    return { exchange: ex.twelveData.exchange };
  }

  return {
    id: "TWELVE_DATA",
    name: TWELVE_DATA_NAME,

    async searchSymbols(query, { exchange } = {}) {
      const body = await call("/symbol_search", { symbol: query, outputsize: "30" });
      const rows = Array.isArray(body.data) ? body.data : [];
      return rows
        .filter((r) => !r.instrument_type || /stock|equity|depositary|etf/i.test(r.instrument_type))
        .map((r) => {
          const code = normalizeExchangeCode(r.mic_code) || normalizeExchangeCode(r.exchange);
          return {
            symbol: str(r.symbol),
            name: str(r.instrument_name),
            exchange: code,
            exchangeLabel: str(r.exchange),
            exchangeOptions: code ? [code] : [],
            mic: str(r.mic_code),
            country: str(r.country),
            currency: str(r.currency),
            type: str(r.instrument_type),
            supported: Boolean(code),
          };
        })
        .filter((r) => r.symbol && (!exchange || r.exchange === exchange));
    },

    async getQuote(symbol, exchangeCode) {
      const body = await call("/quote", { symbol, ...exchangeParams(exchangeCode) }, { symbol });
      const price = num(body.close);
      if (price === null) {
        throw new AppError(ErrorCodes.DATA_UNAVAILABLE, `No price is available for ${symbol} right now.`, { status: 404 });
      }
      const providerOpen = bool(body.is_market_open);
      const isMarketOpen = providerOpen ?? scheduleMarketStatus(exchangeCode, now())?.isOpen ?? null;
      // `datetime` is the exchange-local as-of date (date only for daily quotes).
      // `last_quote_at` (UNIX seconds), when present, is the time of the last quote.
      const dataDate = str(body.datetime);
      const lastQuoteSeconds = num(body.last_quote_at);
      const ex = getExchange(exchangeCode);
      const freshness = classifyQuoteFreshness({ exchange: exchangeCode, isMarketOpen, dataDate, now: now(), env });
      return {
        symbol: str(body.symbol) || symbol,
        name: str(body.name),
        exchange: exchangeCode,
        currency: str(body.currency) || ex?.currency || null,
        price,
        open: num(body.open),
        high: num(body.high),
        low: num(body.low),
        previousClose: num(body.previous_close),
        change: num(body.change),
        changePercent: num(body.percent_change),
        volume: num(body.volume),
        averageVolume: num(body.average_volume),
        fiftyTwoWeek: { low: num(body.fifty_two_week?.low), high: num(body.fifty_two_week?.high) },
        isMarketOpen,
        marketStatusBasis: providerOpen === null ? "schedule" : "provider",
        provenance: buildProvenance({
          source: TWELVE_DATA_NAME,
          dataDate,
          currency: str(body.currency) || ex?.currency || null,
          frequency: "quote",
          ...freshness,
          retrievedAt: now(),
          extra: lastQuoteSeconds ? { lastQuoteAt: new Date(lastQuoteSeconds * 1000).toISOString() } : undefined,
        }),
      };
    },

    async getHistory(symbol, exchangeCode, range = "1Y") {
      const body = await call(
        "/time_series",
        {
          symbol,
          ...exchangeParams(exchangeCode),
          interval: "1day",
          start_date: rangeStartDate(range, now()),
          outputsize: "5000",
          order: "asc",
          adjust: "splits",
        },
        { symbol }
      );
      const values = Array.isArray(body.values) ? body.values : [];
      const { bars, dropped } = cleanBars(
        values.map((v) => ({
          date: String(v.datetime).slice(0, 10),
          open: num(v.open),
          high: num(v.high),
          low: num(v.low),
          close: num(v.close),
          volume: num(v.volume),
        }))
      );
      if (bars.length === 0) {
        throw new AppError(ErrorCodes.DATA_UNAVAILABLE, `No historical prices are available for ${symbol}.`, { status: 404 });
      }
      const last = bars[bars.length - 1].date;
      const currency = str(body.meta?.currency) || getExchange(exchangeCode)?.currency || null;
      return {
        symbol,
        exchange: exchangeCode,
        currency,
        interval: "1day",
        range,
        adjustment: "split-adjusted (dividends not adjusted)",
        bars,
        droppedRows: dropped,
        provenance: buildProvenance({
          source: TWELVE_DATA_NAME,
          dataDate: last,
          currency,
          frequency: "daily",
          freshness: FRESHNESS.END_OF_DAY,
          freshnessNote:
            "Daily bars. If the market is open, the latest bar may be an incomplete, in-progress session.",
          stale: isStaleDataDate(exchangeCode, last, now()),
          retrievedAt: now(),
        }),
      };
    },

    async getProfile(symbol, exchangeCode) {
      const body = await call("/profile", { symbol, ...exchangeParams(exchangeCode) }, { symbol });
      return {
        symbol,
        exchange: exchangeCode,
        name: str(body.name),
        sector: str(body.sector),
        industry: str(body.industry),
        description: str(body.description),
        website: str(body.website),
        country: str(body.country),
        employees: num(body.employees),
        provenance: buildProvenance({
          source: TWELVE_DATA_NAME,
          frequency: "static",
          freshness: FRESHNESS.PERIODIC,
          freshnessNote: "Company profile information; updated by the provider periodically.",
          retrievedAt: now(),
        }),
      };
    },

    /**
     * Fundamentals are assembled from several endpoints. Plan-restricted or missing
     * sections are reported in `unavailable` instead of failing the whole request.
     */
    async getFundamentals(symbol, exchangeCode) {
      const params = { symbol, ...exchangeParams(exchangeCode) };
      const unavailable = [];
      const attempt = async (section, fn) => {
        try {
          return await fn();
        } catch (err) {
          if (err?.code === ErrorCodes.PROVIDER_RATE_LIMITED || err?.code === ErrorCodes.PROVIDER_AUTH_FAILED) throw err;
          unavailable.push({ section, reason: err?.message || "Unavailable" });
          return null;
        }
      };

      const stats = await attempt("statistics", () => call("/statistics", params, { symbol }));
      const income = await attempt("income_statement", () => call("/income_statement", { ...params, period: "annual" }, { symbol }));
      const balance = await attempt("balance_sheet", () => call("/balance_sheet", { ...params, period: "annual" }, { symbol }));
      const cash = await attempt("cash_flow", () => call("/cash_flow", { ...params, period: "annual" }, { symbol }));
      const earnings = await attempt("earnings", () => call("/earnings", params, { symbol }));

      const s = stats?.statistics || {};
      const val = s.valuations_metrics || {};
      const fin = s.financials || {};
      const inc = fin.income_statement || {};
      const bs = fin.balance_sheet || {};
      const cf = fin.cash_flow || {};
      const currency = str(stats?.meta?.currency) || getExchange(exchangeCode)?.currency || null;

      const metrics = {
        marketCap: num(val.market_capitalization),
        peRatio: num(val.trailing_pe),
        forwardPe: num(val.forward_pe),
        pbRatio: num(val.price_to_book_mrq),
        epsTtm: num(inc.diluted_eps_ttm),
        revenueTtm: num(inc.revenue_ttm),
        netIncomeTtm: num(inc.net_income_to_common_ttm),
        revenueGrowthQoqYoy: num(inc.quarterly_revenue_growth),
        earningsGrowthYoy: num(inc.quarterly_earnings_growth_yoy),
        roe: num(fin.return_on_equity_ttm),
        operatingMargin: num(fin.operating_margin),
        profitMargin: num(fin.profit_margin),
        // Reported by Twelve Data as a percentage (e.g. 45.2 means 0.452x).
        debtToEquityPercent: num(bs.total_debt_to_equity_mrq),
        totalDebt: num(bs.total_debt_mrq),
        totalCash: num(bs.total_cash_mrq),
        operatingCashFlowTtm: num(cf.operating_cash_flow_ttm),
        leveredFreeCashFlowTtm: num(cf.levered_free_cash_flow_ttm),
        beta: num(s.stock_price_summary?.beta),
      };

      const incomeStatements = (income?.income_statement || []).map((r) => ({
        fiscalDate: str(r.fiscal_date),
        revenue: num(r.sales),
        grossProfit: num(r.gross_profit),
        operatingIncome: num(r.operating_income),
        netIncome: num(r.net_income),
        epsDiluted: num(r.eps_diluted),
      }));
      const balanceSheets = (balance?.balance_sheet || []).map((r) => ({
        fiscalDate: str(r.fiscal_date),
        totalAssets: num(r.assets?.total_assets),
        totalLiabilities: num(r.liabilities?.total_liabilities),
        totalEquity: num(r.shareholders_equity?.total_shareholders_equity),
        cash: num(r.assets?.current_assets?.cash_and_cash_equivalents ?? r.assets?.current_assets?.cash),
      }));
      const cashFlows = (cash?.cash_flow || []).map((r) => ({
        fiscalDate: str(r.fiscal_date),
        operatingCashFlow: num(r.operating_activities?.operating_cash_flow),
        capitalExpenditures: num(r.investing_activities?.capital_expenditures),
        freeCashFlow: num(r.free_cash_flow),
      }));
      const earningsHistory = (earnings?.earnings || []).map((r) => ({
        date: str(r.date),
        epsEstimate: num(r.eps_estimate),
        epsActual: num(r.eps_actual),
        surprisePercent: num(r.surprise_prc),
      }));

      const latestFiscal = incomeStatements[0]?.fiscalDate || str(fin.most_recent_quarter) || null;
      return {
        symbol,
        exchange: exchangeCode,
        currency,
        metrics,
        incomeStatements,
        balanceSheets,
        cashFlows,
        earnings: earningsHistory,
        unavailable,
        provenance: buildProvenance({
          source: TWELVE_DATA_NAME,
          dataDate: latestFiscal,
          currency,
          frequency: "annual",
          freshness: FRESHNESS.PERIODIC,
          freshnessNote: "Company financial statements; updated after each reporting period.",
          retrievedAt: now(),
        }),
      };
    },
  };
}
