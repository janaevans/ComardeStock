import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AppNav } from "@/components/AppNav";
import { MarketStatusBar } from "@/components/MarketStatusBar";
import { Notice } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthMode } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

/**
 * Shell for all signed-in pages. Each page and API route still checks the
 * user itself; this layout is the visible gate, not the only one.
 */
export default async function AppLayout({ children }) {
  const mode = getAuthMode();
  if (mode === "unconfigured") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <Logo />
        <div className="mt-8">
          <Notice tone="error" title="Authentication is not configured">
            Set <code className="num">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="num">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
            (see README → Supabase setup). For a laptop-only trial, set <code className="num">AUTH_MODE=dev-local</code> in{" "}
            <code className="num">.env.local</code>; it is refused on deployed sites.
          </Notice>
        </div>
      </main>
    );
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2.5 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex items-center justify-between gap-4">
            <Logo href="/dashboard" />
            <div className="flex items-center gap-3 lg:hidden">
              <SignOut email={user.email} mode={mode} />
            </div>
          </div>
          <AppNav />
          <div className="hidden flex-1 items-center justify-end gap-4 lg:flex">
            <MarketStatusBar />
            <SignOut email={user.email} mode={mode} />
          </div>
        </div>
        <div className="border-t border-line px-4 py-1.5 lg:hidden">
          <MarketStatusBar />
        </div>
      </header>
      {mode === "dev-local" && (
        <div className="border-b border-warn/30 bg-warn/5 px-4 py-1.5 text-center text-xs text-warn">
          Local developer mode — signed in as a shared local user. Not available on deployed sites.
        </div>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-line px-4 py-4 text-center text-xs text-muted">
        Educational research and decision support only — not personalised investment advice. Data may be delayed or incomplete.
      </footer>
    </div>
  );
}

function SignOut({ email, mode }) {
  return (
    <form action="/auth/signout" method="post" className="flex items-center gap-2">
      <span className="hidden max-w-[180px] truncate text-xs text-muted sm:inline" title={email}>
        {email}
      </span>
      {mode === "supabase" && (
        <button type="submit" className="rounded-md p-1.5 text-muted hover:bg-panel-2 hover:text-ink" aria-label="Sign out" title="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
