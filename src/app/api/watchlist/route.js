import { withApi, readJson, assertSameOrigin } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { watchlistAddSchema, watchlistRemoveSchema } from "@/lib/validation/schemas";
import { listWatchlist, addToWatchlist, removeFromWatchlist } from "@/lib/db/watchlist";

export const GET = withApi("watchlist.list", async () => {
  const user = await requireUser();
  return { items: await listWatchlist(user.id) };
});

export const POST = withApi("watchlist.add", async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  await enforceRateLimit(user.id, "general");
  const input = watchlistAddSchema.parse(await readJson(request));
  return { item: await addToWatchlist(user.id, input) };
});

export const DELETE = withApi("watchlist.remove", async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  await enforceRateLimit(user.id, "general");
  const input = watchlistRemoveSchema.parse(await readJson(request));
  return { removed: await removeFromWatchlist(user.id, input) };
});
