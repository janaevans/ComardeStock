import { describe, it, expect } from "vitest";
import {
  tickerSchema,
  searchQuerySchema,
  symbolQuerySchema,
  historyQuerySchema,
  providerKeySchema,
  createAnalysisSchema,
} from "@/lib/validation/schemas";

describe("ticker validation", () => {
  it.each(["INFY", "tatamotors", "BRK.B", "M&M", "BAJAJ-AUTO", "500325"])("accepts %s", (t) => {
    expect(tickerSchema.safeParse(t).success).toBe(true);
  });
  it("upper-cases tickers", () => expect(tickerSchema.parse("infy")).toBe("INFY"));
  it.each(["", " ", "A".repeat(21), "INFY;DROP", "../etc", "<script>", ".INFY", "IN FY"])("rejects %j", (t) => {
    expect(tickerSchema.safeParse(t).success).toBe(false);
  });
});

describe("search query", () => {
  it("accepts company names including Indian names and ampersands", () => {
    expect(searchQuerySchema.parse({ q: "Tata Motors", exchange: "nse" })).toEqual({ q: "Tata Motors", exchange: "NSE" });
    expect(searchQuerySchema.parse({ q: "Mahindra & Mahindra" }).exchange).toBeNull();
    expect(searchQuerySchema.parse({ q: "Apple", exchange: "ALL" }).exchange).toBeNull();
  });
  it("rejects empty, overlong and unsupported input", () => {
    expect(searchQuerySchema.safeParse({ q: "" }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: "x".repeat(81) }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: "a<b>" }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: "Apple", exchange: "TSE" }).success).toBe(false);
  });
});

describe("symbol and history queries", () => {
  it("requires a supported exchange", () => {
    expect(symbolQuerySchema.safeParse({ symbol: "INFY", exchange: "XYZ" }).success).toBe(false);
    expect(symbolQuerySchema.parse({ symbol: "infy", exchange: "bse" })).toEqual({ symbol: "INFY", exchange: "BSE" });
  });
  it("defaults history range to 1Y and rejects unknown ranges", () => {
    expect(historyQuerySchema.parse({ symbol: "AAPL", exchange: "NASDAQ" }).range).toBe("1Y");
    expect(historyQuerySchema.safeParse({ symbol: "AAPL", exchange: "NASDAQ", range: "10Y" }).success).toBe(false);
  });
});

describe("provider key", () => {
  it("rejects keys with whitespace or too short", () => {
    expect(providerKeySchema.safeParse({ provider: "OPENAI", apiKey: "short" }).success).toBe(false);
    expect(providerKeySchema.safeParse({ provider: "OPENAI", apiKey: "has space inside" }).success).toBe(false);
    expect(providerKeySchema.safeParse({ provider: "NOPE", apiKey: "abcdefghij" }).success).toBe(false);
  });
  it("accepts a valid key and blank model", () => {
    const v = providerKeySchema.parse({ provider: "ANTHROPIC", apiKey: "  sk-ant-abcdef123456  ", selectedModel: "" });
    expect(v).toEqual({ provider: "ANTHROPIC", apiKey: "sk-ant-abcdef123456", selectedModel: undefined });
  });
});

describe("analysis settings", () => {
  const base = { symbol: "INFY", exchange: "NSE", companyName: "Infosys" };
  it("allows skipping all optional settings and assumes nothing", () => {
    expect(createAnalysisSchema.parse(base).settings).toEqual({});
  });
  it("rejects a max loss above the investment amount", () => {
    const r = createAnalysisSchema.safeParse({ ...base, settings: { investmentAmount: 1000, maxAcceptableLoss: 2000 } });
    expect(r.success).toBe(false);
  });
  it("rejects non-positive amounts and unknown enums", () => {
    expect(createAnalysisSchema.safeParse({ ...base, settings: { investmentAmount: -5 } }).success).toBe(false);
    expect(createAnalysisSchema.safeParse({ ...base, settings: { horizon: "forever" } }).success).toBe(false);
  });
});
