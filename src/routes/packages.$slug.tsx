import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, X, MapPin, Clock, Users, Hotel, Plane, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { packageBySlugQuery } from "@/lib/queries";

export const Route = createFileRoute("/packages/$slug")({
  head: () => ({
    meta: [
      { title: "باقة — جنة الصحراء" },
      { property: "og:type", content: "product" },
    ],
  }),
  component: PackagePage,
});

function PackagePage() {
  const { slug } = Route.useParams();
  const { t } = useTranslation();
  const { data: pkg, isLoading } = useQuery(packageBySlugQuery(slug));

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-6xl animate-pulse space-y-6 px-4 py-16">
          <div className="aspect-[16/9] rounded-2xl bg-muted" />
          <div className="h-8 w-1/2 rounded bg-muted" />
        </div>
      </SiteLayout>
    );
  }

  if (!pkg) throw notFound();

  const gallery = (pkg.gallery as string[]) ?? [];
  const included = (pkg.included as string[]) ?? [];
  const excluded = (pkg.excluded as string[]) ?? [];
  const timeline = (pkg.timeline as Array<{ day: string; title: string; description: string }>) ?? [];
  const discounted = pkg.discount && pkg.discount > 0
    ? Number(pkg.price) * (1 - Number(pkg.discount) / 100)
    : null;

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {pkg.cover && <img src={pkg.cover} alt="" className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/85" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-24 text-white md:px-6">
          <Link to={`/${pkg.category === "trip" ? "trips" : pkg.category === "flight" ? "flights" : pkg.category}`} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-white/80 hover:text-white">
            <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t("actions.viewAll")}
          </Link>
          <span className="inline-block rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            {t(`categories.${pkg.category}`)}
          </span>
          <h1 className="mt-4 text-4xl font-extrabold md:text-6xl">{pkg.title}</h1>
          {pkg.short_description && <p className="mt-3 max-w-2xl text-lg opacity-90">{pkg.short_description}</p>}
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-3 md:px-6">
        <div className="space-y-8 lg:col-span-2">
          {pkg.description && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="leading-relaxed text-foreground/90">{pkg.description}</p>
            </div>
          )}

          {timeline.length > 0 && (
            <section>
              <h2 className="mb-4 text-2xl font-bold">{t("package.timeline")}</h2>
              <ol className="space-y-4">
                {timeline.map((step, i) => (
                  <li key={i} className="relative rounded-2xl border border-border bg-card p-5">
                    <div className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{step.day}</div>
                    <h3 className="mb-1 font-bold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {included.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-primary">
                  <Check className="h-5 w-5" /> {t("package.included")}
                </h3>
                <ul className="space-y-2 text-sm">
                  {included.map((it, i) => (
                    <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{it}</li>
                  ))}
                </ul>
              </div>
            )}
            {excluded.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-destructive">
                  <X className="h-5 w-5" /> {t("package.excluded")}
                </h3>
                <ul className="space-y-2 text-sm">
                  {excluded.map((it, i) => (
                    <li key={i} className="flex gap-2 text-muted-foreground"><X className="h-4 w-4 shrink-0" />{it}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {gallery.length > 0 && (
            <section>
              <h2 className="mb-4 text-2xl font-bold">{t("package.gallery")}</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {gallery.map((img, i) => (
                  <img key={i} src={img} alt="" loading="lazy" className="aspect-square rounded-xl object-cover" />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t("package.from")}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-primary">
                  {(discounted ?? Number(pkg.price)).toLocaleString()} {pkg.currency}
                </span>
                {discounted !== null && (
                  <span className="text-sm text-muted-foreground line-through">
                    {Number(pkg.price).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2 border-t border-border pt-4 text-sm">
              {pkg.destination && (
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {pkg.destination}</div>
              )}
              {pkg.duration && (
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> {pkg.duration}</div>
              )}
              {typeof pkg.seats === "number" && pkg.seats > 0 && (
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> {pkg.seats} {t("package.seats")}</div>
              )}
              {pkg.hotel && (
                <div className="flex items-center gap-2"><Hotel className="h-4 w-4 text-primary" /> {pkg.hotel}</div>
              )}
              {pkg.airline && (
                <div className="flex items-center gap-2"><Plane className="h-4 w-4 text-primary" /> {pkg.airline}</div>
              )}
            </div>
            <Button asChild size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/contact">{t("actions.bookNow")}</Link>
            </Button>
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}
