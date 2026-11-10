import { describe, it, expect } from "vitest";
import { createTwelveDataProvider, mapTwelveDataError } from "@/lib/market-data/providers/twelveData";
import { createAlphaVantageProvider, mapAlphaVantagePayloadError, toAlphaVantageSymbol } from "@/lib/market-data/providers/alphaVantage";
import { fetchJson } from "@/lib/market-data/http";
import { ErrorCodes } from "@/lib/errors";
import { mockFetch, path, fn } from "../helpers/mockFetch";
import { tdSearch, tdQuoteClosed, tdSeries, tdStatistics, tdIncome, tdError } from "../fixtures/twelveData";
import { avSearch, avGlobalQuote, avDaily, avRateLimitNote, avPremium, avErrorMessage } from "../fixtures/alphaVantage";

const NOW = new Date("2026-11-10T05:00:00Z"); // Tuesday 10:30 IST
const td = (routes, env = {}) => createTwelveDataProvider({ apiKey: "td-test-key", fetchImpl: mockFetch(routes), now: () => NOW, env });
const av = (routes, env = {}) => createAlphaVantageProvider({ apiKey: "av-test-key", fetchImpl: mockFetch(routes), now: () => NOW, env });

describe("Twelve Data adapter", () => {
  it("requires an API key", () => {
    expect(() => createTwelveDataProvider({})).toThrow(/not configured/);
  });

  it("maps search results, keeps unsupported exchanges flagged, filters non-equities", async () => {
    const res = await td([[path("/symbol_search"), { body: tdSearch }]]).searchSymbols("infosys");
    expect(res.map((r) => [r.symbol, r.exchange, r.supported])).toEqual([
      ["INFY", "NSE", true],
      ["INFY", "BSE", true],
      ["INFY", "NYSE", true],
      ["IOY", null, false],
    ]);
  });

  it("filters search by exchange", async () => {
    const res = await td([[path("/symbol_search"), { body: tdSearch }]]).searchSymbols("infosys", { exchange: "BSE" });
    expect(res).toHaveLength(1);
    expect(res[0].exchange).toBe("BSE");
  });

  it("sends the key as a query parameter and the exchange code", async () => {
    const f = mockFetch([[path("/quote"), { body: tdQuoteClosed }]]);
    await createTwelveDataProvider({ apiKey: "td-test-key", fetchImpl: f, now: () => NOW, env: {} }).getQuote("INFY", "NSE");
    expect(f.calls[0].searchParams.get("apikey")).toBe("td-test-key");
    expect(f.calls[0].searchParams.get("exchange")).toBe("NSE");
  });

  it("normalizes a closed-market quote as end-of-day with provenance", async () => {
    const q = await td([[path("/quote"), { body: tdQuoteClosed }]]).getQuote("INFY", "NSE");
    expect(q).toMatchObject({
      symbol: "INFY",
      currency: "INR",
      price: 1505.25,
      previousClose: 1488,
      changePercent: 1.15927,
      isMarketOpen: false,
      marketStatusBasis: "provider",
      fiftyTwoWeek: { low: 1305, high: 2006.45 },
    });
    expect(q.provenance).toMatchObject({ source: "Twelve Data", freshness: "end-of-day", currency: "INR", frequency: "quote", stale: false });
    expect(q.provenance.retrievedAt).toBe(NOW.toISOString());
    expect(q.provenance.dataDate).toBe("2026-11-09");
  });

  it("labels an open-market quote as delayed, not live", async () => {
    const body = { ...tdQuoteClosed, is_market_open: true, datetime: "2026-11-10" };
    const q = await td([[path("/quote"), { body }]]).getQuote("INFY", "NSE");
    expect(q.provenance.freshness).toBe("delayed");
  });

  it("refuses to invent a price when close is missing", async () => {
    await expect(td([[path("/quote"), { body: { ...tdQuoteClosed, close: null } }]]).getQuote("INFY", "NSE")).rejects.toMatchObject({
      code: ErrorCodes.DATA_UNAVAILABLE,
    });
  });

  it("returns ascending daily bars with range start and split adjustment", async () => {
    const f = mockFetch([[path("/time_series"), { body: tdSeries(30) }]]);
    const h = await createTwelveDataProvider({ apiKey: "k-12345678", fetchImpl: f, now: () => NOW, env: {} }).getHistory("INFY", "NSE", "1Y");
    expect(h.bars).toHaveLength(30);
    expect(h.bars[0].date < h.bars[29].date).toBe(true);
    // Fixture ends 2026-01-30, months before NOW, so the series must be flagged stale.
    expect(h.provenance).toMatchObject({ frequency: "daily", freshness: "end-of-day", dataDate: h.bars[29].date, stale: true });
    const sp = f.calls[0].searchParams;
    expect(sp.get("interval")).toBe("1day");
    expect(sp.get("start_date")).toBe("2025-11-10");
    expect(sp.get("adjust")).toBe("splits");
  });

  it("does not flag current history as stale", async () => {
    const h = await td([[path("/time_series"), { body: tdSeries(10, "2026-10-31") }]]).getHistory("INFY", "NSE", "1M");
    expect(h.provenance.stale).toBe(false);
  });

  it("raises DATA_UNAVAILABLE for empty history", async () => {
    await expect(td([[path("/time_series"), { body: { meta: {}, values: [], status: "ok" } }]]).getHistory("X", "NSE")).rejects.toMatchObject({
      code: ErrorCodes.DATA_UNAVAILABLE,
    });
  });

  it("assembles fundamentals and reports plan-restricted sections instead of failing", async () => {
    const f = td([
      [path("/statistics"), { body: tdStatistics }],
      [path("/income_statement"), { body: tdIncome }],
      [path("/balance_sheet"), { status: 200, body: tdError(403, "/balance_sheet is available exclusively with grow or pro plans") }],
      [path("/cash_flow"), { status: 200, body: tdError(403, "upgrade your plan") }],
      [path("/earnings"), { body: { earnings: [] } }],
    ]);
    const res = await f.getFundamentals("INFY", "NSE");
    expect(res.metrics).toMatchObject({ peRatio: 22.5, pbRatio: 7.2, roe: 0.31, debtToEquityPercent: 10.2, revenueTtm: 1600000000000 });
    expect(res.incomeStatements[0]).toMatchObject({ fiscalDate: "2026-03-31", revenue: 1580000000000, netIncome: 265000000000 });
    expect(res.unavailable.map((u) => u.section)).toEqual(["balance_sheet", "cash_flow"]);
    expect(res.provenance.freshness).toBe("periodic");
  });

  it("fails fundamentals fast on rate limits (no partial silent data)", async () => {
    const f = td([[path("/statistics"), { status: 429, body: tdError(429, "You have run out of API credits for the current minute.") }]]);
    await expect(f.getFundamentals("INFY", "NSE")).rejects.toMatchObject({ code: ErrorCodes.PROVIDER_RATE_LIMITED });
  });

  it("rejects unsupported exchanges before calling the provider", async () => {
    const f = mockFetch([]);
    const p = createTwelveDataProvider({ apiKey: "k-12345678", fetchImpl: f, now: () => NOW, env: {} });
    await expect(p.getQuote("SAP", "XETRA")).rejects.toMatchObject({ code: ErrorCodes.UNSUPPORTED_EXCHANGE });
    expect(f.calls).toHaveLength(0);
  });

  describe("error mapping", () => {
    it.each([
      [429, "You have run out of API credits", ErrorCodes.PROVIDER_RATE_LIMITED],
      [401, "**apikey** parameter is incorrect", ErrorCodes.PROVIDER_AUTH_FAILED],
      [403, "This endpoint is available on Pro plan", ErrorCodes.PROVIDER_PLAN_RESTRICTED],
      [404, "not found", ErrorCodes.INVALID_TICKER],
      [400, "**symbol** not found: ZZZZ. Please specify it correctly", ErrorCodes.INVALID_TICKER],
      [500, "internal", ErrorCodes.PROVIDER_UNAVAILABLE],
      [400, "interval explanation is missing", ErrorCodes.PROVIDER_BAD_RESPONSE],
    ])("code %i (%s) → %s", (code, message, expected) => {
      expect(mapTwelveDataError(200, tdError(code, message)).code).toBe(expected);
    });
  });
});

describe("Alpha Vantage adapter", () => {
  it("asks the user to choose NASDAQ or NYSE for US results; BSE maps directly", async () => {
    const res = await av([[fn("SYMBOL_SEARCH"), { body: avSearch }]]).searchSymbols("nvidia");
    const nvda = res.find((r) => r.symbol === "NVDA");
    expect(nvda).toMatchObject({ exchange: null, exchangeOptions: ["NASDAQ", "NYSE"], supported: true });
    const rel = res.find((r) => r.symbol === "RELIANCE");
    expect(rel).toMatchObject({ exchange: "BSE", currency: "INR" });
    expect(res.find((r) => r.symbol === "NVD.DEX")).toMatchObject({ supported: false });
    expect(res.find((r) => r.name === "Some Mutual Fund")).toBeUndefined();
  });

  it("builds provider symbols and rejects NSE", () => {
    expect(toAlphaVantageSymbol("RELIANCE", "BSE")).toBe("RELIANCE.BSE");
    expect(toAlphaVantageSymbol("VOD", "LSE")).toBe("VOD.LON");
    expect(toAlphaVantageSymbol("AAPL", "NASDAQ")).toBe("AAPL");
    expect(() => toAlphaVantageSymbol("INFY", "NSE")).toThrow(/not supported by Alpha Vantage/);
  });

  it("normalizes GLOBAL_QUOTE with schedule-based status", async () => {
    const q = await av([[fn("GLOBAL_QUOTE"), { body: avGlobalQuote }]]).getQuote("RELIANCE", "BSE");
    expect(q).toMatchObject({ price: 2901.75, changePercent: 0.5736, currency: "INR", marketStatusBasis: "schedule" });
    // Market open (10:30 IST) but data is from yesterday → end-of-day, not delayed/live.
    expect(q.provenance.freshness).toBe("end-of-day");
  });

  it("treats an empty Global Quote as an invalid ticker", async () => {
    await expect(av([[fn("GLOBAL_QUOTE"), { body: { "Global Quote": {} } }]]).getQuote("ZZZ", "NASDAQ")).rejects.toMatchObject({
      code: ErrorCodes.INVALID_TICKER,
    });
  });

  it("filters daily history to the requested range", async () => {
    const h = await av([[fn("TIME_SERIES_DAILY"), { body: avDaily(60, "2026-09-01") }]]).getHistory("IBM", "NYSE", "1M");
    expect(h.bars[0].date >= "2026-10-10").toBe(true);
    expect(h.adjustment).toMatch(/unadjusted/);
  });

  it("maps HTTP-200 error payloads", () => {
    expect(mapAlphaVantagePayloadError(avRateLimitNote).code).toBe(ErrorCodes.PROVIDER_RATE_LIMITED);
    expect(mapAlphaVantagePayloadError(avPremium).code).toBe(ErrorCodes.PROVIDER_PLAN_RESTRICTED);
    expect(mapAlphaVantagePayloadError(avErrorMessage).code).toBe(ErrorCodes.INVALID_TICKER);
    expect(mapAlphaVantagePayloadError({ Information: "the parameter apikey is invalid or missing. invalid api key" }).code).toBe(ErrorCodes.PROVIDER_AUTH_FAILED);
    expect(mapAlphaVantagePayloadError({ ok: true })).toBeNull();
  });
});

describe("HTTP layer", () => {
  it("retries transient 503s then succeeds", async () => {
    let n = 0;
    const f = mockFetch([[() => true, () => (++n < 2 ? { status: 503, body: {} } : { body: { ok: 1 } })]]);
    const r = await fetchJson("https://x.test/a", { provider: "T", fetchImpl: f, backoffMs: 1 });
    expect(r.body).toEqual({ ok: 1 });
    expect(f.calls).toHaveLength(2);
  });

  it("does not retry 429 (saves credits)", async () => {
    const f = mockFetch([[() => true, { status: 429, body: {} }]]);
    const r = await fetchJson("https://x.test/a", { provider: "T", fetchImpl: f, backoffMs: 1 });
    expect(r.status).toBe(429);
    expect(f.calls).toHaveLength(1);
  });

  it("reports timeouts as PROVIDER_TIMEOUT", async () => {
    const hang = (url, { signal }) =>
      new Promise((_, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
    await expect(fetchJson("https://x.test/a", { provider: "T", fetchImpl: hang, timeoutMs: 20, retries: 1, backoffMs: 1 })).rejects.toMatchObject({
      code: ErrorCodes.PROVIDER_TIMEOUT,
    });
  });

  it("reports network failures as PROVIDER_UNAVAILABLE", async () => {
    const f = mockFetch([[() => true, new TypeError("fetch failed")]]);
    await expect(fetchJson("https://x.test/a", { provider: "T", fetchImpl: f, retries: 0 })).rejects.toMatchObject({
      code: ErrorCodes.PROVIDER_UNAVAILABLE,
    });
  });

  it("rejects non-JSON bodies", async () => {
    const f = mockFetch([[() => true, { body: "<html>oops</html>" }]]);
    await expect(fetchJson("https://x.test/a", { provider: "T", fetchImpl: f })).rejects.toMatchObject({ code: ErrorCodes.PROVIDER_BAD_RESPONSE });
  });
});
