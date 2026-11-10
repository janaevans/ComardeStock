import { withApi } from "@/lib/api/handler";
import { EXCHANGE_CODES } from "@/lib/market-data/exchanges";
import { scheduleMarketStatus } from "@/lib/market-data/marketStatus";

// GET /api/market/status — schedule-based status for every supported exchange.
// Needs no provider key, so it is public.
export const GET = withApi("market.status", async () => {
  const now = new Date();
  return {
    asOf: now.toISOString(),
    exchanges: EXCHANGE_CODES.map((code) => scheduleMarketStatus(code, now)),
  };
});
