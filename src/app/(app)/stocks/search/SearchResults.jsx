"use client";

import Link from "next/link";
import { SearchX, ChevronRight } from "lucide-react";
import { useApiResource } from "@/lib/client/useApiResource";
import { Panel, Spinner, EmptyState, Badge, Notice } from "@/components/ui";
import { ApiErrorNotice } from "@/components/ApiErrorNotice";

const stockHref = (exchange, symbol) => `/stocks/${encodeURIComponent(exchange)}/${encodeURIComponent(symbol)}`;

export function SearchResults({ q, exchange }) {
  const params = new URLSearchParams({ q });
  if (exchange && exchange !== "ALL") params.set("exchange", exchange);
  const state = useApiResource(`/api/stocks/search?${params}`);
  const load = state.reload;

  if (state.loading || (!state.data && !state.error)) {
    return (
      <Panel>
        <Spinner label={`Searching for “${q}”…`} />
      </Panel>
    );
  }
  if (state.error) return <ApiErrorNotice error={state.error} onRetry={() => load()} />;

  const { results, source } = state.data;
  const supported = results.filter((r) => r.supported);
  const unsupported = results.filter((r) => !r.supported);

  if (results.length === 0) {
    return (
      <Panel>
        <EmptyState icon={SearchX} title={`No listings found for “${q}”`}>
          Try the ticker symbol (e.g. TATAMOTORS, RELIANCE, AAPL), a shorter company name, or a different exchange.
        </EmptyState>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Notice tone="info" title={supported.length === 1 ? "One match found — please confirm it" : `${supported.length} matching listings`}>
        Select the correct company and exchange. Nothing is analysed until you confirm. Results from {source}.
      </Notice>

      <Panel title="Matches" bodyClassName="p-0">
        <ul className="divide-y divide-line">
          {supported.map((r) => (
            <li key={`${r.symbol}|${r.exchangeLabel}|${r.mic}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{r.name || r.symbol}</p>
                <p className="num mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span className="text-ink-2">{r.symbol}</span>
                  <span>{r.exchangeLabel}</span>
                  {r.country && <span>{r.country}</span>}
                  {r.currency && <span>{r.currency}</span>}
                  {r.type && <Badge>{r.type}</Badge>}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {r.exchange ? (
                  <Link
                    href={stockHref(r.exchange, r.symbol)}
                    className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-panel-2 px-3 py-1.5 text-sm text-ink hover:border-accent"
                  >
                    Select {r.exchange}
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : (
                  r.exchangeOptions.map((ex) => (
                    <Link
                      key={ex}
                      href={stockHref(ex, r.symbol)}
                      className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-panel-2 px-3 py-1.5 text-sm text-ink hover:border-accent"
                      title="The provider did not say which US exchange lists this stock. Choose the correct one."
                    >
                      Listed on {ex}
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                  ))
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {unsupported.length > 0 && (
        <Panel title={`Other listings (${unsupported.length}) — exchange not supported`} bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {unsupported.slice(0, 10).map((r) => (
              <li key={`${r.symbol}|${r.exchangeLabel}|${r.mic}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-muted">
                <span className="min-w-0 truncate">{r.name || r.symbol}</span>
                <span className="num shrink-0 text-xs">
                  {r.symbol} · {r.exchangeLabel}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
