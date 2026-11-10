import { withApi } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { searchQuerySchema, paramsToObject } from "@/lib/validation/schemas";
import { getMarketDataServiceForUser } from "@/lib/market-data/service";

// GET /api/stocks/search?q=infosys&exchange=NSE
export const GET = withApi("stocks.search", async (request) => {
  const user = await requireUser();
  await enforceRateLimit(user.id, "search");
  const { q, exchange } = searchQuerySchema.parse(paramsToObject(request.nextUrl.searchParams));
  const service = await getMarketDataServiceForUser(user.id);
  return service.searchSymbols(q, { exchange });
});
