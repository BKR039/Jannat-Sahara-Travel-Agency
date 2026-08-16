import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Minus, Plus, Search, Star, MapPin, Footprints } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { LazyImage } from "@/components/common/LazyImage";
import { cn } from "@/lib/utils";
import { useLocalized } from "@/lib/localize";
import type { Hotel } from "@/lib/queries";
import { parseISODate, toISODate, type BuilderState, type BuilderStep } from "./model";

/* ------------------------------------------------------------------ stepper */

export function BuilderStepper({
  steps,
  current,
  onSelect,
  labels,
}: {
  steps: readonly BuilderStep[];
  current: number;
  onSelect: (index: number) => void;
  labels: Record<BuilderStep, string>;
}) {
  return (
    <ol className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="snap-start">
            <button
              type="button"
              onClick={() => onSelect(i)}
              disabled={i > current}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3.5 py-2 text-caption font-semibold transition-all",
                active && "border-primary bg-primary text-primary-foreground shadow-sm",
                done && "border-primary/30 bg-primary/10 text-primary",
                !active && !done && "border-border-subtle bg-card text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  active ? "bg-primary-foreground/20" : done ? "bg-primary/15" : "bg-surface-sunken",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : String(i + 1).padStart(2, "0")}
              </span>
              <span className="whitespace-nowrap">{labels[step]}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------- step shell */

export function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="ds-reveal space-y-6">
      <header className="space-y-2">
        <h2 className="text-h3">{title}</h2>
        {subtitle && <p className="max-w-2xl text-body text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------ choice cards */

export function ChoiceCard({
  selected,
  title,
  description,
  icon,
  onClick,
  className,
}: {
  selected: boolean;
  title: string;
  description?: string;
  icon?: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl border p-4 text-start transition-all hover:-translate-y-0.5",
        selected
          ? "border-primary bg-primary/[0.06] shadow-sm"
          : "border-border-subtle bg-card hover:border-primary/40",
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            selected ? "bg-primary text-primary-foreground" : "bg-surface-sunken text-primary",
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-small font-semibold">{title}</span>
        {description && (
          <span className="mt-0.5 block text-caption text-muted-foreground">{description}</span>
        )}
      </span>
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
        )}
      >
        {selected && <Check className="h-3 w-3" />}
      </span>
    </button>
  );
}

/* ---------------------------------------------------------------- counters */

export function Counter({
  label,
  hint,
  value,
  min = 0,
  max = 30,
  unit,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-card p-4">
      <div className="min-w-0">
        <p className="text-small font-semibold">{label}</p>
        {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={t("umrahBuilder.a11y.decrease", { label })}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-20 text-center text-small font-bold tabular-nums">
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={t("umrahBuilder.a11y.increase", { label })}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- date picker */

export function DateRangeField({
  from,
  to,
  onChange,
  labelFrom,
  labelTo,
  placeholder,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  labelFrom: string;
  labelTo: string;
  placeholder: string;
}) {
  const { longDate, lang } = useLocalized();
  const [open, setOpen] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = {
    from: parseISODate(from),
    to: parseISODate(to),
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="grid w-full grid-cols-1 gap-3 rounded-2xl border border-border-subtle bg-card p-4 text-start transition-colors hover:border-primary/50 sm:grid-cols-2"
        >
          {[
            { label: labelFrom, value: from },
            { label: labelTo, value: to },
          ].map((slot) => (
            <span key={slot.label} className="block min-w-0">
              <span className="block text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                {slot.label}
              </span>
              <span
                className={cn(
                  "mt-1 flex items-center gap-2 text-small font-semibold",
                  !slot.value && "text-muted-foreground",
                )}
              >
                <ChevronDown className="h-4 w-4 text-primary" />
                {slot.value ? longDate(slot.value) : placeholder}
              </span>
            </span>
          ))}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          dir={lang === "ar" ? "rtl" : "ltr"}
          numberOfMonths={1}
          defaultMonth={selected.from ?? today}
          selected={selected.from ? (selected as { from: Date; to?: Date }) : undefined}
          disabled={{ before: today }}
          onSelect={(range) => {
            const nextFrom = range?.from ? toISODate(range.from) : "";
            const nextTo = range?.to ? toISODate(range.to) : "";
            onChange(nextFrom, nextTo);
            if (nextFrom && nextTo) setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------- hotel cards */

export function HotelSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute inset-y-0 start-4 my-auto h-4 w-4 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-full border border-border-subtle bg-card ps-11 pe-4 text-small outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
      />
    </div>
  );
}

export function HotelCard({
  hotel,
  city,
  selected,
  onSelect,
}: {
  hotel: Hotel;
  city: "makkah" | "madinah";
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const { L, number } = useLocalized();
  const images = Array.isArray(hotel.images) ? (hotel.images as string[]) : [];
  const distance = city === "makkah" ? hotel.distance_to_haram : hotel.distance_to_masjid_nabawi;

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-3xl border bg-card transition-all sm:flex-row",
        selected ? "border-primary shadow-md" : "border-border-subtle hover:border-primary/40",
      )}
    >
      <div className="relative h-40 shrink-0 sm:h-auto sm:w-48">
        {images[0] ? (
          <LazyImage src={images[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-surface-sunken" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-small font-bold">{L(hotel, "name", "base")}</h3>
          {!!hotel.stars && (
            <span className="inline-flex items-center gap-0.5 text-gold" aria-label={`${hotel.stars}`}>
              {Array.from({ length: hotel.stars }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-current" />
              ))}
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-caption text-muted-foreground">{L(hotel, "description", "empty")}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
          {L(hotel, "location", "base") && (
            <li className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {L(hotel, "location", "base")}
            </li>
          )}
          {!!distance && (
            <li className="inline-flex items-center gap-1">
              <Footprints className="h-3.5 w-3.5 text-primary" />
              {t(
                city === "makkah"
                  ? "umrahBuilder.hotels.distanceHaram"
                  : "umrahBuilder.hotels.distanceMasjid",
                { value: number(distance) },
              )}
            </li>
          )}
        </ul>
        <div className="mt-auto pt-2">
          <Button
            type="button"
            size="sm"
            variant={selected ? "default" : "outline"}
            onClick={onSelect}
            className="w-full sm:w-auto"
          >
            {selected ? (
              <>
                <Check className="me-2 h-4 w-4" /> {t("umrahBuilder.hotels.selected")}
              </>
            ) : (
              t("umrahBuilder.hotels.select")
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}

/* ----------------------------------------------------------- trip summary */

export function SummaryBody({
  state,
  areaLabel,
  budgetLabel,
}: {
  state: BuilderState;
  areaLabel: (city: "makkah" | "madinah", code: string) => string;
  budgetLabel: (code: string) => string;
}) {
  const { t } = useTranslation();
  const { longDate } = useLocalized();

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-caption text-muted-foreground">{label}</span>
      <span className="text-caption font-semibold text-end">{value}</span>
    </div>
  );

  const stay = (city: "makkah" | "madinah") => {
    const nights = city === "makkah" ? state.makkahNights : state.madinahNights;
    const hotel = city === "makkah" ? state.makkahHotelName : state.madinahHotelName;
    const area = city === "makkah" ? state.makkahArea : state.madinahArea;
    const budget = city === "makkah" ? state.makkahPreference : state.madinahPreference;
    return (
      <div className="space-y-1.5 rounded-2xl bg-surface-sunken/60 p-3">
        <p className="text-caption font-bold uppercase tracking-wide text-primary">
          {t(`umrahBuilder.summary.${city}`)}
        </p>
        <Row
          label={t("umrahBuilder.summary.nights")}
          value={nights ? t("umrahBuilder.summary.nightsCount", { count: nights }) : "—"}
        />
        <Row
          label={t("umrahBuilder.summary.hotel")}
          value={hotel || (area ? areaLabel(city, area) : t("umrahBuilder.summary.notChosen"))}
        />
        {budget && <Row label={t("umrahBuilder.summary.budget")} value={budgetLabel(budget)} />}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5 rounded-2xl bg-surface-sunken/60 p-3">
        <p className="text-caption font-bold uppercase tracking-wide text-primary">
          {t("umrahBuilder.summary.dates")}
        </p>
        <p className="text-caption font-semibold">
          {state.departureDate ? longDate(state.departureDate) : t("umrahBuilder.summary.notChosen")}
          {state.returnDate ? ` → ${longDate(state.returnDate)}` : ""}
        </p>
        <p className="text-caption text-muted-foreground">
          {t("umrahBuilder.summary.flights")}:{" "}
          {state.airportFlexible
            ? t("umrahBuilder.flights.flexible")
            : state.departureAirport && state.returnAirport
              ? `${state.departureAirport} → ${state.returnAirport}`
              : t("umrahBuilder.summary.notChosen")}
        </p>
      </div>
      {stay("makkah")}
      {stay("madinah")}
      <div className="space-y-1.5 rounded-2xl bg-surface-sunken/60 p-3">
        <p className="text-caption font-bold uppercase tracking-wide text-primary">
          {t("umrahBuilder.summary.travellers")}
        </p>
        <Row
          label={t("umrahBuilder.travellers.adults")}
          value={String(state.adults)}
        />
        {!!state.children && (
          <Row label={t("umrahBuilder.travellers.children")} value={String(state.children)} />
        )}
        {!!state.infants && (
          <Row label={t("umrahBuilder.travellers.infants")} value={String(state.infants)} />
        )}
      </div>
    </div>
  );
}

/** Desktop sticky panel + mobile collapsible sheet wrapper. */
export function SummaryPanel({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-3xl border border-border-subtle bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-small font-bold">{t("umrahBuilder.summary.title")}</h2>
          {children}
        </div>
      </aside>

      <div className="lg:hidden">
        <div className="rounded-3xl border border-border-subtle bg-card">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-2 p-4"
          >
            <span className="text-small font-bold">{t("umrahBuilder.summary.title")}</span>
            <ChevronDown
              className={cn("h-4 w-4 text-primary transition-transform", open && "rotate-180")}
            />
          </button>
          {open && <div className="border-t border-border-subtle p-4">{children}</div>}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ fields */

export function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  error,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  inputMode?: "text" | "tel" | "email";
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-caption font-semibold text-muted-foreground">
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={cn(
          "h-12 w-full rounded-2xl border bg-card px-4 text-small outline-none transition-colors placeholder:text-muted-foreground focus:border-primary",
          error ? "border-destructive" : "border-border-subtle",
        )}
      />
      {error && <p className="text-caption text-destructive">{error}</p>}
    </div>
  );
}
