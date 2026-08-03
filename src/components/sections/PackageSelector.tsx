import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Compass,
  Hotel,
  MapPin,
  Sparkles,
  Stamp,
  Users,
} from "lucide-react";

import { packagesQuery, type Package, type PackageCategory } from "@/lib/queries";
import { PackageCard } from "@/components/common/PackageCard";
import { PackageDropdown, effectivePrice, seatsLeft } from "@/components/common/PackageDropdown";
import { SkeletonGrid, EmptyState } from "@/components/common/SkeletonGrid";
import { cn } from "@/lib/utils";

const SERVICES = [
  { key: "umrah", icon: Sparkles },
  { key: "trip", icon: Compass },
  { key: "visa", icon: Stamp },
] as const;

export function PackageSelector() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(packagesQuery());

  const [service, setService] = useState<PackageCategory>("umrah");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fmtDate = (value: string) =>
    new Date(value).toLocaleDateString(i18n.language, { day: "numeric", month: "short" });

  const available = useMemo(() => {
    const list = (data ?? []).filter(
      (p) => p.status === "published" && (seatsLeft(p) == null || seatsLeft(p)! > 0),
    );
    return list.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      const da = a.departure_date ? new Date(a.departure_date).getTime() : Infinity;
      const db = b.departure_date ? new Date(b.departure_date).getTime() : Infinity;
      if (da !== db) return da - db;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  }, [data]);

  const byService = useMemo(
    () => available.filter((p) => p.category === service),
    [available, service],
  );

  const selected = useMemo(
    () => byService.find((p) => p.id === selectedId) ?? null,
    [byService, selectedId],
  );

  const sheetTabs = (
    <div
      role="tablist"
      aria-label={t("selector.services")}
      className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1 [&::-webkit-scrollbar]:hidden"
    >
      {SERVICES.map(({ key, icon: Icon }) => (
        <button
          key={key}
          role="tab"
          type="button"
          aria-selected={service === key}
          onClick={() => {
            setService(key);
            setSelectedId(null);
          }}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-caption font-semibold transition-colors duration-base",
            service === key
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {t(`categories.${key}`)}
        </button>
      ))}
    </div>
  );

  return (
    <section id="packages" className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
      <header className="max-w-2xl">
        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-primary">
          {t("explorer.eyebrow")}
        </p>
        <h2 className="mt-2 text-h2 font-extrabold">{t("explorer.title")}</h2>
        <p className="mt-3 text-body text-muted-foreground">{t("selector.subtitle")}</p>
      </header>

      {/* ---------- service tabs */}
      <div role="tablist" aria-label={t("selector.services")} className="mt-8 flex flex-wrap gap-2">
        {SERVICES.map(({ key, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={service === key}
            onClick={() => {
              setService(key);
              setSelectedId(null);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-small font-semibold transition-all duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              service === key
                ? "border-primary bg-primary text-primary-foreground shadow-brand-glow"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t(`categories.${key}`)}
          </button>
        ))}
      </div>

      {/* ---------- selector card */}
      <div className="relative mt-6 rounded-2xl border border-border-subtle bg-card p-5 shadow-md md:p-7">
        <PackageDropdown
          packages={byService}
          selected={selected}
          onSelect={(p) => setSelectedId(p.id)}
          sheetHeader={sheetTabs}
        />


        <p className="mt-4 text-small text-muted-foreground">
          {t("explorer.results", { count: byService.length })}
        </p>

        {/* ---------- selected preview */}
        {selected && (
          <div className="mt-6 grid gap-5 rounded-2xl border border-border-subtle bg-surface-sunken p-4 sm:grid-cols-[12rem_1fr] md:p-5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
              {selected.cover && (
                <img
                  src={selected.cover}
                  alt={selected.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-card-title">{selected.title}</h3>
                {selected.destination && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-small text-muted-foreground">
                    <MapPin className="h-4 w-4" aria-hidden="true" /> {selected.destination}
                  </p>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-caption text-muted-foreground sm:grid-cols-3">
                {selected.departure_date && (
                  <div className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {fmtDate(selected.departure_date)}
                  </div>
                )}
                {selected.duration && (
                  <div className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {selected.duration}
                  </div>
                )}
                {selected.hotel && (
                  <div className="inline-flex items-center gap-1.5">
                    <Hotel className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="line-clamp-1">{selected.hotel}</span>
                  </div>
                )}
                {seatsLeft(selected) != null && (
                  <div className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("selector.seatsLeft", { count: seatsLeft(selected)! })}
                  </div>
                )}
              </dl>

              <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-border-subtle pt-4">
                <div>
                  <p className="text-caption text-muted-foreground">{t("package.from")}</p>
                  <p className="text-h4 text-primary">
                    {effectivePrice(selected).toLocaleString()} {selected.currency}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/packages/$slug"
                    params={{ slug: selected.slug }}
                    className="inline-flex h-11 items-center justify-center rounded-md border border-border px-4 text-small font-semibold text-foreground transition-colors duration-fast hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {t("actions.viewDetails")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/booking", search: { pkg: selected.slug } })}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-6 text-small font-semibold text-primary-foreground transition-colors duration-fast hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {t("selector.continue")}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------- visual browse grid */}
      {isLoading ? (
        <div className="mt-12">
          <SkeletonGrid count={8} />
        </div>
      ) : byService.length === 0 ? (
        <div className="mt-12">
          <EmptyState label={t("explorer.empty")} />
        </div>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {byService.map((p, i) => (
            <div key={p.id} className="ds-reveal" style={{ animationDelay: `${i * 60}ms` }}>
              <PackageCard pkg={p} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
