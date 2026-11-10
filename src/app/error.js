"use client";

export default function GlobalError({ error, reset }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted">
        The page failed to load. If this keeps happening, check the server logs{error?.digest ? ` (reference ${error.digest})` : ""}.
      </p>
      <button onClick={reset} className="rounded-md border border-line-strong px-3 py-1.5 text-sm text-ink hover:border-muted">
        Try again
      </button>
    </main>
  );
}
