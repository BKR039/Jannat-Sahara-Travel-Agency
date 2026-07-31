import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Compass, Plane, RotateCcw, Sparkles, Stamp, LayoutGrid } from "lucide-react";

import { packagesQuery, type Package, type PackageCategory } from "@/lib/queries";
import { PackageCard } from "@/components/common/PackageCard";
import { SkeletonGrid, EmptyState } from "@/components/common/SkeletonGrid";

const SERVICES = [
  { key: "all", icon: LayoutGrid },
  { key: "umrah", icon: Sparkles },
  { key: "trip", icon: Compass },
  { key: "flight", icon: Plane },
  { key: "visa", icon: Stamp },
] as const;

type ServiceFilter = (typeof SERVICES)[number]["key"];

const DURATIONS = ["all", "short", "medium", "long"] as const;
const PRICES = ["all", "low", "mid", "high"] as const;
const AVAILABILITY = ["all", "available"] as const;

function durationNights(pkg: Package): number | null {
  const match = pkg.duration?.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function effectivePrice(pkg: Package): number {
  if (pkg.discount_price != null) return Number(pkg.discount_price);
  if (pkg.discount && pkg.discount > 0) return Number(pkg.price) * (1 - Number(pkg.discount) / 100);
  return Number(pkg.price ?? 0);
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-small font-semibold transition-all duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-brand-glow"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-caption font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-md border border-input bg-background px-3 text-small font-medium outline-none transition-colors duration-fast hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PackageExplorer() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery(packagesQuery());

  const [service, setService] = useState<ServiceFilter>("all");
  const [destination, setDestination] = useState("all");
  const [duration, setDuration] = useState<string>("all");
  const [price, setPrice] = useState<string>("all");
  const [month, setMonth] = useState("all");
  const [availability, setAvailability] = useState<string>("all");

  const all = data ?? [];

  const destinations = useMemo(
    () => Array.from(new Set(all.map((p) => p.destination).filter(Boolean) as string[])).sort(),
    [all],
  );

  const months = useMemo(() => {
    const set = new Map<string, string>();
    all.forEach((p) => {
      if (!p.departure_date) return;
      const d = new Date(p.departure_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      set.set(
        key,
        d.toLocaleDateString(i18n.language, { month: "long", year: "numeric" }),
      );
    });
    return Array.from(set.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [all, i18n.language]);

  const filtered = useMemo(
    () =>
      all.filter((p) => {
        if (service !== "all" && p.category !== (service as PackageCategory)) return false;
        if (destination !== "all" && p.destination !== destination) return false;

        if (duration !== "all") {
          const n = durationNights(p);
          if (n == null) return false;
          if (duration === "short" && n > 7) return false;
          if (duration === "medium" && (n < 8 || n > 14)) return false;
          if (duration === "long" && n < 15) return false;
        }

        if (price !== "all") {
          const v = effectivePrice(p);
          if (price === "low" && v >= 3000) return false;
          if (price === "mid" && (v < 3000 || v > 7000)) return false;
          if (price === "high" && v <= 7000) return false;
        }

        if (month !== "all") {
          if (!p.departure_date) return false;
          const d = new Date(p.departure_date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (key !== month) return false;
        }

        if (availability === "available") {
          if (p.status === "sold_out") return false;
          if (typeof p.seats === "number" && p.seats <= 0) return false;
        }

        return true;
      }),
    [all, service, destination, duration, price, month, availability],
  );

  const featuredUmrah = filtered.filter((p) => p.category === "umrah");
  const featuredTrips = filtered.filter((p) => p.category === "trip");
  const others = filtered.filter((p) => p.category !== "umrah" && p.category !== "trip");

  const dirty =
    service !== "all" ||
    destination !== "all" ||
    duration !== "all" ||
    price !== "all" ||
    month !== "all" ||
    availability !== "all";

  function reset() {
    setService("all");
    setDestination("all");
    setDuration("all");
    setPrice("all");
    setMonth("all");
    setAvailability("all");
  }

  return (
    <section id="packages" className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
      <header className="max-w-2xl">
        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-primary">
          {t("explorer.eyebrow")}
        </p>
        <h2 className="mt-2 text-h2 font-extrabold">{t("explorer.title")}</h2>
        <p className="mt-3 text-body text-muted-foreground">{t("explorer.subtitle")}</p>
      </header>

      {/* ---------- filters (selection only, no typing) */}
      <div className="mt-8 rounded-xl border border-border-subtle bg-card p-6 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {SERVICES.map(({ key, icon: Icon }) => (
            <Chip key={key} active={service === key} onClick={() => setService(key)}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              {key === "all" ? t("explorer.allServices") : t(`categories.${key}`)}
            </Chip>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SelectField
            label={t("explorer.destination")}
            value={destination}
            onChange={setDestination}
            options={[
              { value: "all", label: t("explorer.any") },
              ...destinations.map((d) => ({ value: d, label: d })),
            ]}
          />
          <SelectField
            label={t("explorer.duration")}
            value={duration}
            onChange={setDuration}
            options={DURATIONS.map((d) => ({
              value: d,
              label: d === "all" ? t("explorer.any") : t(`explorer.durations.${d}`),
            }))}
          />
          <SelectField
            label={t("explorer.price")}
            value={price}
            onChange={setPrice}
            options={PRICES.map((p) => ({
              value: p,
              label: p === "all" ? t("explorer.any") : t(`explorer.prices.${p}`),
            }))}
          />
          <SelectField
            label={t("explorer.month")}
            value={month}
            onChange={setMonth}
            options={[
              { value: "all", label: t("explorer.any") },
              ...months.map(([value, label]) => ({ value, label })),
            ]}
          />
          <SelectField
            label={t("explorer.availability")}
            value={availability}
            onChange={setAvailability}
            options={AVAILABILITY.map((a) => ({
              value: a,
              label: a === "all" ? t("explorer.any") : t("explorer.availableOnly"),
            }))}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-small text-muted-foreground">
            {t("explorer.results", { count: filtered.length })}
          </p>
          {dirty && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 text-small font-semibold text-primary hover:underline"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t("explorer.reset")}
            </button>
          )}
        </div>
      </div>

      {/* ---------- results */}
      {isLoading ? (
        <div className="mt-10">
          <SkeletonGrid count={8} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10">
          <EmptyState label={t("explorer.empty")} />
        </div>
      ) : (
        <div className="mt-12 space-y-16">
          <Group title={t("explorer.groups.umrah")} items={featuredUmrah} />
          <Group title={t("explorer.groups.trips")} items={featuredTrips} />
          <Group title={t("explorer.groups.other")} items={others} />
        </div>
      )}
    </section>
  );
}

function Group({ title, items }: { title: string; items: Package[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-6 text-h3 font-extrabold">{title}</h3>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((p, i) => (
          <div key={p.id} className="ds-reveal" style={{ animationDelay: `${i * 60}ms` }}>
            <PackageCard pkg={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
