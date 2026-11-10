import { AppError, ErrorCodes } from "../../errors.js";
import { fetchJson } from "../http.js";
import { getExchange } from "../exchanges.js";
import { num, str, rangeStartDate, cleanBars } from "../normalize.js";
import { buildProvenance, classifyQuoteFreshness, isStaleDataDate, FRESHNESS } from "../provenance.js";
import { scheduleMarketStatus } from "../marketStatus.js";

const BASE_URL = "https://www.alphavantage.co/query";
export const ALPHA_VANTAGE_NAME = "Alpha Vantage";

// Alpha Vantage search "region" → our exchange codes. US results do not say
// which US exchange, so the user is asked to confirm NASDAQ or NYSE.
const REGION_TO_EXCHANGES = {
  "United States": ["NASDAQ", "NYSE"],
  "India/Bombay": ["BSE"],
  "United Kingdom": ["LSE"],
};

/** Alpha Vantage reports most errors with HTTP 200 and a message key. Exported for tests. */
export function mapAlphaVantagePayloadError(body, { symbol } = {}) {
  if (!body || typeof body !== "object") {
    return new AppError(ErrorCodes.PROVIDER_BAD_RESPONSE, "Alpha Vantage returned an empty response.", { status: 502 });
  }
  const info = str(body.Note) || str(body.Information);
  if (info) {
    const lower = info.toLowerCase();
    if (lower.includes("premium")) {
      return new AppError(ErrorCodes.PROVIDER_PLAN_RESTRICTED, "This data requires a premium Alpha Vantage plan.", {
        status: 403,
        details: { providerMessage: info.slice(0, 300) },
      });
    }
    if (lower.includes("api key") && lower.includes("invalid")) {
      return new AppError(ErrorCodes.PROVIDER_AUTH_FAILED, "Alpha Vantage rejected the API key. Check it in Settings.", {
        status: 502,
      });
    }
    return new AppError(
      ErrorCodes.PROVIDER_RATE_LIMITED,
      "Alpha Vantage request limit reached. Wait and try again, or upgrade the data plan.",
      { status: 429, retryAfterSeconds: 60 }
    );
  }
  if (str(body["Error Message"])) {
    return new AppError(
      ErrorCodes.INVALID_TICKER,
      symbol ? `Alpha Vantage has no data for "${symbol}".` : "Invalid request to Alpha Vantage.",
      { status: 404 }
    );
  }
  return null;
}

/** Builds the Alpha Vantage symbol for one of our exchanges (e.g. RELIANCE + BSE → RELIANCE.BSE). */
export function toAlphaVantageSymbol(symbol, exchangeCode) {
  const ex = getExchange(exchangeCode);
  if (!ex || !ex.alphaVantage.supported) {
    throw new AppError(
      ErrorCodes.UNSUPPORTED_EXCHANGE,
      `${ex ? ex.name : exchangeCode} is not supported by Alpha Vantage. Configure Twelve Data for this exchange.`,
      { status: 400 }
    );
  }
  const base = symbol.toUpperCase().replace(/\.(BSE|NSE|LON)$/, "");
  return `${base}${ex.alphaVantage.suffix}`;
}

export function createAlphaVantageProvider({ apiKey, fetchImpl, timeoutMs = 10_000, now = () => new Date(), env = process.env } = {}) {
  if (!apiKey) {
    throw new AppError(ErrorCodes.PROVIDER_NOT_CONFIGURED, "Alpha Vantage API key is not configured.", { status: 503 });
  }

  // ALPHA_VANTAGE_BASE_URL exists only to point tests at a local mock server.
  const baseUrl = env.ALPHA_VANTAGE_BASE_URL || BASE_URL;

  async function call(params, ctx = {}) {
    const qs = new URLSearchParams({ ...params, apikey: apiKey });
    const { status, body } = await fetchJson(`${baseUrl}?${qs}`, { provider: ALPHA_VANTAGE_NAME, timeoutMs, fetchImpl });
    if (status === 429) {
      throw new AppError(ErrorCodes.PROVIDER_RATE_LIMITED, "Alpha Vantage request limit reached.", { status: 429, retryAfterSeconds: 60 });
    }
    if (status >= 500) throw new AppError(ErrorCodes.PROVIDER_UNAVAILABLE, "Alpha Vantage is temporarily unavailable.", { status: 503 });
    const err = mapAlphaVantagePayloadError(body, ctx);
    if (err) throw err;
    return body;
  }

  return {
    id: "ALPHA_VANTAGE",
    name: ALPHA_VANTAGE_NAME,

    async searchSymbols(query, { exchange } = {}) {
      const body = await call({ function: "SYMBOL_SEARCH", keywords: query });
      const rows = Array.isArray(body.bestMatches) ? body.bestMatches : [];
      return rows
        .filter((r) => /equity|etf/i.test(r["3. type"] || ""))
        .map((r) => {
          const region = str(r["4. region"]);
          const options = REGION_TO_EXCHANGES[region] || [];
          const rawSymbol = str(r["1. symbol"]) || "";
          return {
            symbol: rawSymbol.replace(/\.(BSE|LON)$/i, ""),
            name: str(r["2. name"]),
            exchange: options.length === 1 ? options[0] : null,
            exchangeLabel: region,
            exchangeOptions: options,
            mic: null,
            country: region,
            currency: str(r["8. currency"]),
            type: str(r["3. type"]),
            supported: options.length > 0,
          };
        })
        .filter((r) => r.symbol && (!exchange || r.exchangeOptions.includes(exchange)))
        .map((r) => (exchange ? { ...r, exchange } : r));
    },

    async getQuote(symbol, exchangeCode) {
      const avSymbol = toAlphaVantageSymbol(symbol, exchangeCode);
      const body = await call({ function: "GLOBAL_QUOTE", symbol: avSymbol }, { symbol });
      const q = body["Global Quote"] || {};
      const price = num(q["05. price"]);
      if (price === null) {
        throw new AppError(ErrorCodes.INVALID_TICKER, `Alpha Vantage has no quote for "${symbol}" on ${exchangeCode}.`, { status: 404 });
      }
      const ex = getExchange(exchangeCode);
      const dataDate = str(q["07. latest trading day"]);
      const isMarketOpen = scheduleMarketStatus(exchangeCode, now())?.isOpen ?? null;
      const freshness = classifyQuoteFreshness({ exchange: exchangeCode, isMarketOpen, dataDate, now: now(), env });
      return {
        symbol,
        name: null,
        exchange: exchangeCode,
        currency: ex.currency,
        price,
        open: num(q["02. open"]),
        high: num(q["03. high"]),
        low: num(q["04. low"]),
        previousClose: num(q["08. previous close"]),
        change: num(q["09. change"]),
        changePercent: num(q["10. change percent"]),
        volume: num(q["06. volume"]),
        averageVolume: null,
        fiftyTwoWeek: { low: null, high: null },
        isMarketOpen,
        marketStatusBasis: "schedule",
        provenance: buildProvenance({
          source: ALPHA_VANTAGE_NAME,
          dataDate,
          currency: ex.currency,
          frequency: "quote",
          ...freshness,
          retrievedAt: now(),
        }),
      };
    },

    async getHistory(symbol, exchangeCode, range = "1Y") {
      const avSymbol = toAlphaVantageSymbol(symbol, exchangeCode);
      // "compact" returns the latest 100 trading days; longer ranges need "full".
      const outputsize = ["1M", "3M"].includes(range) ? "compact" : "full";
      const body = await call({ function: "TIME_SERIES_DAILY", symbol: avSymbol, outputsize }, { symbol });
      const series = body["Time Series (Daily)"];
      if (!series || typeof series !== "object") {
        throw new AppError(ErrorCodes.DATA_UNAVAILABLE, `No historical prices are available for ${symbol}.`, { status: 404 });
      }
      const start = rangeStartDate(range, now());
      const { bars, dropped } = cleanBars(
        Object.entries(series)
          .filter(([date]) => date >= start)
          .map(([date, v]) => ({
            date,
            open: num(v["1. open"]),
            high: num(v["2. high"]),
            low: num(v["3. low"]),
            close: num(v["4. close"]),
            volume: num(v["5. volume"]),
          }))
      );
      if (bars.length === 0) {
        throw new AppError(ErrorCodes.DATA_UNAVAILABLE, `No historical prices are available for ${symbol} in this range.`, { status: 404 });
      }
      const currency = getExchange(exchangeCode).currency;
      return {
        symbol,
        exchange: exchangeCode,
        currency,
        interval: "1day",
        range,
        adjustment: "unadjusted (raw prices; splits and dividends not adjusted)",
        bars,
        droppedRows: dropped,
        provenance: buildProvenance({
          source: ALPHA_VANTAGE_NAME,
          dataDate: bars[bars.length - 1].date,
          currency,
          frequency: "daily",
          freshness: FRESHNESS.END_OF_DAY,
          freshnessNote: "Daily bars, not adjusted for splits. The latest bar may be an in-progress session.",
          stale: isStaleDataDate(exchangeCode, bars[bars.length - 1].date, now()),
          retrievedAt: now(),
        }),
      };
    },

    async getProfile(symbol, exchangeCode) {
      const avSymbol = toAlphaVantageSymbol(symbol, exchangeCode);
      const body = await call({ function: "OVERVIEW", symbol: avSymbol }, { symbol });
      if (!str(body.Symbol)) {
        throw new AppError(ErrorCodes.DATA_UNAVAILABLE, `Alpha Vantage has no company profile for ${symbol}.`, { status: 404 });
      }
      return {
        symbol,
        exchange: exchangeCode,
        name: str(body.Name),
        sector: str(body.Sector),
        industry: str(body.Industry),
        description: str(body.Description),
        website: str(body.OfficialSite),
        country: str(body.Country),
        employees: null,
        provenance: buildProvenance({
          source: ALPHA_VANTAGE_NAME,
          frequency: "static",
          freshness: FRESHNESS.PERIODIC,
          freshnessNote: "Company overview; updated by the provider periodically.",
          retrievedAt: now(),
        }),
      };
    },

    async getFundamentals(symbol, exchangeCode) {
      const avSymbol = toAlphaVantageSymbol(symbol, exchangeCode);
      const unavailable = [];
      const attempt = async (section, params) => {
        try {
          return await call({ ...params, symbol: avSymbol }, { symbol });
        } catch (err) {
          if (err?.code === ErrorCodes.PROVIDER_RATE_LIMITED || err?.code === ErrorCodes.PROVIDER_AUTH_FAILED) throw err;
          unavailable.push({ section, reason: err?.message || "Unavailable" });
          return null;
        }
      };
      const ov = await attempt("overview", { function: "OVERVIEW" });
      const inc = await attempt("income_statement", { function: "INCOME_STATEMENT" });
      const bal = await attempt("balance_sheet", { function: "BALANCE_SHEET" });
      const cf = await attempt("cash_flow", { function: "CASH_FLOW" });
      const ear = await attempt("earnings", { function: "EARNINGS" });

      const currency = str(ov?.Currency) || getExchange(exchangeCode).currency;
      const balanceSheets = (bal?.annualReports || []).map((r) => ({
        fiscalDate: str(r.fiscalDateEnding),
        totalAssets: num(r.totalAssets),
        totalLiabilities: num(r.totalLiabilities),
        totalEquity: num(r.totalShareholderEquity),
        cash: num(r.cashAndCashEquivalentsAtCarryingValue),
        totalDebt: num(r.shortLongTermDebtTotal),
      }));
      const latestBs = balanceSheets[0];
      const debtToEquity =
        latestBs && latestBs.totalDebt !== null && latestBs.totalEquity ? (latestBs.totalDebt / latestBs.totalEquity) * 100 : null;

      return {
        symbol,
        exchange: exchangeCode,
        currency,
        metrics: {
          marketCap: num(ov?.MarketCapitalization),
          peRatio: num(ov?.PERatio),
          forwardPe: num(ov?.ForwardPE),
          pbRatio: num(ov?.PriceToBookRatio),
          epsTtm: num(ov?.DilutedEPSTTM ?? ov?.EPS),
          revenueTtm: num(ov?.RevenueTTM),
          netIncomeTtm: null,
          revenueGrowthQoqYoy: num(ov?.QuarterlyRevenueGrowthYOY),
          earningsGrowthYoy: num(ov?.QuarterlyEarningsGrowthYOY),
          roe: num(ov?.ReturnOnEquityTTM),
          operatingMargin: num(ov?.OperatingMarginTTM),
          profitMargin: num(ov?.ProfitMargin),
          // Derived from the latest annual balance sheet: total debt / equity, in percent.
          debtToEquityPercent: debtToEquity,
          totalDebt: latestBs?.totalDebt ?? null,
          totalCash: latestBs?.cash ?? null,
          operatingCashFlowTtm: null,
          leveredFreeCashFlowTtm: null,
          beta: num(ov?.Beta),
        },
        incomeStatements: (inc?.annualReports || []).map((r) => ({
          fiscalDate: str(r.fiscalDateEnding),
          revenue: num(r.totalRevenue),
          grossProfit: num(r.grossProfit),
          operatingIncome: num(r.operatingIncome),
          netIncome: num(r.netIncome),
          epsDiluted: null,
        })),
        balanceSheets,
        cashFlows: (cf?.annualReports || []).map((r) => {
          const ocf = num(r.operatingCashflow);
          const capex = num(r.capitalExpenditures);
          return {
            fiscalDate: str(r.fiscalDateEnding),
            operatingCashFlow: ocf,
            capitalExpenditures: capex,
            freeCashFlow: ocf !== null && capex !== null ? ocf - Math.abs(capex) : null,
          };
        }),
        earnings: (ear?.quarterlyEarnings || []).slice(0, 12).map((r) => ({
          date: str(r.reportedDate) || str(r.fiscalDateEnding),
          epsEstimate: num(r.estimatedEPS),
          epsActual: num(r.reportedEPS),
          surprisePercent: num(r.surprisePercentage),
        })),
        unavailable,
        provenance: buildProvenance({
          source: ALPHA_VANTAGE_NAME,
          dataDate: str(ov?.LatestQuarter) || balanceSheets[0]?.fiscalDate || null,
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
