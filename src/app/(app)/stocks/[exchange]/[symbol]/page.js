import { notFound, redirect } from "next/navigation";
import { symbolQuerySchema } from "@/lib/validation/schemas";
import { getExchange } from "@/lib/market-data/exchanges";
import { getCurrentUser } from "@/lib/auth/session";
import { isOnWatchlist } from "@/lib/db/watchlist";
import { StockOverview } from "./StockOverview";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { symbol, exchange } = await params;
  return { title: `${decodeURIComponent(symbol).toUpperCase()} · ${decodeURIComponent(exchange).toUpperCase()}` };
}

export default async function StockPage({ params }) {
  const raw = await params;
  const parsed = symbolQuerySchema.safeParse({ symbol: decodeURIComponent(raw.symbol), exchange: decodeURIComponent(raw.exchange) });
  if (!parsed.success) notFound();
  const { symbol, exchange } = parsed.data;

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const ex = getExchange(exchange);
  const watched = await isOnWatchlist(user.id, symbol, exchange);

  return (
    <StockOverview
      symbol={symbol}
      exchange={exchange}
      exchangeName={ex.name}
      timeZone={ex.timezone}
      defaultCurrency={ex.currency}
      initiallyWatched={watched}
    />
  );
}
