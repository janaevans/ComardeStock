import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthMode } from "@/lib/auth/config";
import { assertSameOrigin, errorResponse } from "@/lib/api/handler";

// POST /auth/signout — form post from the app header.
export async function POST(request) {
  try {
    assertSameOrigin(request);
  } catch (err) {
    return errorResponse(err, { route: "auth.signout" });
  }
  if (getAuthMode() === "supabase") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
