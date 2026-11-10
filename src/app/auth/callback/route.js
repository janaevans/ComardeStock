import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthMode } from "@/lib/auth/config";
import { safeNextPath } from "@/lib/auth/redirects";

// Supabase email confirmation / magic-link landing: exchanges the one-time
// code for a session cookie, then redirects inside the app only.
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (getAuthMode() !== "supabase" || !code) {
    return NextResponse.redirect(new URL("/login?error=callback", url.origin));
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=callback", url.origin));
  return NextResponse.redirect(new URL(next, url.origin));
}
