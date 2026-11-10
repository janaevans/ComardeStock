import Link from "next/link";

/** Wordmark: three bars for the three agents (bull, judge, bear). */
export function Logo({ href = "/" }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Tribunal home">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <rect x="2" y="7" width="4" height="13" rx="1" fill="var(--color-bull)" />
        <rect x="9" y="2" width="4" height="18" rx="1" fill="var(--color-judge)" />
        <rect x="16" y="10" width="4" height="10" rx="1" fill="var(--color-bear)" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-ink">Tribunal</span>
    </Link>
  );
}
