import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listWatchlist } from "@/lib/db/watchlist";
import { PageHeader } from "@/components/ui";
import { WatchlistTable } from "./WatchlistTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Watchlist" };

export default async function WatchlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const items = await listWatchlist(user.id);
  return (
    <>
      <PageHeader title="Watchlist" subtitle="Saved stocks. Prices load when you open a stock, to conserve data-provider credits." />
      <WatchlistTable initialItems={items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }))} />
    </>
  );
}
