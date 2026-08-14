import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { Check, X, MapPin, Clock, Users, Hotel, Plane, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { PackageCard } from "@/components/common/PackageCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { packageBySlugQuery, packagesQuery, faqsQuery } from "@/lib/queries";
import { useLocalized } from "@/lib/localize";



export const Route = createFileRoute("/packages/$slug")({
  head: () => ({
    meta: [
      { title: i18n.t("seo.packageDetail.title") },
      { property: "og:type", content: "product" },
    ],
  }),
  component: PackagePage,
});

function PackagePage() {
  const { slug } = Route.useParams();
  const { t } = useTranslation();
  const { L, list, price } = useLocalized();
  const { data: pkg, isLoading } = useQuery(packageBySlugQuery(slug));
  const { data: allPackages } = useQuery(packagesQuery());
  const { data: faqs } = useQuery(faqsQuery());


  if (isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-6xl animate-pulse space-y-6 px-4 py-16">
          <div className="aspect-[16/9] rounded-lg bg-muted" />
          <div className="h-8 w-1/2 rounded bg-muted" />
        </div>
      </SiteLayout>
    );
  }

  if (!pkg) throw notFound();

  const gallery = (pkg.gallery as string[]) ?? [];
  const included = list<string>(pkg, "included");
  const excluded = list<string>(pkg, "excluded");
  const timeline = list<{ day: string; title: string; description: string }>(pkg, "timeline");
  const discounted = pkg.discount && pkg.discount > 0
    ? Number(pkg.price) * (1 - Number(pkg.discount) / 100)
    : null;
  const related = (allPackages ?? [])
    .filter((p) => p.category === pkg.category && p.id !== pkg.id)
    .slice(0, 4);
  const faqList = (faqs ?? []).slice(0, 6);


  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {pkg.cover && (
            <img
              src={pkg.cover}
              alt=""
              aria-hidden="true"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              sizes="100vw"
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/85" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-24 text-on-dark md:px-6">
          <Link to={`/${pkg.category === "trip" ? "trips" : pkg.category === "flight" ? "flights" : pkg.category}`} className="mb-4 inline-flex items-center gap-1 text-small font-semibold text-on-dark/80 hover:text-on-dark">
            <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t("actions.viewAll")}
          </Link>
          <span className="inline-block rounded-full border border-on-dark/30 bg-on-dark/10 px-3 py-1 text-caption font-semibold backdrop-blur">
            {t(`categories.${pkg.category}`)}
          </span>
          <h1 className="mt-4 text-h1 font-extrabold ">{L(pkg, "title")}</h1>
          {L(pkg, "short_description", "empty") && (
            <p className="mt-3 max-w-2xl text-body-lg opacity-90">{L(pkg, "short_description", "empty")}</p>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-3 md:px-6">
        <div className="space-y-8 lg:col-span-2">
          {L(pkg, "description", "empty") && (
            <div className="rounded-lg border border-border-subtle bg-card p-6">
              <p className="leading-relaxed text-foreground/90">{L(pkg, "description", "empty")}</p>
            </div>
          )}

          {timeline.length > 0 && (
            <section>
              <h2 className="mb-4 text-h3 font-bold">{t("package.timeline")}</h2>
              <ol className="space-y-4">
                {timeline.map((step, i) => (
                  <li key={i} className="relative rounded-lg border border-border-subtle bg-card p-5">
                    <div className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-caption font-bold text-primary">{step.day}</div>
                    <h3 className="mb-1 font-bold">{step.title}</h3>
                    <p className="text-small text-muted-foreground">{step.description}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {included.length > 0 && (
              <div className="rounded-lg border border-border-subtle bg-card p-6">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-primary">
                  <Check className="h-5 w-5" /> {t("package.included")}
                </h3>
                <ul className="space-y-2 text-small">
                  {included.map((it, i) => (
                    <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{it}</li>
                  ))}
                </ul>
              </div>
            )}
            {excluded.length > 0 && (
              <div className="rounded-lg border border-border-subtle bg-card p-6">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-destructive">
                  <X className="h-5 w-5" /> {t("package.excluded")}
                </h3>
                <ul className="space-y-2 text-small">
                  {excluded.map((it, i) => (
                    <li key={i} className="flex gap-2 text-muted-foreground"><X className="h-4 w-4 shrink-0" />{it}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {gallery.length > 0 && (
            <section>
              <h2 className="mb-4 text-h3 font-bold">{t("package.gallery")}</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {gallery.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="aspect-square rounded-xl object-cover shadow-sm transition-shadow duration-base ease-standard hover:shadow-md"
                  />
                ))}
              </div>
            </section>
          )}

          {faqList.length > 0 && (
            <section>
              <h2 className="mb-4 text-h3 font-bold">{t("package.faqTitle")}</h2>
              <Accordion type="single" collapsible className="rounded-lg border border-border-subtle bg-card px-4">
                {faqList.map((f) => (
                  <AccordionItem key={f.id} value={f.id}>
                    <AccordionTrigger className="text-start">{L(f, "question")}</AccordionTrigger>
                    <AccordionContent className="text-small text-muted-foreground">
                      {L(f, "answer")}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          <section className="rounded-lg border border-border-subtle bg-muted/30 p-6">
            <h2 className="mb-3 text-h5 font-bold">{t("package.terms")}</h2>
            <p className="text-small leading-relaxed text-muted-foreground">
              {t("bookingFlow.review.terms")} {t("bookingFlow.confirm.noPayment")}
            </p>
          </section>
        </div>


        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="space-y-4 rounded-lg border border-border-subtle bg-card p-6 shadow-sm">
            <div>
              <p className="text-caption text-muted-foreground">{t("package.from")}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-h2 font-extrabold text-primary">
                  {price(discounted ?? Number(pkg.price), pkg.currency ?? "TND")}
                </span>
                {discounted !== null && (
                  <span className="text-small text-muted-foreground line-through">
                    {price(Number(pkg.price), pkg.currency ?? "TND")}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2 border-t border-border pt-4 text-small">
              {L(pkg, "destination", "empty") && (
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {L(pkg, "destination", "empty")}</div>
              )}
              {L(pkg, "duration", "empty") && (
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> {L(pkg, "duration", "empty")}</div>
              )}
              {typeof pkg.seats === "number" && pkg.seats > 0 && (
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> {pkg.seats} {t("package.seats")}</div>
              )}
              {L(pkg, "hotel", "base") && (
                <div className="flex items-center gap-2"><Hotel className="h-4 w-4 text-primary" /> {L(pkg, "hotel", "base")}</div>
              )}
              {L(pkg, "airline", "base") && (
                <div className="flex items-center gap-2"><Plane className="h-4 w-4 text-primary" /> {L(pkg, "airline", "base")}</div>
              )}
            </div>
            <Button
              asChild
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/booking" search={{ pkg: pkg.slug }}>
                {t("actions.bookNow")}
              </Link>
            </Button>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
          <h2 className="mb-6 text-h3 font-bold">{t("package.related")}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <PackageCard key={p.id} pkg={p} />
            ))}
          </div>
        </section>
      )}

      {/* mobile sticky booking CTA */}
      <div className="sticky bottom-0 z-40 border-t border-border-subtle bg-card/95 p-4 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-caption text-muted-foreground">{t("package.from")}</p>
            <p className="text-h5 font-extrabold text-primary">
              {price(discounted ?? Number(pkg.price), pkg.currency ?? "TND")}
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/booking" search={{ pkg: pkg.slug }}>
              {t("actions.bookNow")}
            </Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}

