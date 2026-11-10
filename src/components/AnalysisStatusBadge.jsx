import { Badge } from "./ui";

const STATUS = {
  PENDING: ["Queued", "neutral"],
  FETCHING_DATA: ["Fetching data", "info"],
  CALCULATING: ["Calculating", "info"],
  BULL_WORKING: ["Bull working", "info"],
  BEAR_WORKING: ["Bear working", "info"],
  DEBATING: ["Debating", "info"],
  JUDGE_REVIEWING: ["Judge reviewing", "judge"],
  GENERATING_REPORT: ["Generating report", "info"],
  COMPLETED: ["Completed", "good"],
  FAILED: ["Failed", "bad"],
  CANCELLED: ["Cancelled", "neutral"],
};

export function AnalysisStatusBadge({ status }) {
  const [label, tone] = STATUS[status] || [status, "neutral"];
  return <Badge tone={tone}>{label}</Badge>;
}
