"use client";

import * as React from "react";
import { Clock, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocalized } from "@/lib/localize";
import { cn } from "@/lib/utils";

export interface TimePickerProps {
  id?: string;
  value?: string | null;
  onChange?: (time: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
  clearable?: boolean;
  name?: string;
}

const COMMON_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
];

export const TimePicker = React.forwardRef<HTMLButtonElement, TimePickerProps>(
  (
    {
      id,
      value,
      onChange,
      placeholder,
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

    const defaultPlaceholder =
      lang === "ar"
        ? "اختر الوقت"
        : lang === "fr"
          ? "Choisir l'heure"
          : "Select time";

    const displayPlaceholder = placeholder || defaultPlaceholder;

    const [hours, minutes] = React.useMemo(() => {
      if (!value || !value.includes(":")) return ["09", "00"];
      const parts = value.split(":");
      return [parts[0] || "09", parts[1] || "00"];
    }, [value]);

    const handleSelect = (timeSlot: string) => {
      onChange?.(timeSlot);
      setOpen(false);
    };

    const handleHourChange = (newHour: string) => {
      onChange?.(`${newHour.padStart(2, "0")}:${minutes.padStart(2, "0")}`);
    };

    const handleMinuteChange = (newMinute: string) => {
      onChange?.(`${hours.padStart(2, "0")}:${newMinute.padStart(2, "0")}`);
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
                <Clock className="h-4 w-4 shrink-0 opacity-60 text-primary" />
                <span className="truncate font-mono text-sm tracking-wide">
                  {value || displayPlaceholder}
                </span>
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
                  aria-label={lang === "ar" ? "مسح الوقت" : "Effacer l'heure"}
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent className="w-64 p-3 border border-border/80 shadow-xl" align="start">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                <div className="flex items-center gap-1.5 font-mono text-base font-bold">
                  {/* Hours stepper */}
                  <div className="flex items-center rounded-sm border border-input bg-surface">
                    <button
                      type="button"
                      onClick={() => {
                        const next = (parseInt(hours, 10) - 1 + 24) % 24;
                        handleHourChange(String(next));
                      }}
                      className="px-1.5 py-1 text-muted-foreground hover:bg-muted text-xs transition-colors"
                      aria-label="إنقاص الساعة"
                    >
                      -
                    </button>
                    <span className="px-2 text-sm text-foreground tabular-nums">
                      {hours.padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = (parseInt(hours, 10) + 1) % 24;
                        handleHourChange(String(next));
                      }}
                      className="px-1.5 py-1 text-muted-foreground hover:bg-muted text-xs transition-colors"
                      aria-label="زيادة الساعة"
                    >
                      +
                    </button>
                  </div>

                  <span className="font-bold text-muted-foreground">:</span>

                  {/* Minutes stepper */}
                  <div className="flex items-center rounded-sm border border-input bg-surface">
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(minutes, 10);
                        const next = (Math.floor(current / 5) * 5 - 5 + 60) % 60;
                        handleMinuteChange(String(next));
                      }}
                      className="px-1.5 py-1 text-muted-foreground hover:bg-muted text-xs transition-colors"
                      aria-label="إنقاص الدقيقة"
                    >
                      -
                    </button>
                    <span className="px-2 text-sm text-foreground tabular-nums">
                      {minutes.padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(minutes, 10);
                        const next = (Math.floor(current / 5) * 5 + 5) % 60;
                        handleMinuteChange(String(next));
                      }}
                      className="px-1.5 py-1 text-muted-foreground hover:bg-muted text-xs transition-colors"
                      aria-label="زيادة الدقيقة"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold px-2.5 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-sm transition-colors"
                >
                  {lang === "ar" ? "تأكيد" : "OK"}
                </button>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {lang === "ar" ? "أوقات شائعة" : "Créneaux suggérés"}
                </p>
                <div className="grid grid-cols-3 gap-1 max-h-36 overflow-y-auto p-0.5">
                  {COMMON_SLOTS.map((slot) => {
                    const isSelected = value === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handleSelect(slot)}
                        className={cn(
                          "px-2 py-1 text-xs rounded-sm text-center font-mono transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "hover:bg-accent text-foreground",
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);

TimePicker.displayName = "TimePicker";
