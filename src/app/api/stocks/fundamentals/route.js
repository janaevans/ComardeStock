import { withApi } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { symbolQuerySchema, paramsToObject } from "@/lib/validation/schemas";
import { getMarketDataServiceForUser } from "@/lib/market-data/service";

// GET /api/stocks/fundamentals?symbol=INFY&exchange=NSE
// Uses several provider calls, so the UI loads it on demand.
export const GET = withApi("stocks.fundamentals", async (request) => {
  const user = await requireUser();
  await enforceRateLimit(user.id, "marketData");
  const { symbol, exchange } = symbolQuerySchema.parse(paramsToObject(request.nextUrl.searchParams));
  const service = await getMarketDataServiceForUser(user.id);
  return { fundamentals: await service.getFundamentals(symbol, exchange) };
});
