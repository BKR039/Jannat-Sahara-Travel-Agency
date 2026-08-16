import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Building2, Search, TriangleAlert } from "lucide-react";
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
    <div className="relative">
      <Search className="pointer-events-none absolute inset-y-0 start-4 my-auto h-4 w-4 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-border-subtle bg-card ps-11 pe-4 text-small outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
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
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-caption text-muted-foreground">{t("umrahBuilder.hotels.sortLabel")}</span>
      {options.map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-caption font-semibold transition-colors",
            value === key
              ? "border-primary bg-primary/10 text-primary"
              : "border-border-subtle bg-card text-muted-foreground hover:border-primary/40",
          )}
        >
          {t(`umrahBuilder.hotels.sort.${key}`)}
        </button>
      ))}
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
  const location = L(hotel, "location", "base");
  const area = hotel.area
    ? t(`umrahBuilder.areas.${city}.${hotel.area}`, { defaultValue: hotel.area })
    : "";
  const cityLabel = t(`umrahBuilder.summary.${city}`);
  const secondary = [area, location].filter(Boolean).join(" · ");
  const distance = distanceOf(hotel, city);

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-4 rounded-2xl border bg-card p-4 transition-colors",
        selected
          ? "border-primary bg-primary/[0.05]"
          : "border-border-subtle hover:border-primary/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          selected ? "bg-primary/15 text-primary" : "bg-surface-sunken text-muted-foreground",
        )}
        aria-hidden="true"
      >
        <Building2 className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block break-words text-small font-bold text-foreground">{name}</span>
        <span className="mt-1 block break-words text-caption text-muted-foreground">
          {secondary ? `${cityLabel} · ${secondary}` : cityLabel}
        </span>
        {distance !== null && (
          <span className="mt-1 block text-caption text-muted-foreground">
            {t(
              city === "makkah"
                ? "umrahBuilder.hotels.distanceHaram"
                : "umrahBuilder.hotels.distanceMasjid",
              { value: number(distance) },
            )}
          </span>
        )}
      </span>

      <input
        type="radio"
        name={groupName}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected ? "border-primary" : "border-border",
        )}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </span>
    </label>
  );
}

/* -------------------------------------------------------------- edge states */

function HotelLoadingState() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-start gap-4 rounded-2xl border border-border-subtle bg-card p-4"
        >
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-surface-sunken" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-surface-sunken" />
            <div className="h-3 w-1/3 animate-pulse rounded-full bg-surface-sunken" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HotelNotice({
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
        "space-y-2 rounded-2xl border p-5",
        tone === "error" ? "border-destructive/30 bg-destructive/5" : "border-border-subtle bg-card",
      )}
    >
      <p className="flex items-center gap-2 text-small font-semibold">
        {tone === "error" && <TriangleAlert className="h-4 w-4 text-destructive" />}
        {title}
      </p>
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-caption font-semibold text-primary underline-offset-4 hover:underline"
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
}: {
  city: City;
  selectedId: string | null;
  onSelect: (hotel: Hotel, name: string) => void;
  /** Switch the builder to the "suggest an area" fallback flow. */
  onFallback: () => void;
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
      <HotelNotice
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
      <HotelNotice
        title={t("umrahBuilder.hotels.noneTitle")}
        hint={t("umrahBuilder.hotels.noneHint")}
        actionLabel={t("umrahBuilder.hotels.fallbackAction")}
        onAction={onFallback}
      />
    );
  }

  return (
    <div className="space-y-4">
      <HotelSearch
        value={search}
        onChange={setSearch}
        placeholder={t("umrahBuilder.hotels.searchPlaceholder")}
      />
      {sortOptions.length > 1 && (
        <HotelFilters value={sort} onChange={setSort} options={sortOptions} />
      )}

      {visible.length === 0 ? (
        <HotelNotice
          title={t("umrahBuilder.hotels.empty")}
          actionLabel={t("umrahBuilder.hotels.fallbackAction")}
          onAction={onFallback}
        />
      ) : (
        <div className="space-y-3" role="radiogroup" aria-label={t(`umrahBuilder.${city}.title`)}>
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

      <button
        type="button"
        onClick={onFallback}
        className="text-caption font-semibold text-primary underline-offset-4 hover:underline"
      >
        {t("umrahBuilder.hotels.fallbackAction")}
      </button>
    </div>
  );
}
