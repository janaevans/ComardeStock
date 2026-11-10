"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { formatDateTime } from "@/lib/format";
import { Panel, EmptyState, ButtonLink, Notice } from "@/components/ui";

export function WatchlistTable({ initialItems }) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState("");

  async function remove(item) {
    setError("");
    try {
      await apiFetch("/api/watchlist", { method: "DELETE", body: { symbol: item.symbol, exchange: item.exchange } });
      setItems((xs) => xs.filter((x) => !(x.symbol === item.symbol && x.exchange === item.exchange)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Panel bodyClassName="p-0">
      {error && <div className="p-4"><Notice tone="error">{error}</Notice></div>}
      {items.length === 0 ? (
        <EmptyState icon={Star} title="Your watchlist is empty" action={<ButtonLink href="/stocks/search" variant="secondary">Find a stock</ButtonLink>}>
          Use the Watch button on any stock overview page.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <li key={`${i.exchange}:${i.symbol}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <Link href={`/stocks/${i.exchange}/${encodeURIComponent(i.symbol)}`} className="min-w-0 hover:text-accent">
                <p className="truncate text-sm">{i.companyName}</p>
                <p className="num text-xs text-muted">{i.symbol} · {i.exchange}{i.currency ? ` · ${i.currency}` : ""} · added {formatDateTime(i.createdAt)}</p>
              </Link>
              <button onClick={() => remove(i)} className="rounded-md p-1.5 text-muted hover:bg-panel-2 hover:text-bear" aria-label={`Remove ${i.symbol} from watchlist`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
