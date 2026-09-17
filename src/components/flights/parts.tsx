import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared surfaces and controls for the flight booking experience.
 *
 * These exist so the journey, the travel details, the contact block and the
 * summary read as one instrument rather than four cards that happen to sit on
 * the same page. Everything here composes the project's tokens — card radius,
 * input radius, warm border, no resting shadow — and adds no colours or radii
 * of its own.
 */

/* ------------------------------------------------------------------ section */

/**
 * One numbered stage of the booking flow.
 *
 * The number is rendered as a digit pair rather than a translated "Step 1"
 * string: it is the same glyph in all three languages and it lets the eye
 * count the stages without reading them.
 */
export function Stage({
  index,
  title,
  description,
  complete,
  completeSummary,
  children,
  className,
}: {
  index: number;
  title: string;
  description?: string;
  /** Drawn as done once the stage holds everything it needs. */
  complete?: boolean;
  /** One line restating what the traveller chose, shown when complete. */
  completeSummary?: string;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <section className={cn("scroll-mt-24", className)}>
      <header className="mb-4 flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            "text-caption font-bold tabular-nums transition-colors duration-base ease-standard",
            complete
              ? "bg-brand-green text-brand-green-foreground"
              : "border border-border bg-surface text-muted-foreground",
          )}
          aria-hidden="true"
        >
          {complete ? <Check className="h-4 w-4" /> : String(index).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <h2 className="text-body-lg font-bold leading-tight text-foreground">
            {title}
            {complete && <span className="sr-only"> — {t("flightRequest.stageComplete")}</span>}
          </h2>
          {complete && completeSummary ? (
            <p className="mt-0.5 truncate text-caption font-medium text-brand-green" dir="auto">
              {completeSummary}
            </p>
          ) : (
            description && (
              <p className="mt-0.5 text-caption text-muted-foreground">{description}</p>
            )
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

/** Plain card surface: border-first, card radius, no resting shadow. */
export function Panel({
  children,
  className,
  tinted,
}: {
  children: ReactNode;
  className?: string;
  /** Warm tint for the featured surface (the journey). */
  tinted?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border",
        tinted ? "border-primary/15 bg-accent/40" : "border-border-subtle bg-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------- field */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-caption font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {error ? (
        <span role="alert" className="text-caption font-medium text-destructive">
          {error}
        </span>
      ) : (
        hint && <span className="text-caption text-muted-foreground">{hint}</span>
      )}
    </div>
  );
}

/**
 * The one control surface on this page.
 *
 * Inputs, the date buttons, the traveller trigger and the cabin trigger all
 * wear this, so a click target is recognisable before it is read.
 */
export const CONTROL =
  "h-14 w-full rounded-input border bg-surface px-4 text-body text-foreground " +
  "transition-[border-color,box-shadow] duration-fast ease-standard " +
  "placeholder:text-muted-foreground/80 " +
  "focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 " +
  "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15";

export function controlClass(invalid?: boolean, extra?: string) {
  return cn(CONTROL, invalid ? "border-destructive" : "border-border", extra);
}

/* -------------------------------------------------------- segmented control */

/**
 * Trip type. A real radiogroup: arrow keys move between the options and the
 * selected one is the only tab stop, which is what a segmented control is
 * supposed to do and what a row of buttons does not.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
  ariaLabel: string;
}) {
  function move(delta: number) {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + delta + options.length) % options.length];
    if (next) onChange(next.value);
  }
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        // Arrows are direction-agnostic here on purpose: in RTL the visually
        // "next" segment is to the left, and mapping keys to the visual order
        // is what makes the control feel native rather than mirrored.
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          move(-1);
        }
      }}
      className="inline-flex rounded-badge border border-border-subtle bg-surface-sunken/70 p-1"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-11 rounded-badge px-5 text-small font-semibold",
              "transition-[background,color] duration-base ease-standard motion-reduce:transition-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active
                ? "bg-gradient-sunrise text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ stepper */

export function Stepper({
  label,
  hint,
  value,
  min = 0,
  max = 20,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-small font-semibold text-foreground">{label}</div>
        <div className="text-caption text-muted-foreground">{hint}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <StepButton
          ariaLabel={t("flightRequest.decreaseAria", { label })}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </StepButton>
        {/* Announced as a live value so a screen reader hears the new count
            rather than only the button that changed it. */}
        <span
          aria-live="polite"
          className="w-9 text-center text-body font-bold tabular-nums text-foreground"
        >
          {value}
        </span>
        <StepButton
          ariaLabel={t("flightRequest.increaseAria", { label })}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  ariaLabel,
  disabled,
  onClick,
  children,
}: {
  ariaLabel: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border",
        "text-foreground transition-colors duration-fast ease-standard",
        "hover:border-primary hover:text-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}
