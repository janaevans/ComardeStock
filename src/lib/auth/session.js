import "server-only";
import { cache } from "react";
import { AppError, ErrorCodes } from "../errors.js";
import { DEV_USER, getAuthMode } from "./config.js";
import { ensureUserRecord } from "../db/users.js";
import { logger } from "../logger.js";

/**
 * Returns the signed-in user as { id, email } or null.
 * The Supabase identity is verified with getUser(), which validates the JWT
 * against Supabase Auth instead of trusting the cookie contents.
 * Memoized per request with React cache().
 */
export const getCurrentUser = cache(async () => {
  const mode = getAuthMode();
  if (mode === "dev-local") {
    await ensureUserRecord(DEV_USER);
    return { ...DEV_USER };
  }
  if (mode !== "supabase") return null;

  const { createSupabaseServerClient } = await import("../supabase/server.js");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    if (error && error.status !== 401 && error.name !== "AuthSessionMissingError") {
      logger.warn("auth.getUser failed", { err: error });
    }
    return null;
  }
  const user = { id: data.user.id, email: data.user.email ?? "" };
  await ensureUserRecord(user);
  return user;
});

/** For Route Handlers: returns the user or throws a 401 AppError. */
export async function requireUser() {
  const mode = getAuthMode();
  if (mode === "unconfigured") {
    throw new AppError(
      ErrorCodes.CONFIG_MISSING,
      "Authentication is not configured. Set the Supabase environment variables (see README).",
      { status: 503 }
    );
  }
  const user = await getCurrentUser();
  if (!user) throw new AppError(ErrorCodes.UNAUTHENTICATED, "Please sign in to continue.", { status: 401 });
  return user;
}
