"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * The one numeric control.
 *
 * It exists so no form in the product falls back to the browser's own number
 * spinner, whose arrows are a different size, shape and hit area in every
 * engine and which no amount of CSS makes match the rest of the system.
 *
 * Three things were missing before anything but a traveller count could use
 * it, and all three are the difference between "a counter" and "the numeric
 * input":
 *
 *  - `parseInt` meant integers only, so a price of 4200.50 or a latitude of
 *    21.4225 was silently truncated the moment it was typed;
 *  - an empty field reported `min`, so clearing an optional promotional price
 *    wrote 0 — a real price — instead of "not set";
 *  - the stepper labels were hard-coded Arabic, which is the one string a
 *    French or English screen reader would still have read in Arabic.
 *
 * `value` is therefore `number | null`, and `null` is only ever emitted when
 * the caller opts in with `allowEmpty`. Callers that want a counter pass
 * nothing extra and behave exactly as before.
 */

export interface NumberInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  showSteppers?: boolean;
  /** Accept a decimal point. Off by default, so counters stay whole. */
  allowDecimal?: boolean;
  /** Let the field be cleared, reporting `null` rather than `min`. */
  allowEmpty?: boolean;
  invalid?: boolean;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      value,
      onChange,
      min = 0,
      max = 999999,
      step = 1,
      unit,
      showSteppers = true,
      allowDecimal = false,
      allowEmpty = false,
      invalid,
      disabled,
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation();

    /*
     * What the field shows while it is being typed in.
     *
     * Parsing on every keystroke and writing the number straight back makes
     * "10.5" impossible to type: the "." parses to 10, the value round-trips
     * as "10", and the caret jumps. The draft holds exactly what was typed
     * and is dropped the moment the committed value changes from elsewhere.
     */
    const [draft, setDraft] = React.useState<string | null>(null);
    const shown = draft ?? (value === null || Number.isNaN(value) ? "" : String(value));

    const clamp = (n: number) => Math.min(max, Math.max(min, n));

    const commit = (raw: string) => {
      const text = raw.trim();
      if (text === "") {
        onChange(allowEmpty ? null : min);
        return;
      }
      const parsed = allowDecimal ? Number.parseFloat(text) : Number.parseInt(text, 10);
      onChange(Number.isNaN(parsed) ? (allowEmpty ? null : min) : clamp(parsed));
    };

    const nudge = (direction: 1 | -1) => {
      if (disabled) return;
      setDraft(null);
      onChange(clamp((value ?? 0) + direction * step));
    };

    const atMin = value !== null && value <= min;
    const atMax = value !== null && value >= max;

    return (
      <div
        className={cn(
          "flex h-11 w-full items-center rounded-sm border bg-surface shadow-xs transition-[border-color,box-shadow] duration-fast ease-standard",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          invalid ? "border-destructive" : "border-input",
          disabled && "cursor-not-allowed bg-muted opacity-60",
          className,
        )}
      >
        {showSteppers && (
          <button
            type="button"
            onClick={() => nudge(-1)}
            disabled={disabled || atMin}
            aria-label={t("form.number.decrease")}
            className="flex h-full w-10 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <div className="flex flex-1 items-center justify-center px-2">
          <input
            ref={ref}
            /*
             * `text` with a numeric inputmode, not `type="number"`. The native
             * type is what draws the browser's own spinner — the control this
             * component exists to replace — and it also refuses to report a
             * partially typed value. The keypad on mobile is the same either
             * way.
             */
            type="text"
            inputMode={allowDecimal ? "decimal" : "numeric"}
            autoComplete="off"
            value={shown}
            onChange={(e) => {
              const next = e.target.value;
              if (next !== "" && !(allowDecimal ? /^-?\d*\.?\d*$/ : /^-?\d*$/).test(next)) return;
              setDraft(next);
              commit(next);
            }}
            onBlur={() => setDraft(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                nudge(1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                nudge(-1);
              }
            }}
            disabled={disabled}
            className="w-full bg-transparent text-center text-input tabular-nums text-foreground focus:outline-none"
            {...props}
          />
          {unit && (
            <span className="ms-1 shrink-0 text-caption font-medium text-muted-foreground">
              {unit}
            </span>
          )}
        </div>

        {showSteppers && (
          <button
            type="button"
            onClick={() => nudge(1)}
            disabled={disabled || atMax}
            aria-label={t("form.number.increase")}
            className="flex h-full w-10 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  },
);

NumberInput.displayName = "NumberInput";
