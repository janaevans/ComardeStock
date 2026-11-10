// Representative Alpha Vantage payloads (shape per the public docs; values are illustrative test data).

export const avSearch = {
  bestMatches: [
    { "1. symbol": "NVDA", "2. name": "NVIDIA Corp", "3. type": "Equity", "4. region": "United States", "5. marketOpen": "09:30", "6. marketClose": "16:00", "7. timezone": "UTC-04", "8. currency": "USD", "9. matchScore": "1.0000" },
    { "1. symbol": "RELIANCE.BSE", "2. name": "Reliance Industries Ltd", "3. type": "Equity", "4. region": "India/Bombay", "5. marketOpen": "09:15", "6. marketClose": "15:30", "7. timezone": "UTC+5.5", "8. currency": "INR", "9. matchScore": "0.8000" },
    { "1. symbol": "NVD.DEX", "2. name": "NVIDIA Corp", "3. type": "Equity", "4. region": "XETRA", "8. currency": "EUR", "9. matchScore": "0.6" },
    { "1. symbol": "NVDL", "2. name": "Some Mutual Fund", "3. type": "Mutual Fund", "4. region": "United States", "8. currency": "USD" },
  ],
};

export const avGlobalQuote = {
  "Global Quote": {
    "01. symbol": "RELIANCE.BSE",
    "02. open": "2890.0000",
    "03. high": "2915.5000",
    "04. low": "2880.0500",
    "05. price": "2901.7500",
    "06. volume": "312345",
    "07. latest trading day": "2026-11-09",
    "08. previous close": "2885.2000",
    "09. change": "16.5500",
    "10. change percent": "0.5736%",
  },
};

export function avDaily(n = 10, start = "2026-10-01") {
  const series = {};
  const d = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < n; i++) {
    const c = 50 + i;
    series[d.toISOString().slice(0, 10)] = { "1. open": String(c), "2. high": String(c + 1), "3. low": String(c - 1), "4. close": String(c), "5. volume": "100" };
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return { "Meta Data": { "2. Symbol": "IBM" }, "Time Series (Daily)": series };
}

export const avRateLimitNote = {
  Information: "We have detected your API key as XXXX and our standard API rate limit is 25 requests per day.",
};
export const avPremium = { Information: "Thank you for using Alpha Vantage! This is a premium endpoint." };
export const avErrorMessage = { "Error Message": "Invalid API call. Please retry or visit the documentation." };
