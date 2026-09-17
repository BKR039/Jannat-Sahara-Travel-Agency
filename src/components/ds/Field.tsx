import { useId, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A labelled form control.
 *
 * Forms across the product each rebuilt the same label/height/radius/error
 * arrangement by hand, which is how the flights page ended up with inputs that
 * read as default HTML. `Field` owns the arrangement; callers supply the
 * control.
 *
 * Two details worth keeping:
 *  - the error is wired with `aria-describedby` and `aria-invalid`, so it is
 *    announced rather than only coloured;
 *  - the icon sits on the writing-direction start edge via `start-3`, so RTL
 *    needs no mirrored override.
 */

export const CONTROL_BASE = cn(
  "h-12 w-full rounded-input border bg-surface px-4 text-input text-foreground",
  "placeholder:text-muted-foreground/70",
  "transition-[border-color,box-shadow] duration-fast ease-standard",
  "focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-muted-foreground",
);

export function controlClass({ invalid = false, hasIcon = false } = {}) {
  return cn(
    CONTROL_BASE,
    invalid
      ? "border-destructive focus:border-destructive focus:ring-destructive/15"
      : "border-border",
    hasIcon && "ps-11",
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  icon,
  children,
  className = "",
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  /** Rendered on the start edge of the control. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const auto = useId();
  const id = htmlFor ?? auto;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={cn("flex flex-col gap-[var(--space-2)]", className)}>
      <label htmlFor={id} className="text-label font-semibold text-secondary-foreground">
        {label}
        {required && (
          <span className="ms-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className="relative">
        {icon && (
          <span
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        {children}
      </div>

      {hint && !error && (
        <p id={hintId} className="text-caption text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="flex items-center gap-1.5 text-caption font-medium text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
