import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Notice } from "@/components/ui";
import { getAuthMode } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/redirects";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const next = safeNextPath(params?.next);
  const mode = getAuthMode();

  if (mode !== "unconfigured" && (await getCurrentUser())) redirect(next);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Logo />
        <div className="mt-8 rounded-lg border border-line bg-panel p-6">
          {mode === "supabase" ? (
            <LoginForm next={next} callbackError={params?.error === "callback"} />
          ) : (
            <Notice tone="error" title="Sign-in is not configured">
              Add your Supabase project URL and anon key to the environment. See README → Supabase setup.
            </Notice>
          )}
        </div>
      </div>
    </main>
  );
}
