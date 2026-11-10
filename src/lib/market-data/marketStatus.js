import { getExchange } from "./exchanges.js";

/**
 * Local time-of-day parts for a given IANA time zone.
 */
export function zonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    weekday: parts.weekday, // "Mon".."Sun"
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + Number(parts.minute),
  };
}

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Schedule-based market status. Weekends are closed; exchange holidays and
 * special sessions are NOT known here, which is stated in `note`.
 * Prefer the provider's own `is_market_open` flag when a quote supplies it.
 */
export function scheduleMarketStatus(exchangeCode, now = new Date()) {
  const ex = getExchange(exchangeCode);
  if (!ex) return null;
  const { weekday, minutes, date } = zonedParts(now, ex.timezone);
  const weekend = weekday === "Sat" || weekday === "Sun";
  const session = ex.sessions.find((s) => minutes >= toMinutes(s.open) && minutes < toMinutes(s.close));
  const isOpen = !weekend && Boolean(session);
  return {
    exchange: ex.code,
    isOpen,
    localDate: date,
    timezone: ex.timezone,
    regularHours: ex.sessions.map((s) => `${s.open}–${s.close}`).join(", "),
    basis: "schedule",
    note: "Based on regular trading hours only. Exchange holidays and special sessions are not reflected.",
  };
}
