/**
 * Only allows same-site relative paths after login, preventing open redirects
 * such as ?next=https://evil.example or ?next=//evil.example.
 */
export function safeNextPath(value, fallback = "/dashboard") {
  if (typeof value !== "string" || value.length === 0 || value.length > 500) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(value)) return fallback;
  return value;
}
