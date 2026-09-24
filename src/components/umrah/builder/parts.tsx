import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Minus, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLocalized } from "@/lib/localize";
import { parseISODate, toISODate, totalTripNights, type BuilderState, type BuilderStep } from "./model";

/* ------------------------------------------------------------------ stepper */

export function BuilderStepper({
  steps,
  current,
  furthest,
  onSelect,
  labels,
}: {
  steps: readonly BuilderStep[];
  current: number;
  /** Highest step already validated — stays unlocked when the visitor goes back. */
  furthest: number;
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
              disabled={i > Math.max(current, furthest)}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-badge border px-4 py-2 text-caption transition-all duration-200",
                active &&
                  "border-primary/70 bg-primary/10 font-bold text-primary shadow-[inset_0_0_0_1px_transparent]",
                done && "border-transparent bg-surface-sunken/70 font-semibold text-foreground/70",
                !active &&
                  !done &&
                  "border-border-subtle bg-card font-medium text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-primary/15 text-primary"
                      : "bg-surface-sunken text-muted-foreground",
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
        "group relative flex w-full items-start gap-3 rounded-card border p-4 text-start transition-all hover:-translate-y-0.5",
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
    <div className="flex items-center justify-between gap-4 rounded-card border border-border-subtle bg-card p-4">
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
          className="grid w-full grid-cols-1 gap-3 rounded-card border border-border-subtle bg-card p-4 text-start transition-colors hover:border-primary/50 sm:grid-cols-2"
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
      {/* Cap the width on small screens so the month grid can never push the
          page sideways; scroll inside the popover instead. */}
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] overflow-auto p-0">
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

/* ----------------------------------------------------------- trip summary */

function SummaryBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-border-subtle pb-3.5 last:border-0 last:pb-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 space-y-0.5">{children}</div>
    </div>
  );
}

export function RouteVisualizer({ state }: { state: BuilderState }) {
  const { t } = useTranslation();
  const origin = state.departureAirport || t("umrahBuilder.flights.itineraryOrigin");
  const dest =
    state.returnAirport || state.departureAirport || t("umrahBuilder.flights.itineraryOrigin");

  const nodes: { label: string; badge?: string; type?: "holy" | "stopover" | "transit" }[] = [
    { label: origin },
  ];

  if (
    state.flightPreference === "stopover" &&
    state.destinationTiming === "before_umrah" &&
    state.additionalDestination.trim()
  ) {
    nodes.push({
      label: state.additionalDestination.trim(),
      badge: t("umrahBuilder.summary.additionalDestination"),
      type: "stopover",
    });
  } else if (state.flightPreference === "transit" && state.transitHub.trim()) {
    nodes.push({
      label: state.transitHub.trim(),
      badge: t("umrahBuilder.flights.preferences.transit"),
      type: "transit",
    });
  }

  const isMadinahFirst = state.arrivalAirport === "Madinah" || state.flightRoute === "المدينة / جدة";

  const makkahNode =
    state.makkahNights > 0
      ? {
          label: t("umrahBuilder.summary.makkah"),
          badge: t("umrahBuilder.summary.nightsCount", { count: state.makkahNights }),
          type: "holy" as const,
        }
      : null;

  const madinahNode =
    state.madinahNights > 0
      ? {
          label: t("umrahBuilder.summary.madinah"),
          badge: t("umrahBuilder.summary.nightsCount", { count: state.madinahNights }),
          type: "holy" as const,
        }
      : null;

  if (isMadinahFirst) {
    if (madinahNode) nodes.push(madinahNode);
    if (makkahNode) nodes.push(makkahNode);
  } else {
    if (makkahNode) nodes.push(makkahNode);
    if (madinahNode) nodes.push(madinahNode);
  }

  if (
    state.flightPreference === "stopover" &&
    state.destinationTiming === "after_umrah" &&
    state.additionalDestination.trim()
  ) {
    nodes.push({
      label: state.additionalDestination.trim(),
      badge: t("umrahBuilder.summary.additionalDestination"),
      type: "stopover",
    });
  }

  nodes.push({ label: dest });

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-caption font-semibold">
      {nodes.map((n, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground rtl:rotate-180">→</span>}
          <span
            className={cn(
              "rounded-lg px-2 py-0.5 text-[11px] transition-colors",
              n.type === "holy"
                ? "bg-primary/10 font-bold text-primary"
                : n.type === "stopover"
                  ? "bg-amber-500/10 font-bold text-amber-700 dark:text-amber-400"
                  : n.type === "transit"
                    ? "bg-sky-500/10 font-bold text-sky-700 dark:text-sky-400"
                    : "bg-surface-sunken text-foreground",
            )}
          >
            {n.label}
            {n.badge && <span className="ms-1 text-[10px] font-normal opacity-80">({n.badge})</span>}
          </span>
        </span>
      ))}
    </div>
  );
}

export function SummaryBody({
  state,
  areaLabel,
  budgetLabel,
  roomLabel,
}: {
  state: BuilderState;
  areaLabel: (city: "makkah" | "madinah", code: string) => string;
  budgetLabel: (code: string) => string;
  roomLabel?: string;
}) {
  const { t } = useTranslation();
  const { longDate } = useLocalized();

  const pending = (
    <span className="text-caption text-muted-foreground">
      {t("umrahBuilder.summary.notChosen")}
    </span>
  );

  const totalNights = totalTripNights(state);

  const stay = (city: "makkah" | "madinah") => {
    const nights = city === "makkah" ? state.makkahNights : state.madinahNights;
    const hotel = city === "makkah" ? state.makkahHotelName : state.madinahHotelName;
    const isCustom =
      city === "makkah"
        ? state.makkahMode === "custom_hotel" || (!state.makkahHotelId && !!state.makkahHotelName)
        : state.madinahMode === "custom_hotel" ||
          (!state.madinahHotelId && !!state.madinahHotelName);
    const area = city === "makkah" ? state.makkahArea : state.madinahArea;
    const budget = city === "makkah" ? state.makkahPreference : state.madinahPreference;
    const place = hotel || (area ? areaLabel(city, area) : "");
    return (
      <SummaryBlock label={t(`umrahBuilder.summary.${city}`)}>
        {place ? (
          <div>
            <p
              className={cn(
                "text-small font-bold leading-snug",
                hotel ? "text-primary" : "text-foreground",
              )}
            >
              {place}
            </p>
            {isCustom && (
              <span className="mt-0.5 inline-block rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                {t("umrahBuilder.summary.customTag")}
              </span>
            )}
          </div>
        ) : (
          <p>{pending}</p>
        )}
        <p className="text-caption text-muted-foreground">
          {nights ? t("umrahBuilder.summary.nightsCount", { count: nights }) : "—"}
          {budget ? ` · ${budgetLabel(budget)}` : ""}
        </p>
      </SummaryBlock>
    );
  };

  const travellers = [
    t("umrahBuilder.summary.adultsCount", { count: state.adults }),
    state.children ? t("umrahBuilder.summary.childrenCount", { count: state.children }) : "",
    state.infants ? t("umrahBuilder.summary.infantsCount", { count: state.infants }) : "",
  ].filter(Boolean);

  return (
    <div className="space-y-3.5">
      {state.packageTitle && (
        <SummaryBlock label="برنامج العمرة المختار">
          <p className="text-small font-bold text-primary">{state.packageTitle}</p>
          {state.flightRoute && (
            <p className="text-caption font-medium text-foreground/80">
              المسار: <span className="font-bold">{state.flightRoute}</span>
            </p>
          )}
          {state.arrivalAirport && state.returnAirport && (
            <p className="text-[11px] text-muted-foreground">
              الوصول: {state.arrivalAirport === "Jeddah" ? "جدة (JED)" : state.arrivalAirport === "Madinah" ? "المدينة المنورة (MED)" : state.arrivalAirport}
              {" · "}
              المغادرة: {state.returnAirport === "Madinah" ? "المدينة المنورة (MED)" : state.returnAirport === "Jeddah" ? "جدة (JED)" : state.returnAirport}
            </p>
          )}
          {state.packagePrice ? (
            <p className="mt-1 text-caption font-semibold text-foreground">
              السعر الرسمي: <span className="text-primary font-bold">{state.packagePrice} TND</span>
            </p>
          ) : null}
          {state.packageNotes && state.packageNotes !== "-" && (
            <p className="mt-0.5 text-[11px] text-muted-foreground italic">
              {state.packageNotes}
            </p>
          )}
        </SummaryBlock>
      )}

      <SummaryBlock label={t("umrahBuilder.summary.dates")}>
        {state.departureDate ? (
          <>
            <p className="text-small font-bold leading-snug">
              {longDate(state.departureDate)}
              {state.returnDate ? (
                <>
                  <span className="mx-1 text-muted-foreground">→</span>
                  {longDate(state.returnDate)}
                </>
              ) : null}
            </p>
            {totalNights > 0 && (
              <p className="mt-1 inline-flex items-center gap-2 text-caption font-bold text-primary">
                <span>
                  {t("umrahBuilder.summary.totalNights")}:{" "}
                  {t("umrahBuilder.summary.nightsCount", { count: totalNights })}
                </span>
              </p>
            )}
            {(state.makkahNights > 0 || state.madinahNights > 0) && (
              <p className="text-[11px] text-muted-foreground">
                {t("umrahBuilder.stay.makkahNightsSummary", { count: state.makkahNights })} ·{" "}
                {t("umrahBuilder.stay.madinahNightsSummary", { count: state.madinahNights })}
              </p>
            )}
          </>
        ) : (
          <p>{pending}</p>
        )}
      </SummaryBlock>

      <SummaryBlock label={t("umrahBuilder.summary.flights")}>
        <p className="text-small font-semibold">
          {state.airportFlexible
            ? t("umrahBuilder.flights.flexible")
            : state.departureAirport && state.returnAirport
              ? `${state.departureAirport} → ${state.returnAirport}`
              : pending}
        </p>
        {state.flightPreference && (
          <p className="text-caption text-muted-foreground">
            {state.flightPreference === "direct" && t("umrahBuilder.summary.directFlight")}
            {state.flightPreference === "transit" && (
              <>
                {t("umrahBuilder.summary.transitFlight")}
                {state.transitHub ? ` · ${state.transitHub}` : ""}
              </>
            )}
            {state.flightPreference === "stopover" && (
              <>
                {t("umrahBuilder.summary.stopoverFlight")}
                {state.additionalDestination ? `: ${state.additionalDestination}` : ""}
                {state.destinationTiming && (
                  <span className="opacity-80">
                    {" "}
                    ({t(`umrahBuilder.flights.stopoverTiming.${state.destinationTiming}`)})
                  </span>
                )}
              </>
            )}
          </p>
        )}
        {state.departureDate && state.returnDate && (
          <div className="mt-2.5">
            <RouteVisualizer state={state} />
          </div>
        )}
      </SummaryBlock>

      <SummaryBlock label={t("umrahBuilder.summary.travellers")}>
        <p className="text-small font-semibold">{travellers.join(" · ")}</p>
        {roomLabel && <p className="text-caption text-muted-foreground">{roomLabel}</p>}
      </SummaryBlock>

      {stay("makkah")}
      {stay("madinah")}
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
        <div className="sticky top-24 overflow-hidden rounded-card-lg border border-border-subtle bg-card shadow-sm">
          <div className="border-b border-border-subtle bg-surface-sunken/50 px-5 py-4">
            <h2 className="text-small font-bold tracking-wide">
              {t("umrahBuilder.summary.title")}
            </h2>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </aside>

      <div className="lg:hidden">
        <div className="overflow-hidden rounded-card-lg border border-border-subtle bg-card">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-2 bg-surface-sunken/50 p-4"
          >
            <span className="text-small font-bold">{t("umrahBuilder.summary.title")}</span>
            <ChevronDown
              className={cn("h-4 w-4 text-primary transition-transform", open && "rotate-180")}
            />
          </button>
          {open && <div className="p-5">{children}</div>}
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
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={cn(
          "h-11",
          error && "border-destructive focus-visible:ring-destructive",
        )}
      />
      {error && <p className="text-caption text-destructive">{error}</p>}
    </div>
  );
}
