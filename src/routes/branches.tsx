import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MapPin, Loader2, ArrowRight } from "lucide-react";
import i18n from "@/lib/i18n";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Section } from "@/components/common/Section";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";
import { BranchCard } from "@/components/branches/BranchCard";
import { branchesQuery } from "@/lib/queries";
import { canonical } from "@/lib/seo";

/* Leaflet is heavy and below the fold — loaded only when this page is. */
const BranchesMap = lazy(() => import("@/components/sections/BranchesMap"));

export const Route = createFileRoute("/branches")({
  head: () => ({
    meta: [
      { title: i18n.t("seo.branches.title") },
      { name: "description", content: i18n.t("seo.branches.description") },
      { property: "og:title", content: i18n.t("seo.branches.title") },
      { property: "og:description", content: i18n.t("seo.branches.description") },
      { property: "og:type", content: "website" },
    ],
    links: [canonical("/branches")],
  }),
  component: BranchesPage,
});

/**
 * The agency's offices.
 *
 * Branches are the strongest trust signal this business has, because they are
 * real places with real addresses that a visitor can walk into. Everything on
 * this page is read from the `branches` table — no opening hours, distances,
 * photographs or coordinates are supplied for a branch that has none, and the
 * map is only rendered for branches with usable coordinates.
 */
function BranchesPage() {
  const { t } = useTranslation();
  const { data: branches = [], isLoading } = useQuery(branchesQuery());

  const mainBranch = branches.find((b) => b.is_main_branch) ?? null;
  const otherBranches = branches.filter((b) => b !== mainBranch);

  /* Only branches the agency actually geocoded belong on a map. */
  const mappable = branches.filter((b) => {
    const lat = Number(b.latitude);
    const lng = Number(b.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  });

  return (
    <SiteLayout>
      <Section space="sm" tone="sunken">
        <SectionHeading
          eyebrow={t("branches.kicker")}
          icon={MapPin}
          title={t("branches.title")}
          as="h1"
          description={t("branches.subtitle")}
          align="center"
        />
      </Section>

      <Section space="md">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-56 animate-pulse rounded-card bg-muted" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-card bg-muted" />
              ))}
            </div>
          </div>
        ) : branches.length === 0 ? (
          <p className="text-center text-body text-muted-foreground">{t("common.empty")}</p>
        ) : (
          <div className="space-y-4">
            {/* The head office leads, then the rest of the network. */}
            {mainBranch && <BranchCard branch={mainBranch} featured as="h2" />}
            {otherBranches.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherBranches.map((b) => (
                  <BranchCard key={b.id} branch={b} as="h2" />
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      {mappable.length > 0 && (
        <Section space="md" tone="sunken">
          <SectionHeading title={t("branches.mapTitle")} description={t("branches.mapDesc")} />
          <div className="mt-6 overflow-hidden rounded-card-lg border border-border-subtle">
            <Suspense
              fallback={
                <div className="flex h-[420px] items-center justify-center bg-muted/40">
                  <Loader2 className="h-7 w-7 animate-spin text-primary/70" aria-hidden="true" />
                </div>
              }
            >
              <div className="h-[420px] w-full">
                <BranchesMap branches={mappable} />
              </div>
            </Suspense>
          </div>
        </Section>
      )}

      <Section space="sm">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <h2 className="text-h4 font-bold text-foreground">{t("branches.ctaTitle")}</h2>
          <p className="text-body leading-relaxed text-muted-foreground">{t("branches.ctaDesc")}</p>
          <Button asChild size="lg">
            <Link to="/contact">
              {t("nav.contact")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Section>
    </SiteLayout>
  );
}
