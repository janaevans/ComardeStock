"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useApiResource } from "@/lib/client/useApiResource";
import { formatPrice, formatCompact, formatDateTime } from "@/lib/format";
import { Panel, Spinner, Badge } from "./ui";
import { ApiErrorNotice } from "./ApiErrorNotice";
import { DataProvenance } from "./DataProvenance";

const RANGES = ["1M", "3M", "6M", "1Y", "3Y", "5Y"];

/**
 * Historical daily closes + volume. Price and volume are two charts sharing an
 * x-axis — never one chart with two y-scales. Historical data only: nothing
 * here projects future prices.
 */
export function PriceHistoryChart({ symbol, exchange, timeZone }) {
  const [range, setRange] = useState("1Y");
  const req = useApiResource(`/api/stocks/history?${new URLSearchParams({ symbol, exchange, range })}`);
  const state = req;
  const load = req.reload;
  const history = req.data?.history;
  const bars = useMemo(() => history?.bars ?? [], [history]);
  const currency = history?.currency;
  const changePct = bars.length > 1 ? ((bars.at(-1).close - bars[0].close) / bars[0].close) * 100 : null;
  const tickFmt = (d) => {
    const dt = new Date(`${d}T00:00:00Z`);
    return ["3Y", "5Y"].includes(range)
      ? dt.toLocaleDateString("en-GB", { year: "numeric", month: "short", timeZone: "UTC" })
      : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
  };

  return (
    <Panel
      title="Price history (daily close)"
      actions={
        <div role="group" aria-label="Time range" className="flex rounded-md border border-line-strong p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              aria-pressed={r === range}
              className={`num rounded px-2 py-0.5 text-xs ${r === range ? "bg-panel-2 text-ink" : "text-muted hover:text-ink"}`}
            >
              {r}
            </button>
          ))}
        </div>
      }
    >
      {state.error && <ApiErrorNotice error={state.error} onRetry={() => load()} />}
      {state.loading && !history && <div className="flex h-72 items-center justify-center"><Spinner label="Loading prices…" /></div>}
      {history && (
        <div className={state.loading ? "opacity-60" : ""}>
          <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span>
              {bars.length} trading days · {range} change{" "}
              <span className={`num ${changePct > 0 ? "text-bull" : changePct < 0 ? "text-bear" : "text-ink-2"}`}>
                {changePct === null ? "—" : `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%`}
              </span>
            </span>
            <Badge>{history.adjustment}</Badge>
            {history.droppedRows > 0 && <Badge tone="warn">{history.droppedRows} malformed rows excluded</Badge>}
          </div>
          <div className="h-64" role="img" aria-label={`${symbol} daily closing prices, ${range}`}>
              <LineChart responsive style={{ width: "100%", height: "100%" }} data={bars} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} syncId="px">
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={tickFmt} minTickGap={48} stroke="var(--color-muted)" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--color-line)" }} />
                <YAxis domain={["auto", "auto"]} width={72} stroke="var(--color-muted)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip content={<PriceTooltip currency={currency} />} cursor={{ stroke: "var(--color-line-strong)" }} />
                <Line type="linear" dataKey="close" stroke="var(--color-accent)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--color-panel)", strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
          </div>
          <p className="mt-3 text-[11px] uppercase tracking-wider text-muted">Volume</p>
          <div className="h-20" role="img" aria-label={`${symbol} daily volume, ${range}`}>
              <BarChart responsive style={{ width: "100%", height: "100%" }} data={bars} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} syncId="px" barCategoryGap={1}>
                <XAxis dataKey="date" hide />
                <YAxis width={72} stroke="var(--color-muted)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip content={<PriceTooltip currency={currency} />} cursor={{ fill: "var(--color-panel-2)" }} />
                <Bar dataKey="volume" fill="var(--color-muted)" fillOpacity={0.55} isAnimationActive={false} />
              </BarChart>
          </div>
          <DataProvenance provenance={history.provenance} timeZone={timeZone} />
        </div>
      )}
    </Panel>
  );
}

function PriceTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null;
  const b = payload[0].payload;
  return (
    <div className="rounded-md border border-line-strong bg-panel-2 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 text-ink-2">{formatDateTime(b.date)}</p>
      <dl className="num grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
        <dt className="text-muted">Open</dt><dd className="text-right text-ink">{formatPrice(b.open, currency)}</dd>
        <dt className="text-muted">High</dt><dd className="text-right text-ink">{formatPrice(b.high, currency)}</dd>
        <dt className="text-muted">Low</dt><dd className="text-right text-ink">{formatPrice(b.low, currency)}</dd>
        <dt className="text-muted">Close</dt><dd className="text-right text-ink">{formatPrice(b.close, currency)}</dd>
        <dt className="text-muted">Volume</dt><dd className="text-right text-ink">{formatCompact(b.volume)}</dd>
      </dl>
    </div>
  );
}
