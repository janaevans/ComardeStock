/** Shared parsing helpers for provider payloads (which often send numbers as strings). */

export function num(value) {
  if (value === null || value === undefined || value === "" || value === "None" || value === "-") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").replace(/%$/, ""));
  return Number.isFinite(n) ? n : null;
}

export function str(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" || s === "None" ? null : s;
}

export function bool(value) {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

/** Calendar start date (YYYY-MM-DD) for a history range, counted back from `now`. */
export function rangeStartDate(range, now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const months = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12, "3Y": 36, "5Y": 60 }[range];
  if (!months) throw new Error(`Unknown range ${range}`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

/**
 * Sorts bars ascending by date, drops malformed rows and duplicate dates.
 * Returns { bars, dropped } so callers can disclose data-quality issues.
 */
export function cleanBars(rawBars) {
  const seen = new Set();
  const bars = [];
  let dropped = 0;
  for (const b of rawBars) {
    const valid =
      b &&
      typeof b.date === "string" &&
      [b.open, b.high, b.low, b.close].every((v) => typeof v === "number" && Number.isFinite(v) && v > 0) &&
      b.high >= b.low &&
      !seen.has(b.date);
    if (!valid) {
      dropped++;
      continue;
    }
    seen.add(b.date);
    bars.push(b);
  }
  bars.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { bars, dropped };
}
