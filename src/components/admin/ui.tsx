import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  tone?: "primary" | "green" | "gold" | "muted";
}) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    green: "bg-[color:var(--color-brand-green)]/10 text-[color:var(--color-brand-green)]",
    gold: "bg-[color:var(--color-brand-gold)]/10 text-[color:var(--color-brand-gold)]",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={`rounded-lg p-2 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function AdminCard({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-card shadow-[var(--shadow-card)] ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-12 px-6 text-center">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground" />}
      <p className="mt-3 text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  contacted: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  confirmed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  completed: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  published: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  draft: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  archived: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  sold_out: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "—";
  const tone = STATUS_TONE[s] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>
      {s.replace(/_/g, " ")}
    </span>
  );
}
