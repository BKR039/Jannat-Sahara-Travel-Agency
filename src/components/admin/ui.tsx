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
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-h3 text-foreground">{title}</h1>
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
    primary: "bg-accent text-primary",
    green: "bg-mint-muted text-brand-green",
    gold: "bg-secondary-muted text-brand-gold",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="rounded-lg border border-border-subtle bg-card p-5 shadow-sm">
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
    <section className={`rounded-lg border border-border-subtle bg-card shadow-sm ${className}`}>
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
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-sunken/40 py-12 px-6 text-center">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground" />}
      <p className="mt-3 text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  new: "bg-info-muted text-info",
  pending: "bg-warning-muted text-warning",
  contacted: "bg-secondary-muted text-brand-gold",
  confirmed: "bg-success-muted text-success",
  completed: "bg-mint-muted text-brand-green",
  cancelled: "bg-danger-muted text-destructive",
  published: "bg-success-muted text-success",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
  sold_out: "bg-danger-muted text-destructive",
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
