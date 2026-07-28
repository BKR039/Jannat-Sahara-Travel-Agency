import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Users, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Package } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function PackageCard({ pkg, className }: { pkg: Package; className?: string }) {
  const { t } = useTranslation();
  const discounted = pkg.discount && pkg.discount > 0
    ? Number(pkg.price) * (1 - Number(pkg.discount) / 100)
    : null;

  return (
    <Link
      to="/packages/$slug"
      params={{ slug: pkg.slug }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {pkg.cover && (
          <img
            src={pkg.cover}
            alt={pkg.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
        <div className="absolute top-3 start-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-primary/95 px-3 py-1 text-[11px] font-semibold text-primary-foreground backdrop-blur">
            {t(`categories.${pkg.category}`)}
          </span>
          {pkg.featured && (
            <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
              ★
            </span>
          )}
        </div>
        {pkg.discount && pkg.discount > 0 && (
          <div className="absolute top-3 end-3 rounded-full bg-destructive px-3 py-1 text-[11px] font-bold text-destructive-foreground">
            -{Number(pkg.discount)}%
          </div>
        )}
        {pkg.destination && (
          <div className="absolute bottom-3 start-3 flex items-center gap-1.5 text-white">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium drop-shadow">{pkg.destination}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-2 text-lg font-bold text-foreground">{pkg.title}</h3>
        {pkg.short_description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{pkg.short_description}</p>
        )}

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {pkg.duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {pkg.duration}
            </span>
          )}
          {typeof pkg.seats === "number" && pkg.seats > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {pkg.seats}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between border-t border-border pt-3">
          <div>
            <p className="text-[11px] text-muted-foreground">{t("package.from")}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-primary">
                {(discounted ?? Number(pkg.price)).toLocaleString()} {pkg.currency}
              </span>
              {discounted !== null && (
                <span className="text-xs text-muted-foreground line-through">
                  {Number(pkg.price).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Tag className="h-3.5 w-3.5" /> {t("actions.bookNow")}
          </span>
        </div>
      </div>
    </Link>
  );
}
