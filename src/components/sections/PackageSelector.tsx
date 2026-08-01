import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Compass,
  Hotel,
  MapPin,
  Plane,
  Search,
  Sparkles,
  Stamp,
  Users,
  X,
} from "lucide-react";

import { packagesQuery, type Package, type PackageCategory } from "@/lib/queries";
import { PackageCard } from "@/components/common/PackageCard";
import { SkeletonGrid, EmptyState } from "@/components/common/SkeletonGrid";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const SERVICES = [
  { key: "umrah", icon: Sparkles },
  { key: "trip", icon: Compass },
  { key: "flight", icon: Plane },
  { key: "visa", icon: Stamp },
] as const;

function effectivePrice(pkg: Package): number {
  if (pkg.discount_price != null) return Number(pkg.discount_price);
  if (pkg.discount && pkg.discount > 0) return Number(pkg.price) * (1 - Number(pkg.discount) / 100);
  return Number(pkg.price ?? 0);
}

function seatsLeft(pkg: Package): number | null {
  return typeof pkg.seats === "number" ? pkg.seats : null;
}

export function PackageSelector() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data, isLoading } = useQuery(packagesQuery());

  const [service, setService] = useState<PackageCategory>("umrah");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const searched = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return byService;
    return byService.filter((p) => p.title.toLowerCase().includes(q));
  }, [byService, term]);

  const selected = useMemo(
    () => byService.find((p) => p.id === selectedId) ?? null,
    [byService, selectedId],
  );

  // close on outside click / escape (desktop dropdown + mobile sheet)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (isMobile) return;
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [open, isMobile]);

  function pick(pkg: Package) {
    setSelectedId(pkg.id);
    setOpen(false);
    setTerm("");
  }

  const list = (
    <>
      <div className="sticky top-0 z-10 border-b border-border-subtle bg-card/95 p-4 backdrop-blur">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t("selector.searchPlaceholder")}
            aria-label={t("selector.searchPlaceholder")}
            className="h-12 w-full rounded-xl border border-input bg-background ps-10 pe-3 text-small outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>
      </div>

      <ul
        className={cn(
          "overflow-y-auto p-2",
          "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border",
          isMobile ? "max-h-[calc(85vh-11rem)]" : "max-h-[28rem]",
        )}
      >
        {searched.length === 0 && (
          <li className="p-8 text-center text-small text-muted-foreground">{t("selector.empty")}</li>
        )}
        {searched.map((p) => {
          const s = seatsLeft(p);
          const limited = s != null && s <= 12;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => pick(p)}
                aria-pressed={selectedId === p.id}
                className={cn(
                  "flex w-full items-center gap-4 rounded-xl p-3 text-start transition-colors duration-fast",
                  "hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  selectedId === p.id && "bg-accent",
                )}
              >
                <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-sunken sm:h-20 sm:w-28">
                  {p.cover && (
                    <img
                      src={p.cover}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="line-clamp-1 text-small font-bold text-foreground">{p.title}</span>
                    {selectedId === p.id && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                  </span>
                  {p.destination && (
                    <span className="mt-0.5 flex items-center gap-1 text-caption text-muted-foreground">
                      <MapPin className="h-3 w-3" aria-hidden="true" /> {p.destination}
                    </span>
                  )}
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                    {p.duration && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" /> {p.duration}
                      </span>
                    )}
                    {p.departure_date && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" aria-hidden="true" /> {fmtDate(p.departure_date)}
                      </span>
                    )}
                  </span>
                </span>

                <span className="shrink-0 text-end">
                  <span className="block text-caption text-muted-foreground">{t("package.from")}</span>
                  <span className="block text-small font-extrabold text-primary">
                    {effectivePrice(p).toLocaleString()} {p.currency}
                  </span>
                  {s != null && (
                    <span
                      className={cn(
                        "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold",
                        limited ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success",
                      )}
                    >
                      <Users className="h-3 w-3" aria-hidden="true" />
                      {limited ? t("selector.limited", { count: s }) : t("selector.available")}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
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
              setOpen(false);
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
      <div
        ref={rootRef}
        className="relative mt-6 rounded-2xl border border-border-subtle bg-card p-5 shadow-md md:p-7"
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-input bg-background px-5 py-4 text-start transition-colors duration-base hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="min-w-0">
            <span className="block text-caption font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t("selector.label")}
            </span>
            <span className="mt-1 block truncate text-body font-bold text-foreground">
              {selected ? selected.title : t("selector.placeholder")}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-base",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        {/* desktop dropdown */}
        {open && !isMobile && (
          <div className="absolute inset-x-5 z-30 mt-2 origin-top overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-lg ds-reveal md:inset-x-7">
            {list}
          </div>
        )}

        {/* mobile bottom sheet */}
        {open && isMobile && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <button
              type="button"
              aria-label={t("selector.close")}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
            />
            <div className="relative max-h-[85vh] overflow-hidden rounded-t-3xl border-t border-border-subtle bg-card shadow-lg">
              <div className="flex items-center justify-between px-4 pt-4">
                <p className="text-card-title">{t("selector.label")}</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("selector.close")}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* service switcher inside the sheet */}
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
                      setTerm("");
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
              {list}
            </div>
          </div>
        )}

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
