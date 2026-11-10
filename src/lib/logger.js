import { redactObject } from "./security/redact.js";

/**
 * Minimal structured JSON logger. Vercel captures stdout/stderr, and JSON lines
 * are searchable in Vercel Logs or any drain (Datadog, Better Stack, Sentry).
 * All context objects are passed through redaction before being written.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold() {
  const configured = (process.env.LOG_LEVEL || "").toLowerCase();
  if (LEVELS[configured]) return LEVELS[configured];
  return process.env.NODE_ENV === "production" ? LEVELS.info : LEVELS.debug;
}

function serializeError(err) {
  if (!err) return undefined;
  return {
    name: err.name,
    message: err.message,
    code: err.code,
    status: err.status,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  };
}

function write(level, message, context = {}) {
  if (LEVELS[level] < threshold()) return;
  if (process.env.NODE_ENV === "test" && !process.env.LOG_IN_TESTS) return;
  const { err, ...rest } = context;
  const line = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...redactObject(rest),
    ...(err ? { err: serializeError(err) } : {}),
  };
  const out = JSON.stringify(line);
  if (level === "error" || level === "warn") console.error(out);
  else console.log(out);
}

export const logger = {
  debug: (msg, ctx) => write("debug", msg, ctx),
  info: (msg, ctx) => write("info", msg, ctx),
  warn: (msg, ctx) => write("warn", msg, ctx),
  error: (msg, ctx) => write("error", msg, ctx),
};
