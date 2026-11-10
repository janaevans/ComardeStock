// Representative Twelve Data payloads (shape per the public docs; values are illustrative test data).

export const tdSearch = {
  data: [
    { symbol: "INFY", instrument_name: "Infosys Limited", exchange: "NSE", mic_code: "XNSE", exchange_timezone: "Asia/Kolkata", instrument_type: "Common Stock", country: "India", currency: "INR" },
    { symbol: "INFY", instrument_name: "Infosys Limited", exchange: "BSE", mic_code: "XBOM", exchange_timezone: "Asia/Kolkata", instrument_type: "Common Stock", country: "India", currency: "INR" },
    { symbol: "INFY", instrument_name: "Infosys Ltd ADR", exchange: "NYSE", mic_code: "XNYS", exchange_timezone: "America/New_York", instrument_type: "Depositary Receipt", country: "United States", currency: "USD" },
    { symbol: "IOY", instrument_name: "Infosys Ltd", exchange: "FSX", mic_code: "XFRA", exchange_timezone: "Europe/Berlin", instrument_type: "Common Stock", country: "Germany", currency: "EUR" },
    { symbol: "INFYBEES", instrument_name: "Some Fund", exchange: "NSE", mic_code: "XNSE", instrument_type: "Mutual Fund", country: "India", currency: "INR" },
  ],
  status: "ok",
};

export const tdQuoteClosed = {
  symbol: "INFY",
  name: "Infosys Limited",
  exchange: "NSE",
  mic_code: "XNSE",
  currency: "INR",
  datetime: "2026-11-09",
  timestamp: 1794182400, // 2026-11-09T00:00:00Z
  open: "1490.00000",
  high: "1512.50000",
  low: "1485.10000",
  close: "1505.25000",
  volume: "5123456",
  previous_close: "1488.00000",
  change: "17.25000",
  percent_change: "1.15927",
  average_volume: "6000000",
  is_market_open: false,
  fifty_two_week: { low: "1305.00000", high: "2006.45000", range: "1305.000000 - 2006.450000" },
};

export function tdSeries(n = 30, start = "2026-01-01") {
  const values = [];
  const d = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < n; i++) {
    const c = 100 + i;
    values.push({
      datetime: d.toISOString().slice(0, 10),
      open: String(c - 1),
      high: String(c + 2),
      low: String(c - 2),
      close: String(c),
      volume: String(1000 + i),
    });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return { meta: { symbol: "INFY", interval: "1day", currency: "INR", exchange: "NSE", mic_code: "XNSE", type: "Common Stock" }, values, status: "ok" };
}

export const tdStatistics = {
  meta: { symbol: "INFY", name: "Infosys Limited", currency: "INR", exchange: "NSE" },
  statistics: {
    valuations_metrics: { market_capitalization: 6250000000000, trailing_pe: 22.5, forward_pe: 21.1, price_to_book_mrq: 7.2 },
    financials: {
      most_recent_quarter: "2026-09-30",
      profit_margin: 0.17,
      operating_margin: 0.21,
      return_on_equity_ttm: 0.31,
      income_statement: { revenue_ttm: 1600000000000, net_income_to_common_ttm: 270000000000, diluted_eps_ttm: 65.1, quarterly_revenue_growth: 0.06, quarterly_earnings_growth_yoy: 0.04 },
      balance_sheet: { total_cash_mrq: 300000000000, total_debt_mrq: 90000000000, total_debt_to_equity_mrq: 10.2 },
      cash_flow: { operating_cash_flow_ttm: 330000000000, levered_free_cash_flow_ttm: 250000000000 },
    },
    stock_price_summary: { beta: 0.62 },
  },
};

export const tdIncome = {
  income_statement: [
    { fiscal_date: "2026-03-31", year: 2026, sales: 1580000000000, gross_profit: 480000000000, operating_income: 330000000000, net_income: 265000000000, eps_diluted: 63.9 },
    { fiscal_date: "2025-03-31", year: 2025, sales: 1530000000000, gross_profit: 460000000000, operating_income: 320000000000, net_income: 262000000000, eps_diluted: 63.1 },
  ],
};

export const tdError = (code, message) => ({ code, message, status: "error" });
