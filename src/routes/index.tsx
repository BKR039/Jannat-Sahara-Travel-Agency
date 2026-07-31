import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { HeroSection } from "@/components/sections/HeroSection";
import { PackageSelector } from "@/components/sections/PackageSelector";
import { StatsSection } from "@/components/sections/StatsSection";
import {
  ServicesSection,
  FeaturesSection,
  TestimonialsSection,
  GalleryPreviewSection,
  LatestArticlesSection,
  CtaSection,
} from "@/components/sections/HomeSections";
import { BranchesSection } from "@/components/sections/BranchesSection";

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
      <PackageExplorer />
      <StatsSection />
      <ServicesSection />
      <FeaturesSection />
      <TestimonialsSection />
      <GalleryPreviewSection />
      <LatestArticlesSection />
      <BranchesSection />
      <CtaSection />
    </SiteLayout>
  );
}
