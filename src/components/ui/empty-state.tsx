import type { ComponentType, ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "There is nothing here" — once, for the whole product.
 *
 * There were two of these. The public one took a single `label` and drew a
 * 40px icon on a dashed card with 48px of padding; the admin one took a title,
 * a description and an action and drew a 32px icon with tighter padding. Same
 * idea, same dashed border, two components that had drifted to different
 * sizes — so a visitor and an operator met two different answers to the same
 * situation.
 *
 * This is the admin's richer shape, because it is a superset: a public caller
 * passes only `title` and gets what it had. `density` is the one axis on which
 * the two contexts legitimately differ — a marketing page can afford the room
 * an empty gallery deserves, an admin table cannot — so it is a prop rather
 * than a second component.
 */
export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Defaults to an inbox; pass a subject-specific icon where one helps. */
  icon?: ComponentType<{ className?: string }>;
  /** `comfortable` for public pages, `compact` inside admin panels. */
  density?: "comfortable" | "compact";
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  density = "compact",
  className,
}: EmptyStateProps) {
  const comfortable = density === "comfortable";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface-sunken/40 text-center",
        comfortable ? "px-6 py-12" : "px-6 py-10",
        className,
      )}
    >
      <Icon
        className={cn("shrink-0 text-muted-foreground", comfortable ? "h-10 w-10" : "h-8 w-8")}
        aria-hidden="true"
      />
      <p className={cn("mt-3 font-medium", comfortable ? "text-body" : "text-small")}>{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-caption text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
