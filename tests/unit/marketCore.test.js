import { describe, it, expect } from "vitest";
import { scheduleMarketStatus, zonedParts } from "@/lib/market-data/marketStatus";
import { classifyQuoteFreshness, FRESHNESS, daysBetween } from "@/lib/market-data/provenance";
import { cleanBars, rangeStartDate, num } from "@/lib/market-data/normalize";
import { normalizeExchangeCode, getExchange } from "@/lib/market-data/exchanges";
import { createTtlCache } from "@/lib/market-data/cache";

describe("market status (schedule)", () => {
  // 2026-11-10 is a Tuesday.
  it("NSE is open at 10:00 IST on a weekday and closed at 16:00", () => {
    expect(scheduleMarketStatus("NSE", new Date("2026-11-10T04:30:00Z")).isOpen).toBe(true); // 10:00 IST
    expect(scheduleMarketStatus("NSE", new Date("2026-11-10T10:30:00Z")).isOpen).toBe(false); // 16:00 IST
    expect(scheduleMarketStatus("NSE", new Date("2026-11-10T03:44:00Z")).isOpen).toBe(false); // 09:14 IST
    expect(scheduleMarketStatus("NSE", new Date("2026-11-10T03:45:00Z")).isOpen).toBe(true); // 09:15 IST
  });
  it("is closed on weekends", () => {
    expect(scheduleMarketStatus("NYSE", new Date("2026-11-14T16:00:00Z")).isOpen).toBe(false); // Saturday
  });
  it("handles US daylight saving correctly", () => {
    // 14:00 UTC = 09:00 EST (closed) in November; 14:00 UTC = 10:00 EDT (open) in July.
    expect(scheduleMarketStatus("NASDAQ", new Date("2026-11-10T14:00:00Z")).isOpen).toBe(false);
    expect(scheduleMarketStatus("NASDAQ", new Date("2026-07-14T14:00:00Z")).isOpen).toBe(true);
  });
  it("always states that holidays are not reflected", () => {
    expect(scheduleMarketStatus("LSE").note).toMatch(/holidays/i);
    expect(scheduleMarketStatus("NOPE")).toBeNull();
  });
  it("computes exchange-local dates", () => {
    expect(zonedParts(new Date("2026-11-10T20:00:00Z"), "Asia/Kolkata").date).toBe("2026-11-11");
  });
});

describe("freshness labelling — never 'live' by default", () => {
  const now = new Date("2026-11-10T05:00:00Z"); // 10:30 IST Tuesday
  it("intraday price while market is open is 'delayed' unless declared real-time", () => {
    const r = classifyQuoteFreshness({ exchange: "NSE", isMarketOpen: true, dataDate: "2026-11-10 10:29:00", now, env: {} });
    expect(r.freshness).toBe(FRESHNESS.DELAYED);
    const rt = classifyQuoteFreshness({ exchange: "NSE", isMarketOpen: true, dataDate: "2026-11-10", now, env: { MARKET_DATA_REALTIME_EXCHANGES: "nse, bse" } });
    expect(rt.freshness).toBe(FRESHNESS.REAL_TIME);
  });
  it("closed market data is end-of-day; old data is stale", () => {
    expect(classifyQuoteFreshness({ exchange: "NSE", isMarketOpen: false, dataDate: "2026-11-09", now, env: {} })).toMatchObject({ freshness: "end-of-day", stale: false });
    expect(classifyQuoteFreshness({ exchange: "NSE", isMarketOpen: false, dataDate: "2026-10-30", now, env: {} })).toMatchObject({ freshness: "end-of-day", stale: true });
  });
  it("open-market flag with yesterday's data is not called intraday", () => {
    expect(classifyQuoteFreshness({ exchange: "NSE", isMarketOpen: true, dataDate: "2026-11-09", now, env: {} }).freshness).toBe("end-of-day");
  });
  it("missing as-of date is unknown and stale", () => {
    expect(classifyQuoteFreshness({ exchange: "NSE", isMarketOpen: true, dataDate: null, now, env: {} })).toMatchObject({ freshness: "unknown", stale: true });
  });
  it("daysBetween", () => expect(daysBetween("2026-11-01", "2026-11-10")).toBe(9));
});

describe("normalization", () => {
  it("parses provider numbers", () => {
    expect(num("1,234.5")).toBe(1234.5);
    expect(num("0.57%")).toBe(0.57);
    expect(num("None")).toBeNull();
    expect(num("")).toBeNull();
    expect(num("abc")).toBeNull();
    expect(num(0)).toBe(0);
  });
  it("cleans, de-duplicates and sorts bars, reporting dropped rows", () => {
    const { bars, dropped } = cleanBars([
      { date: "2026-01-03", open: 1, high: 2, low: 1, close: 2, volume: 1 },
      { date: "2026-01-01", open: 1, high: 2, low: 1, close: 1.5, volume: 1 },
      { date: "2026-01-01", open: 1, high: 2, low: 1, close: 1.5, volume: 1 },
      { date: "2026-01-02", open: null, high: 2, low: 1, close: 1, volume: 1 },
      { date: "2026-01-04", open: 1, high: 1, low: 2, close: 1, volume: 1 },
    ]);
    expect(bars.map((b) => b.date)).toEqual(["2026-01-01", "2026-01-03"]);
    expect(dropped).toBe(3);
  });
  it("range start dates", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    expect(rangeStartDate("1M", now)).toBe("2026-10-10");
    expect(rangeStartDate("5Y", now)).toBe("2021-11-10");
    expect(() => rangeStartDate("2W", now)).toThrow();
  });
});

describe("exchanges", () => {
  it("maps MIC codes and aliases", () => {
    expect(normalizeExchangeCode("XNSE")).toBe("NSE");
    expect(normalizeExchangeCode("xbom")).toBe("BSE");
    expect(normalizeExchangeCode("NASDAQ")).toBe("NASDAQ");
    expect(normalizeExchangeCode("XFRA")).toBeNull();
    expect(getExchange("nse").currency).toBe("INR");
  });
});

describe("ttl cache", () => {
  it("expires entries", () => {
    const c = createTtlCache();
    c.set("a", 1, 1000, 0);
    expect(c.get("a", 999)).toBe(1);
    expect(c.get("a", 1000)).toBeUndefined();
  });
  it("evicts oldest at capacity", () => {
    const c = createTtlCache({ maxEntries: 2 });
    c.set("a", 1, 1e9);
    c.set("b", 2, 1e9);
    c.set("c", 3, 1e9);
    expect(c.get("a")).toBeUndefined();
    expect(c.size).toBe(2);
  });
});
