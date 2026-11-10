"use client";

import { createBrowserClient } from "@supabase/ssr";

let client;

/** Browser Supabase client. Uses only the public URL and anon key. */
export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return client;
}
