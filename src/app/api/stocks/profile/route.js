import { withApi } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { symbolQuerySchema, paramsToObject } from "@/lib/validation/schemas";
import { getMarketDataServiceForUser } from "@/lib/market-data/service";

// GET /api/stocks/profile?symbol=INFY&exchange=NSE
export const GET = withApi("stocks.profile", async (request) => {
  const user = await requireUser();
  await enforceRateLimit(user.id, "marketData");
  const { symbol, exchange } = symbolQuerySchema.parse(paramsToObject(request.nextUrl.searchParams));
  const service = await getMarketDataServiceForUser(user.id);
  return { profile: await service.getProfile(symbol, exchange) };
});
