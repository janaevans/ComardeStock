import { withApi } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { historyQuerySchema, paramsToObject } from "@/lib/validation/schemas";
import { getMarketDataServiceForUser } from "@/lib/market-data/service";

// GET /api/stocks/history?symbol=INFY&exchange=NSE&range=1Y
export const GET = withApi("stocks.history", async (request) => {
  const user = await requireUser();
  await enforceRateLimit(user.id, "marketData");
  const { symbol, exchange, range } = historyQuerySchema.parse(paramsToObject(request.nextUrl.searchParams));
  const service = await getMarketDataServiceForUser(user.id);
  return { history: await service.getHistory(symbol, exchange, range) };
});
