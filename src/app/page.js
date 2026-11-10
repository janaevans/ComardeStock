import { Database, Calculator, MessagesSquare, Scale, FileDown, ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { ButtonLink } from "@/components/ui";

const FEATURES = [
  { icon: Database, title: "Sourced market data", body: "Prices and financials from licensed data APIs, each stamped with source, as-of date and whether it is delayed or end-of-day." },
  { icon: Calculator, title: "Deterministic numbers", body: "Indicators, volatility, drawdown and position sizing are computed in tested code — never estimated by a language model." },
  { icon: MessagesSquare, title: "Bull vs Bear debate", body: "Two analysts build the strongest evidence-backed case on each side, then question each other's claims." },
  { icon: Scale, title: "Independent judge", body: "A third agent checks claims against the data and may conclude Neutral, Wait for confirmation, or Insufficient data." },
  { icon: FileDown, title: "Full transcript export", body: "Download the whole debate and the final report as Markdown or JSON." },
  { icon: ShieldCheck, title: "Your keys stay server-side", body: "AI and data API keys are encrypted at rest and never sent to the browser." },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4">
        <section className="py-16 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Multi-agent stock research</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Let a bull and a bear argue it out. Let an independent judge weigh the evidence.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-ink-2">
            Enter a company or ticker on NSE, BSE, NYSE, Nasdaq or LSE. Tribunal pulls the market data, computes the indicators,
            and runs a transparent, recorded debate that ends in a risk report — including when the honest answer is “not enough data”.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/dashboard">Start researching</ButtonLink>
            <ButtonLink href="/about" variant="secondary">
              Read the limitations
            </ButtonLink>
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-panel p-5">
              <Icon className="h-5 w-5 text-accent" aria-hidden />
              <h2 className="mt-3 text-sm font-semibold text-ink">{title}</h2>
              <p className="mt-1.5 text-sm text-muted">{body}</p>
            </div>
          ))}
        </section>

        <p className="py-10 text-xs text-muted">
          Tribunal is a research and decision-support tool. It does not predict prices, guarantee outcomes, execute trades, or provide
          personalised investment advice.
        </p>
      </main>
    </div>
  );
}
