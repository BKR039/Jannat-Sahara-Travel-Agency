import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { HeroSection } from "@/components/sections/HeroSection";
import { BookingWidget } from "@/components/sections/BookingWidget";
import { StatsSection } from "@/components/sections/StatsSection";
import { FeaturedPackagesSection } from "@/components/sections/FeaturedPackagesSection";
import {
  ServicesSection,
  FeaturesSection,
  TestimonialsSection,
  GalleryPreviewSection,
  LatestArticlesSection,
  CtaSection,
} from "@/components/sections/HomeSections";

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
      <BookingWidget />
      <StatsSection />
      <FeaturedPackagesSection
        category="umrah"
        eyebrow="✦"
        title="باقات العمرة المميزة"
        description="مجموعة مختارة من أفضل باقات العمرة"
        viewAllHref="/umrah"
      />
      <FeaturedPackagesSection
        category="trip"
        eyebrow="✦"
        title="رحلات مميزة"
        description="وجهات سياحية استثنائية"
        viewAllHref="/trips"
      />
      <ServicesSection />
      <FeaturesSection />
      <TestimonialsSection />
      <GalleryPreviewSection />
      <LatestArticlesSection />
      <CtaSection />
    </SiteLayout>
  );
}
