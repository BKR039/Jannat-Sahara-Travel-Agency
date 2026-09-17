import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Admin table with a real mobile form.
 *
 * The brief's rule (§23) is that tables become cards at small widths rather
 * than forcing horizontal scrolling. Doing that with CSS alone means writing
 * every cell twice, so this renders from a column definition: one description,
 * two layouts.
 *
 * `priority` is what makes the card layout readable — on mobile a row shows
 * its primary column as the card's heading and its secondary columns as
 * labelled pairs; columns marked `detail` are dropped from the card entirely
 * rather than stacking eight labels nobody reads.
 */

export interface Column<T> {
  /** Stable key, also used for the mobile label. */
  key: string;
  header: ReactNode;
  /** Cell renderer. */
  cell: (row: T) => ReactNode;
  /**
   * primary   — card heading on mobile
   * secondary — labelled pair on mobile
   * detail    — desktop only
   * actions   — pinned to the card footer on mobile
   */
  priority?: "primary" | "secondary" | "detail" | "actions";
  className?: string;
  headerClassName?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  caption,
  className = "",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  caption?: string;
  className?: string;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  const primary = columns.find((c) => c.priority === "primary") ?? columns[0];
  const secondary = columns.filter((c) => c.priority === "secondary");
  const actions = columns.filter((c) => c.priority === "actions");

  return (
    <div className={className}>
      {/* ---------- desktop ---------- */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-small">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-border-subtle">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-[var(--space-4)] py-[var(--space-3)] text-start",
                    "text-caption font-semibold uppercase tracking-wide text-muted-foreground",
                    c.headerClassName,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-border-subtle/60 transition-colors duration-fast last:border-0 hover:bg-surface-sunken/40"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-[var(--space-4)] py-[var(--space-4)] align-middle",
                      c.className,
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- mobile ---------- */}
      <ul className="flex flex-col gap-[var(--space-3)] md:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className="rounded-card border border-border-subtle bg-surface p-[var(--space-4)] shadow-xs"
          >
            <div className="text-small font-semibold text-foreground">{primary.cell(row)}</div>

            {secondary.length > 0 && (
              <dl className="mt-[var(--space-3)] grid grid-cols-2 gap-[var(--space-3)]">
                {secondary.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-caption uppercase tracking-wide text-muted-foreground">
                      {c.header}
                    </dt>
                    <dd className="mt-0.5 text-small text-foreground">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {actions.length > 0 && (
              <div className="mt-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-2)] border-t border-border-subtle pt-[var(--space-3)]">
                {actions.map((c) => (
                  <div key={c.key}>{c.cell(row)}</div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
