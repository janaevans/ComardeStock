"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { formatCompact, formatNumber, formatFractionAsPercent, formatPercent } from "@/lib/format";
import { Panel, Button, Spinner, Stat, Notice } from "@/components/ui";
import { ApiErrorNotice } from "@/components/ApiErrorNotice";
import { DataProvenance } from "@/components/DataProvenance";

/** Loaded on demand: fundamentals cost several provider calls/credits. */
export function FundamentalsPanel({ symbol, exchange }) {
  const [state, setState] = useState({ loading: false, data: null, error: null });

  async function load() {
    setState({ loading: true, data: null, error: null });
    try {
      const d = await apiFetch(`/api/stocks/fundamentals?${new URLSearchParams({ symbol, exchange })}`);
      setState({ loading: false, data: d.fundamentals, error: null });
    } catch (error) {
      setState({ loading: false, data: null, error });
    }
  }

  const f = state.data;
  const c = f?.currency;
  const m = f?.metrics;

  return (
    <Panel title="Fundamentals" actions={!f && !state.loading && <Button variant="secondary" onClick={load} className="py-1 text-xs">Load fundamentals</Button>}>
      {!f && !state.loading && !state.error && (
        <p className="text-sm text-muted">Financial statements and valuation ratios. Loading uses several data-provider requests, so it runs only when you ask.</p>
      )}
      {state.loading && <Spinner label="Loading financial data…" />}
      {state.error && <ApiErrorNotice error={state.error} onRetry={load} />}
      {f && (
        <>
          {f.unavailable.length > 0 && (
            <div className="mb-4">
              <Notice tone="warn" title="Some sections are unavailable">
                <ul className="list-disc pl-4">
                  {f.unavailable.map((u) => (
                    <li key={u.section}>
                      <span className="num">{u.section}</span>: {u.reason}
                    </li>
                  ))}
                </ul>
              </Notice>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Market cap" value={formatCompact(m.marketCap, c)} />
            <Stat label="P/E (TTM)" value={formatNumber(m.peRatio)} />
            <Stat label="P/B" value={formatNumber(m.pbRatio)} />
            <Stat label="EPS (TTM)" value={formatNumber(m.epsTtm)} />
            <Stat label="Revenue (TTM)" value={formatCompact(m.revenueTtm, c)} />
            <Stat label="ROE" value={formatFractionAsPercent(m.roe)} />
            <Stat label="Operating margin" value={formatFractionAsPercent(m.operatingMargin)} />
            <Stat label="Debt / equity" value={m.debtToEquityPercent === null ? "—" : formatPercent(m.debtToEquityPercent, { digits: 1 })} />
            <Stat label="Operating cash flow" value={formatCompact(m.operatingCashFlowTtm, c)} />
            <Stat label="Total debt" value={formatCompact(m.totalDebt, c)} />
            <Stat label="Total cash" value={formatCompact(m.totalCash, c)} />
            <Stat label="Beta" value={formatNumber(m.beta)} />
          </dl>

          {f.incomeStatements.length > 0 && (
            <div className="-mx-4 mt-5 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <caption className="px-4 pb-2 text-left text-[11px] uppercase tracking-wider text-muted">Annual income statement ({c})</caption>
                <thead>
                  <tr className="text-right text-[11px] uppercase tracking-wider text-muted">
                    <th className="px-4 pb-2 text-left font-medium">Fiscal year end</th>
                    <th className="px-2 pb-2 font-medium">Revenue</th>
                    <th className="px-2 pb-2 font-medium">Operating income</th>
                    <th className="px-4 pb-2 font-medium">Net income</th>
                  </tr>
                </thead>
                <tbody className="num divide-y divide-line">
                  {f.incomeStatements.slice(0, 5).map((r) => (
                    <tr key={r.fiscalDate} className="text-right">
                      <td className="px-4 py-1.5 text-left text-ink-2">{r.fiscalDate}</td>
                      <td className="px-2 py-1.5">{formatCompact(r.revenue)}</td>
                      <td className="px-2 py-1.5">{formatCompact(r.operatingIncome)}</td>
                      <td className="px-4 py-1.5">{formatCompact(r.netIncome)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">Ratios are shown exactly as reported by the provider; “—” means the provider did not supply the value.</p>
          <DataProvenance provenance={f.provenance} />
        </>
      )}
    </Panel>
  );
}
