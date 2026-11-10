import { Badge } from "./ui";
import { formatDateTime } from "@/lib/format";

const FRESHNESS_TONE = {
  "real-time": "good",
  delayed: "warn",
  "end-of-day": "neutral",
  periodic: "neutral",
  unknown: "bad",
};

/** Shows where a data record came from and how fresh it is. Never says "live" unless declared real-time. */
export function DataProvenance({ provenance, timeZone, compact = false }) {
  if (!provenance) return null;
  const { source, freshness, freshnessNote, dataDate, retrievedAt, stale } = provenance;
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted ${compact ? "" : "mt-3 border-t border-line pt-3"}`}>
      <span>
        Source: <span className="text-ink-2">{source}</span>
      </span>
      <Badge tone={FRESHNESS_TONE[freshness] || "neutral"} title={freshnessNote}>
        {freshness}
      </Badge>
      {stale && <Badge tone="bad">stale</Badge>}
      {dataDate && (
        <span>
          As of <span className="num text-ink-2">{formatDateTime(dataDate, timeZone)}</span>
        </span>
      )}
      {retrievedAt && (
        <span>
          Retrieved <span className="num text-ink-2">{formatDateTime(retrievedAt)}</span>
        </span>
      )}
      {!compact && freshnessNote && <span className="basis-full text-muted">{freshnessNote}</span>}
    </div>
  );
}
