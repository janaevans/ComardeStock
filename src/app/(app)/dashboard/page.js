import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Bookmark, Star, History, CheckCircle2, XCircle, Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { listAnalyses, listRecentStocks } from "@/lib/db/analyses";
import { listWatchlist } from "@/lib/db/watchlist";
import { getProviderStatus } from "@/lib/providers/status";
import { EXCHANGE_CODES } from "@/lib/market-data/exchanges";
import { scheduleMarketStatus } from "@/lib/market-data/marketStatus";
import { formatDateTime } from "@/lib/format";
import { Panel, PageHeader, EmptyState, Badge, Notice } from "@/components/ui";
import { StockSearchBox } from "@/components/StockSearchBox";
import { AnalysisStatusBadge } from "@/components/AnalysisStatusBadge";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const stockHref = (exchange, symbol) => `/stocks/${encodeURIComponent(exchange)}/${encodeURIComponent(symbol)}`;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [recent, saved, history, watchlist, providers] = await Promise.all([
    listRecentStocks(user.id, 8),
    listAnalyses(user.id, { savedOnly: true, take: 6 }),
    listAnalyses(user.id, { take: 8 }),
    listWatchlist(user.id),
    getProviderStatus(user.id),
  ]);
  const now = new Date();
  const markets = EXCHANGE_CODES.map((c) => scheduleMarketStatus(c, now));
  const marketReady = providers.some((p) => p.kind === "market" && p.configured);
  const aiReady = providers.filter((p) => p.kind === "ai" && p.configured).length;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Search a company, confirm the listing, then start an analysis." />

      {!marketReady && (
        <div className="mb-4">
          <Notice
            tone="warn"
            title="Connect a market-data provider to start"
            action={
              <Link href="/settings/providers" className="text-sm text-accent hover:underline">
                Add an API key
              </Link>
            }
          >
            Search and prices need a Twelve Data or Alpha Vantage API key. Keys are encrypted and stay on the server.
          </Notice>
        </div>
      )}

      <Panel title="Search stocks" className="mb-4">
        <StockSearchBox />
        <p className="mt-2 text-xs text-muted">If several companies match, you will be asked to confirm the correct one and its exchange.</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Analysis history" actions={<Link href="/history" className="text-xs text-accent hover:underline">View all</Link>}>
            {history.length === 0 ? (
              <EmptyState icon={History} title="No analyses yet">
                Your analyses will appear here, and you can reopen any of them later.
              </EmptyState>
            ) : (
              <AnalysisTable rows={history} />
            )}
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Recently analysed">
              {recent.length === 0 ? (
                <EmptyState icon={Clock} title="Nothing analysed yet" />
              ) : (
                <ul className="divide-y divide-line">
                  {recent.map((r) => (
                    <li key={`${r.exchange}:${r.ticker}`}>
                      <Link href={stockHref(r.exchange, r.ticker)} className="flex items-center justify-between gap-3 py-2 hover:text-accent">
                        <span className="min-w-0 truncate text-sm">{r.companyName}</span>
                        <span className="num shrink-0 text-xs text-muted">
                          {r.ticker} · {r.exchange}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Saved analyses">
              {saved.length === 0 ? (
                <EmptyState icon={Bookmark} title="No saved analyses">
                  Save an analysis from its report page to pin it here.
                </EmptyState>
              ) : (
                <AnalysisTable rows={saved} compact />
              )}
            </Panel>
          </div>
        </div>

        <div className="space-y-4">
          <Panel title="Market status">
            <ul className="space-y-2">
              {markets.map((m) => (
                <li key={m.exchange} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${m.isOpen ? "bg-bull" : "bg-muted/60"}`} aria-hidden />
                    <span className="font-medium text-ink">{m.exchange}</span>
                  </span>
                  <span className="num text-xs text-muted">
                    {m.isOpen ? "Open" : "Closed"} · {m.regularHours}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Regular hours in each exchange&apos;s local time. Holidays are not reflected.</p>
          </Panel>

          <Panel title="API configuration" actions={<Link href="/settings/providers" className="text-muted hover:text-ink" aria-label="Provider settings"><Settings className="h-4 w-4" /></Link>}>
            <ul className="space-y-2">
              {providers.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    {p.configured ? <CheckCircle2 className="h-4 w-4 text-bull" aria-hidden /> : <XCircle className="h-4 w-4 text-muted" aria-hidden />}
                    {p.label}
                  </span>
                  <Badge tone={p.configured ? "good" : "neutral"}>{p.source === "user" ? "your key" : p.source === "server" ? "server key" : "not set"}</Badge>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              {aiReady === 0 ? "AI agents need an Anthropic or OpenAI key (used from Phase 3)." : `${aiReady} AI provider${aiReady > 1 ? "s" : ""} ready.`}
            </p>
          </Panel>

          <Panel title="Watchlist" actions={<Link href="/watchlist" className="text-xs text-accent hover:underline">Manage</Link>}>
            {watchlist.length === 0 ? (
              <EmptyState icon={Star} title="Watchlist is empty">Add stocks from their overview page.</EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {watchlist.slice(0, 8).map((w) => (
                  <li key={`${w.exchange}:${w.symbol}`}>
                    <Link href={stockHref(w.exchange, w.symbol)} className="flex items-center justify-between gap-3 py-2 hover:text-accent">
                      <span className="min-w-0 truncate text-sm">{w.companyName}</span>
                      <span className="num shrink-0 text-xs text-muted">
                        {w.symbol} · {w.exchange}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function AnalysisTable({ rows, compact = false }) {
  return (
    <div className="-mx-4 overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
            <th className="px-4 pb-2 font-medium">Company</th>
            <th className="px-2 pb-2 font-medium">Ticker</th>
            <th className="px-2 pb-2 font-medium">Status</th>
            {!compact && <th className="px-4 pb-2 text-right font-medium">Created</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((a) => (
            <tr key={a.id} className="hover:bg-panel-2">
              <td className="max-w-[220px] truncate px-4 py-2">
                <Link href={`/analysis/${a.id}`} className="hover:text-accent">
                  {a.companyName}
                </Link>
              </td>
              <td className="num px-2 py-2 text-xs text-ink-2">
                {a.ticker} · {a.exchange}
              </td>
              <td className="px-2 py-2">
                <AnalysisStatusBadge status={a.status} />
              </td>
              {!compact && <td className="num px-4 py-2 text-right text-xs text-muted">{formatDateTime(a.createdAt.toISOString())}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
