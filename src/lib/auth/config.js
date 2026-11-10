/**
 * Decides which authentication backend is active.
 *
 * - "supabase":   NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
 * - "dev-local":  AUTH_MODE=dev-local, for running the app on a laptop without a
 *                 Supabase project. Signs everyone in as one local developer user.
 *                 It is refused in production builds and on Vercel.
 * - "unconfigured": neither; protected pages show a setup message.
 */
export const DEV_USER = Object.freeze({
  id: "00000000-0000-4000-8000-000000000001",
  email: "developer@localhost",
});

export function isProductionRuntime(env = process.env) {
  return env.NODE_ENV === "production" || Boolean(env.VERCEL) || env.VERCEL_ENV === "production";
}

export function getAuthMode(env = process.env) {
  if (env.AUTH_MODE === "dev-local") {
    // Fail closed: never allow the shared developer identity on a deployed site.
    if (env.VERCEL || env.VERCEL_ENV) return "unconfigured";
    // `next start` sets NODE_ENV=production. Allow it only with an explicit
    // local-only opt-in, for testing a production build on your own machine.
    if (env.NODE_ENV === "production" && env.ALLOW_DEV_AUTH_IN_PRODUCTION_BUILD !== "local-only") {
      return "unconfigured";
    }
    return "dev-local";
  }
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return "supabase";
  return "unconfigured";
}
