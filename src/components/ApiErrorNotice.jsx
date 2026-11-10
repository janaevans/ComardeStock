"use client";

import Link from "next/link";
import { Notice } from "./ui";

/** Turns a structured ApiError into a helpful notice with a next step. */
export function ApiErrorNotice({ error, onRetry }) {
  if (!error) return null;
  const setup = ["PROVIDER_NOT_CONFIGURED", "PROVIDER_AUTH_FAILED", "CONFIG_MISSING"].includes(error.code);
  const titles = {
    PROVIDER_NOT_CONFIGURED: "Market data provider not configured",
    PROVIDER_AUTH_FAILED: "Provider rejected the API key",
    PROVIDER_RATE_LIMITED: "Provider rate limit reached",
    RATE_LIMITED: "Too many requests",
    PROVIDER_PLAN_RESTRICTED: "Not included in your data plan",
    PROVIDER_TIMEOUT: "Provider timed out",
    PROVIDER_UNAVAILABLE: "Provider unavailable",
    INVALID_TICKER: "Symbol not found",
    UNSUPPORTED_EXCHANGE: "Exchange not supported",
    DATA_UNAVAILABLE: "Data unavailable",
    UNAUTHENTICATED: "Signed out",
    NETWORK: "Network error",
  };
  return (
    <Notice
      tone={setup || error.code === "INTERNAL_ERROR" ? "error" : "warn"}
      title={titles[error.code] || "Request failed"}
      action={
        setup ? (
          <Link href="/settings/providers" className="text-sm text-accent underline-offset-2 hover:underline">
            Open API provider settings
          </Link>
        ) : error.code === "UNAUTHENTICATED" ? (
          <Link href="/login" className="text-sm text-accent underline-offset-2 hover:underline">
            Sign in again
          </Link>
        ) : onRetry ? (
          <button onClick={onRetry} className="text-sm text-accent underline-offset-2 hover:underline">
            Try again{error.retryAfterSeconds ? ` (after ~${error.retryAfterSeconds}s)` : ""}
          </button>
        ) : null
      }
    >
      {error.message}
    </Notice>
  );
}
