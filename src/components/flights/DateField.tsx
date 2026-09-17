import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { ar as arLocale, enGB, fr as frLocale } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { intlLocale, useLocalized } from "@/lib/localize";
import { cn } from "@/lib/utils";

/**
 * Month and weekday names inside the calendar grid.
 *
 * `react-day-picker` formats its own caption and weekday row, and without a
 * date-fns locale it falls back to English — so an Arabic traveller opened the
 * picker and read "August 2026" above أيام arabic-labelled days. date-fns is
 * already a dependency; these are its locales, not a new package.
 */
const CALENDAR_LOCALES = { ar: arLocale, fr: frLocale, en: enGB } as const;

/** `YYYY-MM-DD` (the wire format the schema validates) -> local Date. */
export function parseISODate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Local Date -> `YYYY-MM-DD`, without the UTC shift `toISOString()` causes. */
export function toISODate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * One leg's date, shown the way a ticket shows it.
 *
 * This replaces `<input type="date">`. The native control rendered
 * `jj/mm/aaaa` in a French browser regardless of the site language, carried
 * the browser's own calendar glyph next to ours, and could not be styled — so
 * the two most important fields on the page were the only ones that did not
 * belong to the design system. The day number leads, the month and year sit
 * under it, and the leg it belongs to is named beneath, so "departure" and
 * "return" are readable at a glance rather than decoded from two identical
 * boxes.
 *
 * The value, its `YYYY-MM-DD` wire format and the validation around it are
 * unchanged — only the control is different.
 */
export function DateField({
  id,
  label,
  value,
  onChange,
  min,
  legend,
  invalid,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (iso: string) => void;
  /** Earliest selectable day; earlier days are disabled, not merely rejected. */
  min?: Date;
  /** The leg this date belongs to, e.g. "Tunis → Paris". */
  legend?: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const { lang } = useLocalized();
  const [open, setOpen] = useState(false);
  const selected = parseISODate(value);

  /*
   * Month and weekday names come from the browser's own locale data for the
   * active language, so Arabic reads أغسطس rather than a transliteration and
   * French reads août — no month-name table to maintain in three languages.
   */
  const locale = intlLocale(lang);
  const dayNumber = selected ? selected.toLocaleDateString(locale, { day: "2-digit" }) : null;
  const monthYear = selected
    ? selected.toLocaleDateString(locale, { month: "long", year: "numeric" })
    : null;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-caption font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-label={selected ? `${label}: ${dayNumber} ${monthYear}` : label}
            className={cn(
              "group flex min-h-[5.5rem] w-full flex-col justify-center gap-0.5 rounded-input border bg-surface px-4 py-3 text-start",
              "transition-[border-color,box-shadow] duration-fast ease-standard",
              "hover:border-primary/50",
              "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
              "disabled:cursor-not-allowed disabled:opacity-50",
              invalid ? "border-destructive" : "border-border",
            )}
          >
            {selected ? (
              <>
                <span className="flex items-baseline gap-2">
                  <span className="text-h3 font-bold leading-none tabular-nums text-foreground">
                    {dayNumber}
                  </span>
                  <span className="truncate text-body font-medium text-foreground/80">
                    {monthYear}
                  </span>
                </span>
                {legend && (
                  <span className="mt-1 truncate text-caption text-muted-foreground" dir="auto">
                    {legend}
                  </span>
                )}
              </>
            ) : (
              /* One calendar glyph, ours — the native control used to add a
                 second one right beside it. */
              <span className="flex items-center gap-2.5 text-body text-muted-foreground/80">
                <CalendarDays className="h-5 w-5 shrink-0" aria-hidden="true" />
                {t("flightRequest.pickDate")}
              </span>
            )}
          </button>
        </PopoverTrigger>

        {/* Capped so the month grid can never push the page sideways at 390. */}
        <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] overflow-auto p-0">
          <Calendar
            mode="single"
            dir={lang === "ar" ? "rtl" : "ltr"}
            locale={CALENDAR_LOCALES[lang]}
            numberOfMonths={1}
            defaultMonth={selected ?? min ?? startOfToday()}
            selected={selected}
            disabled={min ? { before: min } : undefined}
            onSelect={(date) => {
              if (!date) return;
              onChange(toISODate(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
