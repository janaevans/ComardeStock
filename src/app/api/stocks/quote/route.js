import { withApi } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { symbolQuerySchema, paramsToObject } from "@/lib/validation/schemas";
import { getMarketDataServiceForUser } from "@/lib/market-data/service";

// GET /api/stocks/quote?symbol=INFY&exchange=NSE
export const GET = withApi("stocks.quote", async (request) => {
  const user = await requireUser();
  await enforceRateLimit(user.id, "marketData");
  const { symbol, exchange } = symbolQuerySchema.parse(paramsToObject(request.nextUrl.searchParams));
  const service = await getMarketDataServiceForUser(user.id);
  const quote = await service.getQuote(symbol, exchange);
  return { quote, marketStatus: service.getMarketStatus(exchange) };
});
