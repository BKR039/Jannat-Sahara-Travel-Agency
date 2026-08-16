import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, MapPin, Search, Sparkles, Star, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalized } from "@/lib/localize";
import { hotelsQuery, type Hotel } from "@/lib/queries";

type City = "makkah" | "madinah";
type SortKey = "distance" | "name" | "area";

const SORTS: readonly SortKey[] = ["distance", "name", "area"] as const;

function distanceOf(hotel: Hotel, city: City): number | null {
  const raw = city === "makkah" ? hotel.distance_to_haram : hotel.distance_to_masjid_nabawi;
  return typeof raw === "number" ? raw : null;
}

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
          <p className="mt-1.5 text-body font-semibold text-foreground">
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
      <Search className="pointer-events-none absolute inset-y-0 start-5 my-auto h-[18px] w-[18px] text-muted-foreground transition-colors group-focus-within:text-primary" />
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

/* ----------------------------------------------------------------- filters */

function HotelFilters({
  value,
  onChange,
  options,
}: {
  value: SortKey;
  onChange: (key: SortKey) => void;
  options: readonly SortKey[];
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-caption font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {t("umrahBuilder.hotels.sortLabel")}
      </span>
      <div className="flex flex-wrap gap-1.5 rounded-full border border-border-subtle bg-surface-sunken/50 p-1">
        {options.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-caption font-semibold transition-all duration-200",
              value === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`umrahBuilder.hotels.sort.${key}`)}
          </button>
        ))}
      </div>
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
  const { L, number } = useLocalized();
  const location = L(hotel as unknown as Record<string, unknown>, "location", "base");
  const area = hotel.area
    ? t(`umrahBuilder.areas.${city}.${hotel.area}`, { defaultValue: hotel.area })
    : "";
  const cityLabel = t(`umrahBuilder.summary.${city}`);
  const place = [area, location].filter(Boolean).join(" · ");
  const distance = distanceOf(hotel, city);
  const stars = typeof hotel.stars === "number" && hotel.stars > 0 ? hotel.stars : null;

  return (
    <label
      className={cn(
        "group relative block cursor-pointer overflow-hidden rounded-3xl border bg-card p-5 transition-all duration-200 sm:p-6",
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
        <p
          className={cn(
            "text-caption font-bold uppercase tracking-[0.18em]",
            selected ? "text-primary" : "text-muted-foreground",
          )}
        >
          {cityLabel}
        </p>
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

      <h3 className="mt-2.5 break-words text-h4 leading-snug text-foreground">{name}</h3>

      {(place || stars) && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-muted-foreground">
          {place && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
              <span className="break-words">{place}</span>
            </span>
          )}
          {stars && (
            <span className="inline-flex items-center gap-1 text-foreground/80">
              <Star className="h-3.5 w-3.5 fill-current text-secondary" />
              {number(stars)}
            </span>
          )}
        </p>
      )}

      {distance !== null && (
        <p className="mt-3.5 inline-flex items-center rounded-full bg-surface-sunken px-3.5 py-1.5 text-caption font-bold text-foreground">
          {t(
            city === "makkah"
              ? "umrahBuilder.hotels.distanceHaram"
              : "umrahBuilder.hotels.distanceMasjid",
            { value: number(distance) },
          )}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
        <span
          className={cn(
            "text-caption font-bold transition-colors",
            selected ? "text-primary" : "text-muted-foreground group-hover:text-primary",
          )}
        >
          {selected ? t("umrahBuilder.hotels.selected") : t("umrahBuilder.hotels.select")}
        </span>
      </div>

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
          <div className="h-3 w-16 animate-pulse rounded-full bg-surface-sunken" />
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
  tone?: "muted" | "error";
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-6",
        tone === "error"
          ? "border-destructive/30 bg-destructive/5"
          : "border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card",
      )}
    >
      <p className="flex items-center gap-2 text-caption font-bold uppercase tracking-[0.18em] text-primary">
        {tone === "error" ? (
          <TriangleAlert className="h-4 w-4 text-destructive" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {title}
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
  nights = 0,
  from = "",
  to = "",
}: {
  city: City;
  selectedId: string | null;
  onSelect: (hotel: Hotel, name: string) => void;
  /** Switch the builder to the "suggest an area" fallback flow. */
  onFallback: () => void;
  nights?: number;
  from?: string;
  to?: string;
}) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("distance");
  const { data: hotels, isLoading, isError } = useQuery(hotelsQuery(city));

  const rows = hotels ?? [];
  const hasDistance = rows.some((h) => distanceOf(h, city) !== null);
  const hasArea = rows.some((h) => !!h.area);
  const sortOptions = SORTS.filter(
    (k) => (k === "distance" ? hasDistance : k === "area" ? hasArea : true),
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const named = rows.map((hotel) => ({
      hotel,
      name: L(hotel as unknown as Record<string, unknown>, "name", "base"),
    }));
    const matched = needle
      ? named.filter(({ hotel, name }) =>
          [name, hotel.area, L(hotel as unknown as Record<string, unknown>, "location", "base")]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(needle)),
        )
      : named;
    const active = sortOptions.includes(sort) ? sort : "name";
    return [...matched].sort((a, b) => {
      if (active === "distance") {
        const da = distanceOf(a.hotel, city);
        const db = distanceOf(b.hotel, city);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      }
      if (active === "area") {
        return String(a.hotel.area ?? "").localeCompare(String(b.hotel.area ?? ""));
      }
      return a.name.localeCompare(b.name);
    });
  }, [rows, search, sort, sortOptions, city, L]);

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

      <div className="space-y-4">
        <HotelSearch
          value={search}
          onChange={setSearch}
          placeholder={t("umrahBuilder.hotels.searchPlaceholder")}
        />
        {sortOptions.length > 1 && (
          <HotelFilters value={sort} onChange={setSort} options={sortOptions} />
        )}
      </div>

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
