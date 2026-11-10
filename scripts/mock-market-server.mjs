// Local mock of the Twelve Data API for offline end-to-end checks.
// Usage: node scripts/mock-market-server.mjs  (listens on :4010)
// Then run the app with TWELVE_DATA_BASE_URL=http://localhost:4010 and any TWELVE_DATA_API_KEY.
// Returns clearly fake data — never use it for real analysis.
import http from "node:http";
import { tdSearch, tdQuoteClosed, tdSeries, tdStatistics, tdIncome, tdError } from "../tests/fixtures/twelveData.js";

const port = Number(process.env.MOCK_PORT || 4010);
http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const send = (body, status = 200) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    const sym = url.searchParams.get("symbol");
    if (sym === "ZZZZ") return send(tdError(404, "**symbol** not found"), 404);
    switch (url.pathname) {
      case "/symbol_search": return send(tdSearch);
      case "/quote": return send({ ...tdQuoteClosed, symbol: sym });
      case "/time_series": return send(tdSeries(250, "2025-11-10"));
      case "/profile": return send({ symbol: sym, name: "Infosys Limited", sector: "Technology", industry: "IT Services", country: "India", employees: 300000, description: "Mock profile for local testing." });
      case "/statistics": return send(tdStatistics);
      case "/income_statement": return send(tdIncome);
      case "/balance_sheet": return send(tdError(403, "/balance_sheet is available exclusively with grow or pro plans"));
      case "/cash_flow": return send(tdError(403, "upgrade your plan"));
      case "/earnings": return send({ earnings: [] });
      default: return send(tdError(404, "not found"), 404);
    }
  })
  .listen(port, () => console.log(`mock market server on :${port}`));
