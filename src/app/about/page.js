import { PublicHeader } from "@/components/PublicHeader";

export const metadata = { title: "About & limitations" };

const SECTIONS = [
  {
    h: "What this is",
    p: [
      "Tribunal is a stock research and decision-support tool. Two AI analysts argue opposite sides from the same sourced data, and an independent AI judge evaluates the arguments against that data.",
      "It is educational analysis. It is not personalised, regulated investment advice, and it does not execute trades.",
    ],
  },
  {
    h: "Market data",
    p: [
      "Prices and financials come from third-party APIs (Twelve Data or Alpha Vantage, configured by you or the operator). Coverage, delay and history depth depend on the provider and plan.",
      "Every figure shows its source and as-of date. Data is labelled real-time only when the operator has declared a real-time plan for that exchange; otherwise intraday prices are labelled delayed, and closed-market prices end-of-day.",
      "Market open/closed status is based on regular trading hours. Exchange holidays and special sessions are not reflected.",
      "When data is missing, stale or restricted by the data plan, the app says so rather than filling the gap.",
    ],
  },
  {
    h: "Calculations",
    p: [
      "Indicators, volatility, drawdown, risk/reward and position sizing are computed by deterministic, unit-tested code. Language models never calculate the numbers.",
      "Support and resistance are shown as zones derived from documented methods, not as guaranteed price levels. A stop-loss does not guarantee a maximum loss: prices can gap and orders can fill at worse prices.",
    ],
  },
  {
    h: "The AI agents",
    p: [
      "The Bull and Bear analysts are instructed not to manufacture arguments when the evidence is weak. The Judge can reject both and may conclude Bullish, Bearish, Neutral, Wait for confirmation, or Insufficient data — it is never forced to recommend buying or selling.",
      "AI models can still be wrong or misread data. Treat every conclusion as a starting point for your own research.",
      "News and company announcements are treated as untrusted input to protect against instructions hidden in external text.",
    ],
  },
  {
    h: "Scenarios are not predictions",
    p: [
      "Bullish, base and bearish scenarios are conditional ranges under stated assumptions. They are not forecasts and carry no probability of profit.",
    ],
  },
  {
    h: "Before public commercial use",
    p: [
      "Operators must review market-data licensing (redistribution and display rights), privacy obligations, and securities regulations in each jurisdiction where the app is offered — for example SEBI rules on research analysts and investment advisers in India.",
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-dvh">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">About &amp; limitations</h1>
        <div className="mt-8 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2">{s.h}</h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted">
                {s.p.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
