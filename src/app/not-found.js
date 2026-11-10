import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <h1 className="text-lg font-semibold text-ink">Not found</h1>
      <p className="max-w-sm text-sm text-muted">This page, stock or analysis does not exist, or it belongs to another account.</p>
      <Link href="/dashboard" className="text-sm text-accent hover:underline">Back to dashboard</Link>
    </main>
  );
}
