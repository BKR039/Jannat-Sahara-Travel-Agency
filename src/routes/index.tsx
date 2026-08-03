import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
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
const CtaSection = lazy(() =>
  import("@/components/sections/HomeSections").then((m) => ({ default: m.CtaSection })),
);
const BranchesSection = lazy(() =>
  import("@/components/sections/BranchesSection").then((m) => ({ default: m.BranchesSection })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "جنة الصحراء للأسفار — العمرة، الرحلات والتأشيرات" },
      {
        name: "description",
        content: "وكالة أسفار تونسية متخصصة في تنظيم رحلات العمرة، الرحلات السياحية، تذاكر الطيران وخدمات التأشيرات.",
      },
      { property: "og:title", content: "جنة الصحراء للأسفار" },
      { property: "og:description", content: "رحلتك الروحية تبدأ من هنا. باقات العمرة والسياحة والتأشيرات." },
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
      <LazySection minHeight="18rem">
        <CtaSection />
      </LazySection>
    </SiteLayout>
  );
}
