import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import i18n from "@/lib/i18n";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { HeroSection } from "@/components/sections/HeroSection";
import { PackageSelector } from "@/components/sections/PackageSelector";
import { StatsSection } from "@/components/sections/StatsSection";
import { LazySection } from "@/components/common/LazySection";

/* Below-the-fold sections are code-split and mounted on intersection. */
const ServicesSection = lazy(() =>
  import("@/components/sections/HomeSections").then((m) => ({ default: m.ServicesSection })),
);
const FeaturesSection = lazy(() =>
  import("@/components/sections/HomeSections").then((m) => ({ default: m.FeaturesSection })),
);
const TestimonialsSection = lazy(() =>
  import("@/components/sections/HomeSections").then((m) => ({ default: m.TestimonialsSection })),
);
const GalleryPreviewSection = lazy(() =>
  import("@/components/sections/HomeSections").then((m) => ({ default: m.GalleryPreviewSection })),
);
const LatestArticlesSection = lazy(() =>
  import("@/components/sections/HomeSections").then((m) => ({ default: m.LatestArticlesSection })),
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
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <SiteLayout>
      <HeroSection />
      <PackageSelector />
      <StatsSection />
      <LazySection minHeight="28rem">
        <ServicesSection />
      </LazySection>
      <LazySection minHeight="26rem">
        <FeaturesSection />
      </LazySection>
      <LazySection minHeight="30rem">
        <TestimonialsSection />
      </LazySection>
      <LazySection minHeight="32rem">
        <GalleryPreviewSection />
      </LazySection>
      <LazySection minHeight="30rem">
        <LatestArticlesSection />
      </LazySection>
      <LazySection minHeight="34rem">
        <BranchesSection />
      </LazySection>
    </SiteLayout>
  );
}
