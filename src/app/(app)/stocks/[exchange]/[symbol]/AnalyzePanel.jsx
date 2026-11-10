"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { Panel, Button, Notice } from "@/components/ui";

const SELECTS = [
  { key: "horizon", label: "Investment horizon", options: [["short", "Short-term"], ["medium", "Medium-term"], ["long", "Long-term"]] },
  { key: "riskTolerance", label: "Risk tolerance", options: [["low", "Low"], ["moderate", "Moderate"], ["high", "High"]] },
  { key: "analysisType", label: "Analysis type", options: [["combined", "Combined"], ["fundamental", "Fundamental"], ["technical", "Technical"]] },
];

/**
 * "Analyze Stock" with optional settings. Every field may be left blank:
 * the app never assumes an amount or risk profile.
 */
export function AnalyzePanel({ symbol, exchange, companyName, currency, ready }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ horizon: "", riskTolerance: "", analysisType: "", investmentAmount: "", maxAcceptableLoss: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const settings = {};
    for (const { key } of SELECTS) if (form[key]) settings[key] = form[key];
    for (const key of ["investmentAmount", "maxAcceptableLoss"]) {
      if (form[key] !== "") {
        const n = Number(form[key]);
        if (!Number.isFinite(n) || n <= 0) return setError(`${key === "investmentAmount" ? "Investment amount" : "Maximum acceptable loss"} must be a positive number.`);
        settings[key] = n;
      }
    }
    if (settings.investmentAmount && settings.maxAcceptableLoss > settings.investmentAmount) {
      return setError("Maximum acceptable loss cannot exceed the investment amount.");
    }
    setBusy(true);
    try {
      const { analysis } = await apiFetch("/api/analyses", { method: "POST", body: { symbol, exchange, companyName, currency, settings } });
      router.push(`/analysis/${analysis.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const input = "mt-1 w-full rounded-md border border-line-strong bg-bg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent";

  return (
    <Panel title="Analyse this stock">
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-muted">
          Bull and Bear analysts debate {symbol}; an independent Judge produces a risk report. Settings below are optional.
        </p>
        <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 text-sm text-accent" aria-expanded={open}>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          Optional analysis settings
        </button>
        {open && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {SELECTS.map((s) => (
              <label key={s.key} className="block text-xs text-ink-2">
                {s.label}
                <select value={form[s.key]} onChange={set(s.key)} className={input}>
                  <option value="">Not specified</option>
                  {s.options.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </label>
            ))}
            <label className="block text-xs text-ink-2">
              Investment amount ({currency})
              <input type="number" min="0" step="any" inputMode="decimal" value={form.investmentAmount} onChange={set("investmentAmount")} placeholder="Not specified" className={`num ${input}`} />
            </label>
            <label className="block text-xs text-ink-2">
              Maximum acceptable loss ({currency})
              <input type="number" min="0" step="any" inputMode="decimal" value={form.maxAcceptableLoss} onChange={set("maxAcceptableLoss")} placeholder="Not specified" className={`num ${input}`} />
            </label>
          </div>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" className="w-full" disabled={busy || !ready}>
          {busy ? "Creating analysis…" : "Analyze Stock"}
        </Button>
        {!ready && <p className="text-xs text-muted">Available once the latest price has loaded.</p>}
        <p className="text-xs text-muted">Educational analysis, not personalised investment advice.</p>
      </form>
    </Panel>
  );
}
