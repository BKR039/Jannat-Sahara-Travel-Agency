/**
 * Janna Sahara admin design kit.
 * Small, composable primitives shared by every admin screen.
 * Semantic design tokens only — no hardcoded colours.
 */
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

/* --------------------------------- layout --------------------------------- */

export function Page({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-h4 font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-1 text-small text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  footer,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-sm",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-small font-semibold text-foreground">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-caption text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
      {footer && (
        <footer className="border-t border-border-subtle bg-surface-sunken/40 px-4 py-3 sm:px-5">
          {footer}
        </footer>
      )}
    </section>
  );
}

export function FormSection({
  title,
  description,
  children,
  aside,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-small font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-caption text-muted-foreground">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Collapsible "Advanced options" container. */
export function Disclosure({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border-subtle bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-start text-small font-semibold sm:px-5"
      >
        {label}
        <ChevronRight
          className={cn("h-4 w-4 transition-transform rtl:-scale-x-100", open && "rotate-90")}
        />
      </button>
      {open && <div className="border-t border-border-subtle p-4 sm:p-5">{children}</div>}
    </div>
  );
}

/* ----------------------------------- KPI ---------------------------------- */

export function KpiCard({
  label,
  value,
  delta,
  hint,
  series,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  delta?: number | null;
  hint?: string;
  series?: number[];
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "green" | "gold" | "muted";
}) {
  const tones: Record<string, string> = {
    primary: "bg-accent text-primary",
    green: "bg-mint-muted text-brand-green",
    gold: "bg-secondary-muted text-brand-gold",
    muted: "bg-muted text-muted-foreground",
  };
  const up = (delta ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-border-subtle bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span className={cn("rounded-xl p-2", tones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-h3 font-bold tabular-nums leading-none">{value}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {delta != null && Number.isFinite(delta) && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-caption font-semibold",
                up ? "bg-success-muted text-success" : "bg-danger-muted text-destructive",
              )}
            >
              {up ? "+" : ""}
              {Math.round(delta)}%
            </span>
          )}
          {hint && <p className="mt-1 truncate text-caption text-muted-foreground">{hint}</p>}
        </div>
        {series && series.length > 1 && <Sparkline data={series} />}
      </div>
    </div>
  );
}

export function Sparkline({ data, className = "" }: { data: number[]; className?: string }) {
  const path = useMemo(() => {
    const max = Math.max(...data, 1);
    const step = 100 / Math.max(data.length - 1, 1);
    return data
      .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(28 - (v / max) * 26).toFixed(1)}`)
      .join(" ");
  }, [data]);
  return (
    <svg viewBox="0 0 100 28" className={cn("h-7 w-24 shrink-0", className)} aria-hidden>
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} className="text-primary" />
    </svg>
  );
}

/* -------------------------------- insights -------------------------------- */

export type InsightSeverity = "info" | "opportunity" | "attention" | "critical";

export function InsightCard({
  severity,
  title,
  body,
  action,
}: {
  severity: InsightSeverity;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const { t } = useTranslation("admin");
  const tones: Record<InsightSeverity, string> = {
    info: "border-info/30 bg-info-muted/50",
    opportunity: "border-success/30 bg-success-muted/50",
    attention: "border-warning/40 bg-warning-muted/50",
    critical: "border-destructive/40 bg-danger-muted/50",
  };
  const labels: Record<InsightSeverity, string> = {
    info: t("shell.kit.insight.info"),
    opportunity: t("shell.kit.insight.opportunity"),
    attention: t("shell.kit.insight.attention"),
    critical: t("shell.kit.insight.critical"),
  };
  const chips: Record<InsightSeverity, string> = {
    info: "bg-info-muted text-info",
    opportunity: "bg-success-muted text-success",
    attention: "bg-warning-muted text-warning",
    critical: "bg-danger-muted text-destructive",
  };
  return (
    <article className={cn("rounded-2xl border p-4", tones[severity])}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
            chips[severity],
          )}
        >
          {labels[severity]}
        </span>
      </div>
      <h3 className="mt-2 text-small font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-caption leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </article>
  );
}

/* ------------------------------ status badges ------------------------------ */

const STATUS_TONE: Record<string, string> = {
  new: "bg-info-muted text-info",
  unread: "bg-info-muted text-info",
  pending: "bg-warning-muted text-warning",
  waiting: "bg-warning-muted text-warning",
  contacted: "bg-secondary-muted text-brand-gold",
  quoted: "bg-secondary-muted text-brand-gold",
  partially_paid: "bg-secondary-muted text-brand-gold",
  unpaid: "bg-muted text-muted-foreground",
  confirmed: "bg-success-muted text-success",
  paid: "bg-success-muted text-success",
  resolved: "bg-mint-muted text-brand-green",
  completed: "bg-mint-muted text-brand-green",
  published: "bg-success-muted text-success",
  cancelled: "bg-danger-muted text-destructive",
  sold_out: "bg-danger-muted text-destructive",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

export function StatusBadge({
  status,
  className = "",
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const s = status ?? "—";
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
        STATUS_TONE[s] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {s.replace(/_/g, " ")}
    </span>
  );
}

/* -------------------------------- progress -------------------------------- */

export function Occupancy({
  booked,
  capacity,
  className = "",
}: {
  booked: number;
  capacity: number | null;
  className?: string;
}) {
  const { t } = useTranslation("admin");
  const pct = capacity && capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
  const tone = pct >= 90 ? "bg-destructive" : pct >= 60 ? "bg-primary" : "bg-brand-green";
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between text-caption text-muted-foreground">
        <span className="tabular-nums">
          {booked}
          {capacity ? ` / ${capacity}` : ""} {t("shell.kit.occupancy.travellers")}
        </span>
        {capacity ? (
          <span className="tabular-nums">{Math.max(capacity - booked, 0)} {t("shell.kit.occupancy.left")}</span>
        ) : (
          <span>{t("shell.kit.occupancy.noCapacity")}</span>
        )}
      </div>
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* -------------------------------- controls -------------------------------- */

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const { t } = useTranslation("admin");
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute inset-inline-start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("shell.kit.search.placeholder")}
        className="h-10 w-full rounded-xl border border-border bg-background ps-9 pe-3 text-small outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
      />
    </div>
  );
}

/** Debounce helper for search fields. */
export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  className = "",
}: {
  tabs: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto rounded-xl border border-border-subtle bg-card p-1 shadow-sm",
        className,
      )}
      role="tablist"
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-small font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {t.label}
            {t.count != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-caption tabular-nums",
                  active ? "bg-primary-foreground/20" : "bg-muted",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------- drawer --------------------------------- */

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation("admin");
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">

      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex h-full w-full max-w-xl flex-col border-s border-border-subtle bg-card shadow-xl animate-in slide-in-from-end"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border-subtle px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-small font-semibold">{title}</h2>
            {description && (
              <p className="mt-0.5 truncate text-caption text-muted-foreground">{description}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("shell.kit.close")}>
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <footer className="border-t border-border-subtle bg-surface-sunken/40 p-4">{footer}</footer>
        )}
      </aside>
    </div>
  );
}

/* --------------------------- states and skeletons -------------------------- */

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-sunken/40 px-6 py-12 text-center">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground" />}
      <p className="mt-3 text-small font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-caption text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export function SkeletonRows({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function SkeletonKpis({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[132px] w-full rounded-2xl" />
      ))}
    </div>
  );
}

/* ------------------------------- formatting ------------------------------- */

export function money(value: number | null | undefined, currency = "TND"): string {
  if (value == null) return "—";
  return `${Math.round(value).toLocaleString("en-US")} ${currency}`;
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function relativeDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value).getTime();
  if (Number.isNaN(d)) return "—";
  const diff = Date.now() - d;
  const day = 86_400_000;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < day) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < day * 2) return "Yesterday";
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;
  return shortDate(value);
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ name, className = "" }: { name: string | null | undefined; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-caption font-bold text-primary",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
