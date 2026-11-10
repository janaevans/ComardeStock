import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getAuthMode } from "./lib/auth/config.js";

/**
 * Runs before every matched request:
 * 1. Refreshes the Supabase session cookie (Server Components cannot write cookies).
 * 2. Redirects signed-out visitors away from app pages to /login.
 *
 * API routes are not redirected; they return 401 JSON from requireUser().
 * This is a convenience layer only — every page and route still checks the
 * user itself, so a proxy bypass cannot expose data.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/stocks", "/watchlist", "/settings", "/analysis", "/history"];

function isProtected(pathname) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request) {
  const mode = getAuthMode();
  const { pathname, search } = request.nextUrl;

  if (mode !== "supabase") {
    // dev-local: everyone is the dev user. unconfigured: pages show setup guidance.
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Must be called to refresh an expiring session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
