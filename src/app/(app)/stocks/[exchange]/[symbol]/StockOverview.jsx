"use client";

import { useState } from "react";
import { Star, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/useApiResource";
import { formatPrice, formatPercent, formatCompact, formatDateTime, changeTone } from "@/lib/format";
import { Panel, Spinner, Stat, Badge, Button } from "@/components/ui";
import { ApiErrorNotice } from "@/components/ApiErrorNotice";
import { DataProvenance } from "@/components/DataProvenance";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { FundamentalsPanel } from "./FundamentalsPanel";
import { AnalyzePanel } from "./AnalyzePanel";

const useApi = useApiResource;

export function StockOverview({ symbol, exchange, exchangeName, timeZone, defaultCurrency, initiallyWatched }) {
  const qs = new URLSearchParams({ symbol, exchange }).toString();
  const quoteReq = useApi(`/api/stocks/quote?${qs}`);
  const profileReq = useApi(`/api/stocks/profile?${qs}`);

  const quote = quoteReq.data?.quote;
  const status = quoteReq.data?.marketStatus;
  const profile = profileReq.data?.profile;
  const companyName = profile?.name || quote?.name || symbol;
  const currency = quote?.currency || defaultCurrency;

  return (
    <div className="space-y-4">
      {/* Identity + latest price */}
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{companyName}</h1>
              <WatchlistToggle symbol={symbol} exchange={exchange} companyName={companyName} currency={currency} initiallyWatched={initiallyWatched} />
            </div>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
              <span className="num text-ink-2">{symbol}</span>
              <span>{exchange} — {exchangeName}</span>
              <span>{currency}</span>
              {profile?.sector && <span>{profile.sector}</span>}
              {profile?.industry && <span>{profile.industry}</span>}
            </p>
          </div>
          {quote && (
            <div className="text-left lg:text-right">
              <p className="num text-3xl font-semibold text-ink">{formatPrice(quote.price, currency)}</p>
              <p className={`num text-sm ${changeTone(quote.change)}`}>
                {quote.change === null ? "—" : `${quote.change > 0 ? "+" : ""}${quote.change.toFixed(2)}`} ({formatPercent(quote.changePercent, { signed: true })})
              </p>
              <p className="mt-1 text-xs text-muted">Latest available price · {formatDateTime(quote.provenance.dataDate, timeZone)}</p>
            </div>
          )}
        </div>

        {quoteReq.loading && !quote && <div className="mt-4"><Spinner label="Fetching latest price…" /></div>}
        {quoteReq.error && <div className="mt-4"><ApiErrorNotice error={quoteReq.error} onRetry={quoteReq.reload} /></div>}

        {quote && (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4 lg:grid-cols-8">
              <Stat label="Open" value={formatPrice(quote.open, currency)} />
              <Stat label="High" value={formatPrice(quote.high, currency)} />
              <Stat label="Low" value={formatPrice(quote.low, currency)} />
              <Stat label="Prev. close" value={formatPrice(quote.previousClose, currency)} />
              <Stat label="Volume" value={formatCompact(quote.volume)} />
              <Stat label="Avg. volume" value={formatCompact(quote.averageVolume)} />
              <Stat label="52w low" value={formatPrice(quote.fiftyTwoWeek.low, currency)} />
              <Stat label="52w high" value={formatPrice(quote.fiftyTwoWeek.high, currency)} />
            </dl>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
              <Badge tone={quote.isMarketOpen ? "good" : "neutral"}>{quote.isMarketOpen ? "market open" : "market closed"}</Badge>
              <span>{quote.marketStatusBasis === "provider" ? "Status reported by provider." : status?.note}</span>
              <button onClick={quoteReq.reload} className="ml-auto inline-flex items-center gap-1 text-muted hover:text-ink" aria-label="Refresh price">
                <RefreshCw className={`h-3.5 w-3.5 ${quoteReq.loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
            <DataProvenance provenance={quote.provenance} timeZone={timeZone} />
          </>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <PriceHistoryChart symbol={symbol} exchange={exchange} timeZone={timeZone} />
          <FundamentalsPanel symbol={symbol} exchange={exchange} />
        </div>
        <div className="space-y-4">
          <AnalyzePanel symbol={symbol} exchange={exchange} companyName={companyName} currency={currency} ready={Boolean(quote)} />
          <Panel title="Company profile">
            {profileReq.loading && !profile && <Spinner label="Loading profile…" />}
            {profileReq.error && <ApiErrorNotice error={profileReq.error} onRetry={profileReq.reload} />}
            {profile && (
              <>
                <dl className="grid grid-cols-2 gap-3">
                  <Stat label="Sector" value={profile.sector || "—"} />
                  <Stat label="Industry" value={profile.industry || "—"} />
                  <Stat label="Country" value={profile.country || "—"} />
                  <Stat label="Employees" value={profile.employees ? profile.employees.toLocaleString("en-US") : "—"} />
                </dl>
                {profile.description && <p className="mt-3 line-clamp-6 text-sm leading-relaxed text-ink-2">{profile.description}</p>}
                <DataProvenance provenance={profile.provenance} compact />
              </>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function WatchlistToggle({ symbol, exchange, companyName, currency, initiallyWatched }) {
  const [watched, setWatched] = useState(initiallyWatched);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      await apiFetch("/api/watchlist", {
        method: watched ? "DELETE" : "POST",
        body: watched ? { symbol, exchange } : { symbol, exchange, companyName, currency: currency || null },
      });
      setWatched(!watched);
    } catch {
      /* keep previous state; the button simply does not toggle */
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="ghost" onClick={toggle} disabled={busy} className="px-2 py-1" aria-pressed={watched} title={watched ? "Remove from watchlist" : "Add to watchlist"}>
      <Star className={`h-4 w-4 ${watched ? "fill-judge text-judge" : ""}`} aria-hidden />
      <span className="text-xs">{watched ? "Watching" : "Watch"}</span>
    </Button>
  );
}
