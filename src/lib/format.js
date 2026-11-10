/** Display formatting. Pure functions usable on server and client. */

const localeFor = (currency) => (currency === "INR" ? "en-IN" : currency === "GBP" ? "en-GB" : "en-US");

export function formatPrice(value, currency) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (!currency) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  try {
    return new Intl.NumberFormat(localeFor(currency), {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function formatCompact(value, currency) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const s = new Intl.NumberFormat(localeFor(currency), { notation: "compact", maximumFractionDigits: 2 }).format(value);
  return currency ? `${s} ${currency}` : s;
}

export function formatPercent(value, { signed = false, digits = 2 } = {}) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

/** Ratios reported as fractions (0.23) shown as percentages (23.00%). */
export function formatFractionAsPercent(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDateTime(iso, timeZone) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  if (iso.length === 10) return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone || undefined,
    timeZoneName: "short",
  });
}

export function changeTone(value) {
  if (value === null || value === undefined || value === 0) return "text-ink-2";
  return value > 0 ? "text-bull" : "text-bear";
}
