import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import i18n from "@/lib/i18n";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { HeroSection } from "@/components/sections/HeroSection";
import { UmrahProgrammes } from "@/components/sections/UmrahProgrammes";
import { LazySection } from "@/components/common/LazySection";
import { contentQuery, packagesQuery } from "@/lib/queries";
import { canonical } from "@/lib/seo";

/* Below-the-fold sections are code-split and mounted on intersection. */
const ServicesSection = lazy(() =>
  import("@/components/sections/HomeSections").then((m) => ({ default: m.ServicesSection })),
);
const FeaturesSection = lazy(() =>
  import("@/components/sections/HomeSections").then((m) => ({ default: m.FeaturesSection })),
);
const LatestArticlesSection = lazy(() =>
  import("@/components/sections/HomeSections").then((m) => ({ default: m.LatestArticlesSection })),
);
const CtaSection = lazy(() =>
  import("@/components/sections/HomeSections").then((m) => ({ default: m.CtaSection })),
);
const BranchesSection = lazy(() =>
  import("@/components/sections/BranchesSection").then((m) => ({ default: m.BranchesSection })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: i18n.t("seo.home.title") },
      {
        name: "description",
        content: i18n.t("seo.home.description"),
      },
      { property: "og:title", content: i18n.t("seo.home.ogTitle") },
      { property: "og:description", content: i18n.t("seo.home.ogDescription") },
      { property: "og:type", content: "website" },
    ],
    links: [canonical("/")],
  }),
  /*
   * Above-the-fold data is fetched on the server so the hero and the programme
   * cards are in the delivered HTML.
   *
   * Without this the hero row arrived only after hydration: the <h1> rendered
   * the i18n fallback, the badges and subtitle were absent, and the hero image
   * — the LCP element, with a preload hint pointing at it — was not in the
   * markup at all, so the hint had nothing to preload. Same `ensureQueryData`
   * pattern the package detail route already uses; no new query, and the
   * components still read from the cache exactly as before.
   */
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(contentQuery("hero")),
      context.queryClient.ensureQueryData(packagesQuery("umrah")),
    ]);
  },
  component: Index,
});

/**
 * Landing page.
 *
 * Order follows the conversion journey: say what the agency does, show the
 * programmes it actually sells, explain why to trust it, then the wider
 * services, proof, and finally where to find it and how to get in touch.
 *
 * `PackageSelector` no longer sits directly under the hero. It is a three-tab
 * explorer (Umrah / trips / visas) over every published package, but only the
 * Umrah programmes are published, so two of its three tabs rendered an empty
 * state on the homepage and its grid duplicated the /umrah catalogue.
 * `UmrahProgrammes` presents the real programmes instead; the explorer itself
 * is untouched and still serves the catalogue pages.
 *
 * The gallery preview is no longer mounted here either. It was a second grid
 * of images competing with the programme cards for the same attention without
 * telling the visitor anything about what is on sale. `GalleryPreviewSection`
 * and the /gallery route both still exist and still work.
 *
 * `TestimonialsSection` is not mounted either, for the same reason. All four
 * rows carry `i.pravatar.cc` avatars — a placeholder-avatar generator — share
 * one seed timestamp with the fabricated stats and branches, and are all rated
 * five stars. That is invented social proof, which the brief rules out as
 * firmly as invented statistics. The component and the admin CMS behind it are
 * untouched: add real, attributable testimonials under the Testimonials module
 * and re-add <TestimonialsSection /> below.
 *
 * `StatsSection` is also deliberately not mounted. Its four rows ("+12,000
 * عميل سعيد", "+15 سنوات الخبرة", …) are demo values seeded on 2026-08-21
 * alongside the fabricated branches and testimonials, not figures the agency
 * has ever given us — exactly the invented customer counts and years of
 * experience the brief rules out. The component and its data are untouched:
 * correct the rows under Settings → Stats and re-add <StatsSection /> here.
 */
function Index() {
  return (
    <SiteLayout>
      {/*
       * The page reads as one journey rather than a stack: what we sell, what
       * else we do, why to trust us, where we actually are, then inspiration.
       *
       * Branches carry the trust weight that the removed statistics used to
       * claim — four real offices a visitor can walk into is verifiable proof,
       * where "+12,000 happy customers" was not.
       */}
      <HeroSection />
      <UmrahProgrammes />
      <LazySection minHeight="28rem">
        <ServicesSection />
      </LazySection>
      <LazySection minHeight="26rem">
        <FeaturesSection />
      </LazySection>
      <LazySection minHeight="34rem">
        <BranchesSection />
      </LazySection>
      <LazySection minHeight="30rem">
        <LatestArticlesSection />
      </LazySection>
      <LazySection minHeight="18rem">
        <CtaSection />
      </LazySection>
    </SiteLayout>
  );
}
