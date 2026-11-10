"use client";

import { useEffect, useState } from "react";

/**
 * Compact market-status strip. Uses the schedule-based /api/market/status
 * (regular hours only, holidays not reflected — stated in the tooltip).
 */
export function MarketStatusBar() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/market/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => active && d && setData(d))
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (!data) return <div className="h-5" aria-hidden />;
  return (
    <ul className="flex items-center gap-3 overflow-x-auto text-[11px] text-muted" aria-label="Market status">
      {data.exchanges.map((ex) => (
        <li key={ex.exchange} className="flex shrink-0 items-center gap-1.5" title={`${ex.regularHours} ${ex.timezone}. ${ex.note}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${ex.isOpen ? "bg-bull" : "bg-muted/60"}`} aria-hidden />
          <span className="font-medium text-ink-2">{ex.exchange}</span>
          <span>{ex.isOpen ? "open" : "closed"}</span>
        </li>
      ))}
    </ul>
  );
}
