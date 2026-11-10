import Link from "next/link";
import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { listAnalyses } from "@/lib/db/analyses";
import { formatDateTime } from "@/lib/format";
import { Panel, PageHeader, EmptyState, ButtonLink } from "@/components/ui";
import { AnalysisStatusBadge } from "@/components/AnalysisStatusBadge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analysis history" };

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const rows = await listAnalyses(user.id, { take: 100 });

  return (
    <>
      <PageHeader title="Analysis history" subtitle="Every analysis you have started. Open one to review it." />
      <Panel bodyClassName="p-0">
        {rows.length === 0 ? (
          <EmptyState icon={History} title="No analyses yet" action={<ButtonLink href="/stocks/search" variant="secondary">Search a stock</ButtonLink>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-2 font-medium">Company</th>
                  <th className="px-2 py-2 font-medium">Listing</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Saved</th>
                  <th className="px-4 py-2 text-right font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-panel-2">
                    <td className="px-4 py-2"><Link href={`/analysis/${a.id}`} className="hover:text-accent">{a.companyName}</Link></td>
                    <td className="num px-2 py-2 text-xs text-ink-2">{a.ticker} · {a.exchange}</td>
                    <td className="px-2 py-2"><AnalysisStatusBadge status={a.status} /></td>
                    <td className="px-2 py-2 text-xs text-muted">{a.isSaved ? "Yes" : "—"}</td>
                    <td className="num px-4 py-2 text-right text-xs text-muted">{formatDateTime(a.createdAt.toISOString())}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
