/**
 * Exchanges the application understands, with the identifiers each provider uses.
 *
 * `sessions` are regular trading hours in the exchange's own time zone. They are
 * used only as a fallback for market status when the provider does not report
 * it, and they do not account for holidays or special sessions — the UI says so.
 */
export const EXCHANGES = Object.freeze({
  NSE: {
    code: "NSE",
    name: "National Stock Exchange of India",
    country: "India",
    mic: "XNSE",
    currency: "INR",
    timezone: "Asia/Kolkata",
    sessions: [{ open: "09:15", close: "15:30" }],
    twelveData: { exchange: "NSE" },
    alphaVantage: { suffix: ".NSE", supported: false },
    benchmark: "NIFTY 50",
  },
  BSE: {
    code: "BSE",
    name: "BSE (Bombay Stock Exchange)",
    country: "India",
    mic: "XBOM",
    currency: "INR",
    timezone: "Asia/Kolkata",
    sessions: [{ open: "09:15", close: "15:30" }],
    twelveData: { exchange: "BSE" },
    alphaVantage: { suffix: ".BSE", supported: true },
    benchmark: "S&P BSE SENSEX",
  },
  NASDAQ: {
    code: "NASDAQ",
    name: "Nasdaq",
    country: "United States",
    mic: "XNAS",
    currency: "USD",
    timezone: "America/New_York",
    sessions: [{ open: "09:30", close: "16:00" }],
    twelveData: { exchange: "NASDAQ" },
    alphaVantage: { suffix: "", supported: true },
    benchmark: "NASDAQ Composite",
  },
  NYSE: {
    code: "NYSE",
    name: "New York Stock Exchange",
    country: "United States",
    mic: "XNYS",
    currency: "USD",
    timezone: "America/New_York",
    sessions: [{ open: "09:30", close: "16:00" }],
    twelveData: { exchange: "NYSE" },
    alphaVantage: { suffix: "", supported: true },
    benchmark: "S&P 500",
  },
  LSE: {
    code: "LSE",
    name: "London Stock Exchange",
    country: "United Kingdom",
    mic: "XLON",
    currency: "GBP",
    timezone: "Europe/London",
    sessions: [{ open: "08:00", close: "16:30" }],
    twelveData: { exchange: "LSE" },
    alphaVantage: { suffix: ".LON", supported: true },
    benchmark: "FTSE 100",
  },
});

export const EXCHANGE_CODES = Object.freeze(Object.keys(EXCHANGES));

export function getExchange(code) {
  if (!code) return null;
  return EXCHANGES[String(code).toUpperCase()] ?? null;
}

/** Maps a provider's exchange label or MIC code to our exchange code, if known. */
export function normalizeExchangeCode(value) {
  if (!value) return null;
  const v = String(value).toUpperCase();
  if (EXCHANGES[v]) return v;
  for (const ex of Object.values(EXCHANGES)) if (ex.mic === v) return ex.code;
  const aliases = { BOM: "BSE", XBOM: "BSE", NSI: "NSE", NAS: "NASDAQ", NMS: "NASDAQ", NYQ: "NYSE", LON: "LSE" };
  return aliases[v] ?? null;
}

/** Public, client-safe list for selectors. */
export function listExchanges() {
  return EXCHANGE_CODES.map((code) => {
    const ex = EXCHANGES[code];
    return { code, name: ex.name, country: ex.country, currency: ex.currency, timezone: ex.timezone };
  });
}
