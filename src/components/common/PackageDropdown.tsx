import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocalized } from "@/lib/localize";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  MapPin,
  Search,
  Sparkles,
  Tag,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import type { Package } from "@/lib/queries";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function effectivePrice(pkg: Package): number {
  if (pkg.discount_price != null) return Number(pkg.discount_price);
  if (pkg.discount && pkg.discount > 0) return Number(pkg.price) * (1 - Number(pkg.discount) / 100);
  return Number(pkg.price ?? 0);
}

export function seatsLeft(pkg: Package): number | null {
  return typeof pkg.seats === "number" ? pkg.seats : null;
}

type BadgeKind = "bestSeller" | "new" | "discount";

function badgeOf(pkg: Package): BadgeKind | null {
  if (pkg.discount_price != null || (pkg.discount ?? 0) > 0) return "discount";
  if (pkg.featured) return "bestSeller";
  const created = pkg.created_at ? new Date(pkg.created_at).getTime() : 0;
  if (created && Date.now() - created < 1000 * 60 * 60 * 24 * 30) return "new";
  return null;
}

const BADGE_STYLE: Record<BadgeKind, string> = {
  bestSeller: "bg-primary/12 text-primary",
  new: "bg-success/12 text-success",
  discount: "bg-destructive/12 text-destructive",
};

const BADGE_ICON: Record<BadgeKind, typeof Tag> = {
  bestSeller: TrendingUp,
  new: Sparkles,
  discount: Tag,
};

const ROW_HEIGHT = 104;

type Props = {
  packages: Package[];
  selected: Package | null;
  onSelect: (pkg: Package) => void;
  /** Rendered inside the mobile sheet above the list (e.g. service tabs). */
  sheetHeader?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
};

export function PackageDropdown({ packages, selected, onSelect, sheetHeader, onOpenChange }: Props) {
  const { t, i18n } = useTranslation();
  const { L, price } = useLocalized();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fmtDate = (value: string) =>
    new Date(value).toLocaleDateString(i18n.language, { day: "numeric", month: "short" });

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (p) =>
        [
          p.title,
          (p as Record<string, unknown>).title_fr,
          p.destination,
          (p as Record<string, unknown>).destination_fr,
          p.city,
          (p as Record<string, unknown>).city_fr,
        ].some((v) => typeof v === "string" && v.toLowerCase().includes(q)),
    );
  }, [packages, term]);

  useEffect(() => {
    onOpenChange?.(open);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMobile]);

  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  function pick(pkg: Package) {
    onSelect(pkg);
    setTerm("");
    setOpen(false);
  }

  const panel = (
    <>
      <div className="border-b border-border-subtle bg-card/95 p-4 backdrop-blur">
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

      {results.length === 0 ? (
        <p className="p-8 text-center text-small text-muted-foreground">{t("selector.empty")}</p>
      ) : (
        <div
          ref={scrollRef}
          role="listbox"
          aria-label={t("selector.label")}
          className={cn(
            "overflow-y-auto p-2",
            "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border",
            isMobile ? "max-h-[calc(85vh-13rem)]" : "max-h-[26rem]",
          )}
        >
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((row) => {
              const p = results[row.index];
              if (!p) return null;
              const s = seatsLeft(p);
              const limited = s != null && s <= 12;
              const badge = badgeOf(p);
              const BadgeIcon = badge ? BADGE_ICON[badge] : null;
              const isSelected = selected?.id === p.id;
              return (
                <div
                  key={p.id}
                  className="absolute inset-x-0 top-0 p-1"
                  style={{ height: row.size, transform: `translateY(${row.start}px)` }}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => pick(p)}
                    className={cn(
                      "flex h-full w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-start transition-colors duration-fast",
                      "hover:border-border-subtle hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      isSelected && "border-primary/40 bg-accent",
                    )}
                  >
                    <span className="relative h-[4.5rem] w-24 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
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
                        <span className="line-clamp-1 text-small font-bold text-foreground">{L(p, "title", "base")}</span>
                        {badge && BadgeIcon && (
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold",
                              BADGE_STYLE[badge],
                            )}
                          >
                            <BadgeIcon className="h-3 w-3" aria-hidden="true" />
                            {t(`selector.badges.${badge}`)}
                          </span>
                        )}
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                      </span>

                      {L(p, "destination", "empty") && (
                        <span className="mt-1 flex items-center gap-1 text-caption text-muted-foreground">
                          <MapPin className="h-3 w-3" aria-hidden="true" /> {L(p, "destination", "empty")}
                        </span>
                      )}

                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                        {L(p, "duration", "empty") && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden="true" /> {L(p, "duration", "empty")}
                          </span>
                        )}
                        {p.departure_date && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" aria-hidden="true" /> {fmtDate(p.departure_date)}
                          </span>
                        )}
                        {s != null && (
                          <span className={cn("inline-flex items-center gap-1", limited && "text-destructive")}>
                            <Users className="h-3 w-3" aria-hidden="true" />
                            {limited ? t("selector.limited", { count: s }) : t("selector.available")}
                          </span>
                        )}
                      </span>
                    </span>

                    <span className="shrink-0 text-end">
                      <span className="block text-caption text-muted-foreground">{t("package.from")}</span>
                      <span className="block text-small font-extrabold text-primary">
                        {price(effectivePrice(p), p.currency ?? "TND")}
                      </span>
                      {(p.discount_price != null || (p.discount ?? 0) > 0) && (
                        <span className="block text-caption text-muted-foreground line-through">
                          {price(p.price, p.currency ?? "TND")}
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center justify-between gap-4 rounded-2xl border border-input bg-background px-4 py-3.5 text-start transition-colors duration-base hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:px-5 md:py-4"
      >
        <span className="flex min-w-0 items-center gap-3">
          {selected && (
            <span className="relative hidden h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-sunken sm:block">
              {selected.cover && (
                <img src={selected.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
            </span>
          )}
          <span className="min-w-0">
            <span className="block text-caption font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t("selector.label")}
            </span>
            <span className="mt-1 block truncate text-body font-bold text-foreground">
              {selected ? L(selected, "title", "base") : t("selector.placeholder")}
            </span>
            {selected && (
              <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-caption text-muted-foreground">
                {L(selected, "destination", "empty") && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" aria-hidden="true" /> {L(selected, "destination", "empty")}
                  </span>
                )}
                {L(selected, "duration", "empty") && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" /> {L(selected, "duration", "empty")}
                  </span>
                )}
                <span className="font-semibold text-primary">
                  {price(effectivePrice(selected), selected.currency ?? "TND")}
                </span>
              </span>
            )}
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

      {open && !isMobile && (
        <div className="absolute inset-x-0 z-30 mt-2 origin-top overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-lg ds-reveal">
          {panel}
        </div>
      )}

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
            {sheetHeader}
            {panel}
          </div>
        </div>
      )}
    </div>
  );
}
