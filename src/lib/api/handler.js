import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, ErrorCodes, isAppError } from "../errors.js";
import { logger } from "../logger.js";

/**
 * Wraps a Route Handler with uniform error handling and logging.
 * Unknown errors become a generic 500 so internals never leak to clients.
 */
export function withApi(name, handler) {
  return async function wrapped(request, context) {
    const requestId = crypto.randomUUID();
    const started = Date.now();
    try {
      const result = await handler(request, context, { requestId });
      const response = result instanceof Response ? result : NextResponse.json(result);
      response.headers.set("x-request-id", requestId);
      response.headers.set("cache-control", response.headers.get("cache-control") || "no-store");
      logger.debug("api.ok", { route: name, requestId, ms: Date.now() - started, status: response.status });
      return response;
    } catch (err) {
      return errorResponse(err, { route: name, requestId, ms: Date.now() - started });
    }
  };
}

export function errorResponse(err, ctx = {}) {
  let appErr;
  if (err instanceof ZodError) {
    appErr = new AppError(ErrorCodes.VALIDATION, "The request contains invalid values.", {
      status: 400,
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  } else if (isAppError(err)) {
    appErr = err;
  } else {
    appErr = new AppError(ErrorCodes.INTERNAL, "Something went wrong on our side. Please try again.", { status: 500 });
  }

  const level = appErr.status >= 500 ? "error" : "warn";
  logger[level]("api.error", { ...ctx, code: appErr.code, status: appErr.status, err });

  const response = NextResponse.json(appErr.toJSON(), { status: appErr.status });
  if (ctx.requestId) response.headers.set("x-request-id", ctx.requestId);
  response.headers.set("cache-control", "no-store");
  if (appErr.retryAfterSeconds) response.headers.set("retry-after", String(appErr.retryAfterSeconds));
  return response;
}

/** Parses JSON bodies with a size guard. */
export async function readJson(request, maxBytes = 32_000) {
  const text = await request.text();
  if (text.length > maxBytes) {
    throw new AppError(ErrorCodes.VALIDATION, "Request body is too large.", { status: 413 });
  }
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError(ErrorCodes.VALIDATION, "Request body must be valid JSON.", { status: 400 });
  }
}

/**
 * Rejects cross-site state-changing requests. Browsers send Origin on POST/PUT/DELETE;
 * it must match the host serving the app.
 */
export function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return; // non-browser clients (tests, curl) — still require auth cookies
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    if (new URL(origin).host === host) return;
  } catch {
    /* fall through */
  }
  throw new AppError(ErrorCodes.FORBIDDEN, "Cross-origin request rejected.", { status: 403 });
}
