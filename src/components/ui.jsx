import Link from "next/link";
import { AlertTriangle, Info, Loader2 } from "lucide-react";

/** Small, dependency-free UI primitives shared across pages. */

export function Panel({ title, actions, children, className = "", bodyClassName = "" }) {
  return (
    <section className={`rounded-lg border border-line bg-panel ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          {title && <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-2">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

const BUTTON_VARIANTS = {
  primary: "bg-accent text-accent-ink hover:brightness-110 disabled:opacity-50",
  secondary: "border border-line-strong bg-panel-2 text-ink hover:border-muted disabled:opacity-50",
  ghost: "text-ink-2 hover:text-ink hover:bg-panel-2 disabled:opacity-50",
  danger: "border border-bear/40 text-bear hover:bg-bear/10 disabled:opacity-50",
};

export function Button({ variant = "primary", className = "", children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", className = "", children }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

const BADGE_TONES = {
  neutral: "border-line-strong text-ink-2",
  good: "border-bull/40 text-bull",
  bad: "border-bear/40 text-bear",
  warn: "border-warn/40 text-warn",
  info: "border-accent/40 text-accent",
  judge: "border-judge/40 text-judge",
};

export function Badge({ tone = "neutral", children, className = "", title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Notice({ tone = "warn", title, children, action }) {
  const Icon = tone === "info" ? Info : AlertTriangle;
  const color = tone === "error" ? "border-bear/40 bg-bear/5 text-bear" : tone === "info" ? "border-accent/30 bg-accent/5 text-accent" : "border-warn/40 bg-warn/5 text-warn";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-3 rounded-md border px-3.5 py-3 text-sm ${color}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="mt-0.5 text-ink-2">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export function Spinner({ label = "Loading" }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      {Icon && <Icon className="h-6 w-6 text-muted" aria-hidden />}
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {children && <p className="max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, valueClassName = "" }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className={`num mt-0.5 truncate text-sm text-ink ${valueClassName}`}>{value}</dd>
      {sub && <dd className="text-xs text-muted">{sub}</dd>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
