"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { listExchanges } from "@/lib/market-data/exchanges";

const EXCHANGES = listExchanges();

/** Company/ticker input + exchange selector. Navigates to the search results page. */
export function StockSearchBox({ initialQuery = "", initialExchange = "ALL", autoFocus = false }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [exchange, setExchange] = useState(initialExchange || "ALL");

  function onSubmit(e) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    const params = new URLSearchParams({ q: query });
    if (exchange && exchange !== "ALL") params.set("exchange", exchange);
    router.push(`/stocks/search?${params}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row" role="search">
      <label className="relative flex-1">
        <span className="sr-only">Company name or ticker</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Company name or ticker — e.g. Reliance Industries, INFY, NVDA"
          maxLength={80}
          autoFocus={autoFocus}
          className="w-full rounded-md border border-line-strong bg-bg py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
        />
      </label>
      <label>
        <span className="sr-only">Exchange</span>
        <select
          value={exchange}
          onChange={(e) => setExchange(e.target.value)}
          className="w-full rounded-md border border-line-strong bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-accent sm:w-56"
        >
          <option value="ALL">All supported exchanges</option>
          {EXCHANGES.map((ex) => (
            <option key={ex.code} value={ex.code}>
              {ex.code} — {ex.country}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={!q.trim()}
        className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink hover:brightness-110 disabled:opacity-50"
      >
        Search
      </button>
    </form>
  );
}
