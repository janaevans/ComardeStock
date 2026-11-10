"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { Panel, Button, Badge, Notice } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export function ProviderSettings({ initialProviders, initialPreferred, encryptionReady }) {
  const [providers, setProviders] = useState(initialProviders);
  const [preferred, setPreferred] = useState(initialPreferred);
  const [prefMsg, setPrefMsg] = useState("");

  async function savePreferred(value) {
    setPreferred(value);
    setPrefMsg("");
    try {
      await apiFetch("/api/user/settings", { method: "PATCH", body: { marketDataProvider: value || null } });
      setPrefMsg("Saved.");
    } catch (err) {
      setPrefMsg(err.message);
    }
  }

  const groups = [
    { kind: "market", title: "Market data" },
    { kind: "ai", title: "AI models (used by the agents from Phase 3)" },
  ];

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.kind}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-2">{g.title}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {providers
              .filter((p) => p.kind === g.kind)
              .map((p) => (
                <ProviderCard key={p.id} provider={p} encryptionReady={encryptionReady} onChange={setProviders} />
              ))}
          </div>
        </section>
      ))}

      <Panel title="User settings">
        <label className="block max-w-sm text-sm text-ink-2">
          Preferred market-data provider
          <select
            value={preferred}
            onChange={(e) => savePreferred(e.target.value)}
            className="mt-1 w-full rounded-md border border-line-strong bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">Automatic (Twelve Data first)</option>
            <option value="TWELVE_DATA">Twelve Data</option>
            <option value="ALPHA_VANTAGE">Alpha Vantage</option>
          </select>
        </label>
        <p className="mt-2 text-xs text-muted">
          Used when you have keys for both. The app never switches providers silently when one fails — every figure shows its source.
        </p>
        {prefMsg && <p className="mt-2 text-xs text-ink-2">{prefMsg}</p>}
      </Panel>
    </div>
  );
}

function ProviderCard({ provider: p, encryptionReady, onChange }) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(p.selectedModel || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const body = { provider: p.id, apiKey };
      if (p.kind === "ai" && model.trim()) body.selectedModel = model.trim();
      const res = await apiFetch("/api/providers", { method: "PUT", body });
      onChange(res.providers);
      setApiKey("");
      setMsg({ tone: "info", text: "Key saved and encrypted. It is not tested until first use." });
    } catch (err) {
      setMsg({ tone: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiFetch("/api/providers", { method: "DELETE", body: { provider: p.id } });
      onChange(res.providers);
    } catch (err) {
      setMsg({ tone: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title={p.label}
      actions={
        <Badge tone={p.configured ? "good" : "neutral"}>
          {p.configured ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {p.source === "user" ? "your key" : p.source === "server" ? "server key" : "not configured"}
        </Badge>
      }
    >
      {p.note && <p className="mb-3 text-sm text-muted">{p.note}</p>}
      {p.source === "user" && (
        <p className="num mb-3 text-xs text-muted">
          Stored key {p.keyHint} · updated {formatDateTime(p.updatedAt)}
          {p.selectedModel ? ` · model ${p.selectedModel}` : ""}
        </p>
      )}
      {p.source === "server" && <p className="mb-3 text-xs text-muted">The operator provided a server key. Adding your own key overrides it for your account.</p>}
      <form onSubmit={save} className="space-y-2">
        <label className="block text-xs text-ink-2">
          {p.source === "user" ? "Replace API key" : "API key"}
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={!encryptionReady}
            className="num mt-1 w-full rounded-md border border-line-strong bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent disabled:opacity-50"
          />
        </label>
        {p.kind === "ai" && (
          <label className="block text-xs text-ink-2">
            Model (optional — exact API model name)
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!encryptionReady}
              placeholder="Chosen in Phase 3 if left blank"
              className="num mt-1 w-full rounded-md border border-line-strong bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent disabled:opacity-50"
            />
          </label>
        )}
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="submit" disabled={busy || !encryptionReady || apiKey.trim().length < 8}>
            Save key
          </Button>
          {p.source === "user" && (
            <Button type="button" variant="danger" onClick={remove} disabled={busy}>
              Remove
            </Button>
          )}
          <a href={p.docs} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
            Get a key <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </form>
    </Panel>
  );
}
