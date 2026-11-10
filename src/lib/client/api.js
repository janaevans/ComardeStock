"use client";

/** Error thrown by apiFetch with the server's structured error fields. */
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || `Request failed (${status})`);
    this.status = status;
    this.code = body?.error?.code || "UNKNOWN";
    this.details = body?.error?.details;
    this.retryAfterSeconds = body?.error?.retryAfterSeconds;
  }
}

/** Same-origin JSON fetch used by client components. */
export async function apiFetch(path, { method = "GET", body, signal } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      signal,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError(0, { error: { code: "NETWORK", message: "Network error. Check your connection and try again." } });
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
