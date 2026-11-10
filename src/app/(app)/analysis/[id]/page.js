import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getAnalysisForUser } from "@/lib/db/analyses";
import { formatDateTime, formatPrice } from "@/lib/format";
import { Panel, PageHeader, Notice, Stat } from "@/components/ui";
import { AnalysisStatusBadge } from "@/components/AnalysisStatusBadge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analysis" };

const LABELS = { horizon: "Investment horizon", riskTolerance: "Risk tolerance", analysisType: "Analysis type", investmentAmount: "Investment amount", maxAcceptableLoss: "Maximum acceptable loss" };

export default async function AnalysisPage({ params }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Scoped by user id: another user's analysis is indistinguishable from a missing one.
  const a = await getAnalysisForUser(user.id, id);
  if (!a) notFound();

  const settings = a.analysisSettings || {};
  const entries = Object.entries(LABELS).map(([k, label]) => {
    const v = settings[k];
    const shown = v === undefined ? "Not specified" : typeof v === "number" ? formatPrice(v, a.currency) : String(v);
    return { k, label, shown };
  });

  return (
    <>
      <PageHeader
        title={`${a.companyName}`}
        subtitle={`${a.ticker} · ${a.exchange} · created ${formatDateTime(a.createdAt.toISOString())}`}
        actions={<Link href={`/stocks/${a.exchange}/${encodeURIComponent(a.ticker)}`} className="text-sm text-accent hover:underline">Stock overview</Link>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Status" className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <AnalysisStatusBadge status={a.status} />
            <span className="num text-xs text-muted">ID {a.id}</span>
          </div>
          {a.status === "PENDING" && (
            <div className="mt-4">
              <Notice tone="info" title="Queued">
                The stock and your settings are saved. The multi-agent debate engine (Bull, Bear and Judge) is delivered in the next
                build phases; this analysis will run from this record once it is enabled. No AI output has been generated yet.
              </Notice>
            </div>
          )}
          {a.status === "FAILED" && a.errorMessage && <div className="mt-4"><Notice tone="error" title="Analysis failed">{a.errorMessage}</Notice></div>}
        </Panel>
        <Panel title="Analysis settings">
          <dl className="space-y-3">
            {entries.map((e) => (
              <Stat key={e.k} label={e.label} value={e.shown} valueClassName={e.shown === "Not specified" ? "text-muted" : ""} />
            ))}
          </dl>
        </Panel>
      </div>
    </>
  );
}
