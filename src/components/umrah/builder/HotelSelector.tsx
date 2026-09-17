import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, MapPin, Search, Sparkles, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalized } from "@/lib/localize";
import { hotelsQuery, type Hotel } from "@/lib/queries";

/**
 * Hotel selection for the Umrah builder.
 *
 * Deliberately shows only what the agency actually maintains: the hotel name
 * and where it is. Star ratings, distances, amenities and images are NOT
 * displayed — those columns exist in the schema but are not curated, so
 * rendering them would present unverified data as agency knowledge. No price
 * and no availability is shown anywhere: this is a request, not a booking.
 */

type City = "makkah" | "madinah";

/* ------------------------------------------------------------ stay context */

function StayContext({
  city,
  nights,
  from,
  to,
  count,
}: {
  city: City;
  nights: number;
  from: string;
  to: string;
  count: number;
}) {
  const { t } = useTranslation();
  const { longDate } = useLocalized();
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-border-subtle bg-surface-sunken/50 px-5 py-4">
      <div className="min-w-0">
        <p className="text-caption font-bold uppercase tracking-[0.18em] text-primary">
          {t("umrahBuilder.hotels.stayLabel")} · {t(`umrahBuilder.summary.${city}`)}
        </p>
        {from && to && (
          <p className="mt-1.5 break-words text-body font-semibold text-foreground">
            {longDate(from)} <span className="text-muted-foreground">→</span> {longDate(to)}
          </p>
        )}
        <p className="mt-0.5 text-caption text-muted-foreground">
          {t("umrahBuilder.summary.nightsCount", { count: nights })}
        </p>
      </div>
      <p className="text-caption font-semibold text-muted-foreground">
        {t("umrahBuilder.hotels.count", { count })}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ search */

function HotelSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="group relative">
      <Search className="pointer-events-none absolute inset-y-0 start-5 my-auto h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onChange("");
        }}
        placeholder={placeholder}
        className="h-14 w-full rounded-2xl border border-border-subtle bg-surface-sunken/40 ps-14 pe-5 text-body outline-none transition-all placeholder:text-muted-foreground focus:border-primary/60 focus:bg-card focus:shadow-md"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ option */

function HotelOption({
  hotel,
  city,
  selected,
  onSelect,
  name,
  groupName,
}: {
  hotel: Hotel;
  city: City;
  selected: boolean;
  onSelect: () => void;
  name: string;
  groupName: string;
}) {
  const { t } = useTranslation();
  const { L } = useLocalized();

  // Where the hotel is: the curated area code when present, otherwise the
  // free-text location. Nothing else is inferred.
  const area = hotel.area
    ? t(`umrahBuilder.areas.${city}.${hotel.area}`, { defaultValue: "" })
    : "";
  const location = L(hotel as unknown as Record<string, unknown>, "location", "empty");
  const cityLabel = t(`umrahBuilder.summary.${city}`);
  const place = [cityLabel, area || location].filter(Boolean).join(" · ");

  return (
    <label
      className={cn(
        "group relative flex cursor-pointer flex-col gap-4 overflow-hidden rounded-3xl border bg-card p-5 transition-all duration-200 sm:p-6",
        selected
          ? "border-primary/60 bg-primary/[0.04] shadow-lg"
          : "border-border-subtle hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md",
      )}
    >
      {/* Warm accent rail — RTL aware via logical inset */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 start-0 w-1 transition-opacity duration-200",
          selected ? "bg-primary opacity-100" : "bg-primary/50 opacity-0 group-hover:opacity-100",
        )}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-h4 leading-snug text-foreground">{name}</h3>
          <p className="mt-2 flex items-start gap-1.5 text-small text-muted-foreground">
            <MapPin className="ds-icon-lead text-primary/70" aria-hidden="true" />
            <span className="break-words">{place}</span>
          </p>
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-transparent group-hover:border-primary/50",
          )}
        >
          <Check className="h-4 w-4" />
        </span>
      </div>

      <span
        className={cn(
          "inline-flex min-h-11 items-center justify-center self-start rounded-full border px-6 text-caption font-bold transition-colors",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-primary/40 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
        )}
      >
        {selected ? t("umrahBuilder.hotels.selected") : t("umrahBuilder.hotels.select")}
      </span>

      <input
        type="radio"
        name={groupName}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
    </label>
  );
}

/* -------------------------------------------------------------- edge states */

function HotelLoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 rounded-3xl border border-border-subtle bg-card p-6">
          <div className="h-5 w-2/3 animate-pulse rounded-full bg-surface-sunken" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-surface-sunken" />
          <div className="h-8 w-32 animate-pulse rounded-full bg-surface-sunken" />
        </div>
      ))}
    </div>
  );
}

/** Premium concierge offer — replaces the plain "I don't know" fallback. */
function ConciergeCard({
  title,
  hint,
  actionLabel,
  onAction,
  tone = "muted",
}: {
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "muted" | "error" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-6",
        tone === "error"
          ? "border-destructive/30 bg-destructive/5"
          : tone === "warning"
            ? "border-secondary/40 bg-secondary/10"
            : "border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card",
      )}
    >
      <p className="flex items-start gap-2 text-caption font-bold uppercase tracking-[0.18em] text-primary">
        {tone === "error" ? (
          <TriangleAlert className="mt-px h-4 w-4 shrink-0 text-destructive" />
        ) : tone === "warning" ? (
          <TriangleAlert className="mt-px h-4 w-4 shrink-0 text-secondary" />
        ) : (
          <Sparkles className="mt-px h-4 w-4 shrink-0" />
        )}
        <span className="break-words">{title}</span>
      </p>
      {hint && <p className="mt-2 max-w-xl text-small text-muted-foreground">{hint}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-primary/40 bg-card px-5 text-caption font-bold text-primary transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- selector */

export function HotelSelector({
  city,
  selectedId,
  onSelect,
  onFallback,
  onStaleSelection,
  nights = 0,
  from = "",
  to = "",
}: {
  city: City;
  selectedId: string | null;
  onSelect: (hotel: Hotel, name: string) => void;
  /** Switch the builder to the "suggest an area" fallback flow. */
  onFallback: () => void;
  /** The stored hotel is gone from the catalogue — clear it upstream. */
  onStaleSelection: () => void;
  nights?: number;
  from?: string;
  to?: string;
}) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const [search, setSearch] = useState("");
  const { data: hotels, isLoading, isError } = useQuery(hotelsQuery(city));

  const rows = useMemo(() => hotels ?? [], [hotels]);

  /**
   * A restored draft can point at a hotel that has since been deactivated or
   * deleted. Detect it once the catalogue has loaded, tell the visitor plainly
   * and clear the choice — never silently swap in a different hotel.
   */
  const staleSelection =
    !isLoading && !isError && !!selectedId && !rows.some((h) => h.id === selectedId);

  // Report each stale id exactly once; the callback identity changes per render.
  const reportedStaleId = useRef<string | null>(null);
  useEffect(() => {
    if (staleSelection && selectedId && reportedStaleId.current !== selectedId) {
      reportedStaleId.current = selectedId;
      onStaleSelection();
    }
  }, [staleSelection, selectedId, onStaleSelection]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const named = rows.map((hotel) => ({
      hotel,
      name: L(hotel as unknown as Record<string, unknown>, "name", "base"),
    }));
    if (!needle) return named;
    return named.filter(({ hotel, name }) =>
      [name, hotel.area, L(hotel as unknown as Record<string, unknown>, "location", "empty")]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [rows, search, L]);

  if (isLoading) return <HotelLoadingState />;

  if (isError) {
    return (
      <ConciergeCard
        tone="error"
        title={t("umrahBuilder.hotels.errorTitle")}
        hint={t("umrahBuilder.hotels.errorHint")}
        actionLabel={t("umrahBuilder.hotels.fallbackAction")}
        onAction={onFallback}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <ConciergeCard
        title={t("umrahBuilder.hotels.noneTitle")}
        hint={t("umrahBuilder.hotels.noneHint")}
        actionLabel={t("umrahBuilder.hotels.fallbackAction")}
        onAction={onFallback}
      />
    );
  }

  return (
    <div className="space-y-5">
      <StayContext city={city} nights={nights} from={from} to={to} count={rows.length} />

      {staleSelection && (
        <ConciergeCard
          tone="warning"
          title={t("umrahBuilder.hotels.staleTitle")}
          hint={t("umrahBuilder.hotels.staleHint")}
        />
      )}

      <HotelSearch
        value={search}
        onChange={setSearch}
        placeholder={t("umrahBuilder.hotels.searchPlaceholder")}
      />

      {visible.length === 0 ? (
        <ConciergeCard
          title={t("umrahBuilder.hotels.empty")}
          hint={t("umrahBuilder.hotels.conciergeDesc")}
          actionLabel={t("umrahBuilder.hotels.fallbackAction")}
          onAction={onFallback}
        />
      ) : (
        <div
          className="ds-reveal grid gap-4 sm:grid-cols-2"
          role="radiogroup"
          aria-label={t(`umrahBuilder.${city}.title`)}
        >
          {visible.map(({ hotel, name }) => (
            <HotelOption
              key={hotel.id}
              hotel={hotel}
              city={city}
              name={name}
              groupName={`builder-hotel-${city}`}
              selected={selectedId === hotel.id}
              onSelect={() => onSelect(hotel, name)}
            />
          ))}
        </div>
      )}

      <ConciergeCard
        title={t("umrahBuilder.hotels.conciergeTitle")}
        hint={t("umrahBuilder.hotels.conciergeDesc")}
        actionLabel={t("umrahBuilder.hotels.fallbackAction")}
        onAction={onFallback}
      />
    </div>
  );
}
