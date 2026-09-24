"use client";

import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { ar as arLocale, enGB, fr as frLocale } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { intlLocale, useLocalized } from "@/lib/localize";
import { cn } from "@/lib/utils";

const CALENDAR_LOCALES = { ar: arLocale, fr: frLocale, en: enGB } as const;

export function parseISODate(value: string | null | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function toISODate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export interface DatePickerProps {
  id?: string;
  value?: string | null;
  onChange?: (date: string | null) => void;
  placeholder?: string;
  minDate?: Date | string;
  maxDate?: Date | string;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
  clearable?: boolean;
  name?: string;
}

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      id,
      value,
      onChange,
      placeholder,
      minDate,
      maxDate,
      disabled = false,
      className,
      invalid = false,
      clearable = true,
      name,
    },
    ref,
  ) => {
    const { lang } = useLocalized();
    const [open, setOpen] = React.useState(false);

    const selectedDate = React.useMemo(() => parseISODate(value), [value]);
    const minParsed = React.useMemo(
      () => (typeof minDate === "string" ? parseISODate(minDate) : minDate),
      [minDate],
    );
    const maxParsed = React.useMemo(
      () => (typeof maxDate === "string" ? parseISODate(maxDate) : maxDate),
      [maxDate],
    );

    const defaultPlaceholder =
      lang === "ar" ? "اختر التاريخ" : lang === "fr" ? "Choisir une date" : "Select date";

    const displayPlaceholder = placeholder || defaultPlaceholder;

    const formattedDate = React.useMemo(() => {
      if (!selectedDate) return null;
      try {
        return selectedDate.toLocaleDateString(intlLocale(lang), {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return toISODate(selectedDate);
      }
    }, [selectedDate, lang]);

    const activeLocale = CALENDAR_LOCALES[lang] || CALENDAR_LOCALES.ar;

    const handleSelect = (date: Date | undefined) => {
      if (date) {
        onChange?.(toISODate(date));
        setOpen(false);
      } else {
        onChange?.(null);
      }
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onChange?.(null);
    };

    return (
      <div className={cn("relative inline-block w-full", className)}>
        {name && <input type="hidden" name={name} value={value || ""} />}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              id={id}
              ref={ref}
              type="button"
              disabled={disabled}
              className={cn(
                "flex h-11 w-full items-center justify-between rounded-sm border border-input bg-surface px-3 py-2 text-body text-foreground shadow-xs ring-offset-background cursor-pointer",
                "transition-[border-color,box-shadow] duration-fast ease-standard",
                "hover:border-border-strong",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
                invalid && "border-destructive focus:border-destructive focus:ring-destructive/20",
                !value && "text-muted-foreground",
              )}
            >
              <span className="flex items-center gap-2.5 truncate">
                <CalendarIcon className="h-4 w-4 shrink-0 opacity-60 text-primary" />
                <span className="truncate">{formattedDate || displayPlaceholder}</span>
              </span>

              {clearable && value && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleClear(e as unknown as React.MouseEvent);
                    }
                  }}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label={lang === "ar" ? "مسح التاريخ" : "Effacer la date"}
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border border-border/80 shadow-xl" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              locale={activeLocale}
              disabled={(date) => {
                if (minParsed) {
                  const check = new Date(date);
                  check.setHours(0, 0, 0, 0);
                  const min = new Date(minParsed);
                  min.setHours(0, 0, 0, 0);
                  if (check < min) return true;
                }
                if (maxParsed) {
                  const check = new Date(date);
                  check.setHours(23, 59, 59, 999);
                  const max = new Date(maxParsed);
                  max.setHours(23, 59, 59, 999);
                  if (check > max) return true;
                }
                return false;
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);

DatePicker.displayName = "DatePicker";
