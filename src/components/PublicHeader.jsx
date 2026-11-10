import Link from "next/link";
import { Logo } from "./Logo";

export function PublicHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/about" className="rounded-md px-3 py-1.5 text-muted hover:text-ink">
            About &amp; limitations
          </Link>
          <Link href="/login" className="rounded-md px-3 py-1.5 text-muted hover:text-ink">
            Sign in
          </Link>
          <Link href="/dashboard" className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-ink hover:brightness-110">
            Open app
          </Link>
        </nav>
      </div>
    </header>
  );
}
