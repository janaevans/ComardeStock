/**
 * Application error types. Every error that can reach an API response carries
 * a stable machine-readable `code`, an HTTP `status`, and a user-safe message.
 * Internal details (stack traces, upstream bodies, keys) are never serialized.
 */
export class AppError extends Error {
  constructor(code, message, { status = 500, details, cause, retryAfterSeconds } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  toJSON() {
    const body = { error: { code: this.code, message: this.message } };
    if (this.details !== undefined) body.error.details = this.details;
    if (this.retryAfterSeconds !== undefined) body.error.retryAfterSeconds = this.retryAfterSeconds;
    return body;
  }
}

export const ErrorCodes = Object.freeze({
  VALIDATION: "VALIDATION_ERROR",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  CONFIG_MISSING: "CONFIG_MISSING",
  // Market data
  PROVIDER_NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
  PROVIDER_RATE_LIMITED: "PROVIDER_RATE_LIMITED",
  PROVIDER_AUTH_FAILED: "PROVIDER_AUTH_FAILED",
  PROVIDER_PLAN_RESTRICTED: "PROVIDER_PLAN_RESTRICTED",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  PROVIDER_TIMEOUT: "PROVIDER_TIMEOUT",
  PROVIDER_BAD_RESPONSE: "PROVIDER_BAD_RESPONSE",
  INVALID_TICKER: "INVALID_TICKER",
  UNSUPPORTED_EXCHANGE: "UNSUPPORTED_EXCHANGE",
  DATA_UNAVAILABLE: "DATA_UNAVAILABLE",
  INTERNAL: "INTERNAL_ERROR",
});

export function isAppError(err) {
  return err instanceof AppError || (err && err.name === "AppError" && typeof err.code === "string");
}
