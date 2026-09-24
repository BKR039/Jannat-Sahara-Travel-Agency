import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { useQuery } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { HeroSection } from "@/components/sections/HeroSection";
import { UmrahProgrammes } from "@/components/sections/UmrahProgrammes";
import { ServicesSection } from "@/components/sections/HomeSections";
import { LazySection } from "@/components/common/LazySection";
import {
  contentQuery,
  packagesQuery,
  servicesQuery,
  siteSectionsQuery,
  siteSettingsQuery,
  isSectionVisible,
  galleryQuery,
} from "@/lib/queries";
import { canonical } from "@/lib/seo";
import { transformSrcSet } from "@/lib/image-srcset";
import { DEFAULT_PUBLIC_SETTINGS } from "@/lib/site-settings";

/* Below-the-fold secondary sections are code-split and mounted on intersection. */
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
const GalleryPreviewSection = lazy(() =>
  import("@/components/sections/HomeSections").then((m) => ({ default: m.GalleryPreviewSection })),
);
const TestimonialsSection = lazy(() =>
  import("@/components/sections/HomeSections").then((m) => ({ default: m.TestimonialsSection })),
);
const StatsSection = lazy(() =>
  import("@/components/sections/StatsSection").then((m) => ({ default: m.StatsSection })),
);
const AboutHomeSection = lazy(() =>
  import("@/components/sections/HomeSections").then((m) => ({ default: m.AboutHomeSection })),
);
const FaqHomeSection = lazy(() =>
  import("@/components/sections/HomeSections").then((m) => ({ default: m.FaqHomeSection })),
);

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [settings, hero] = await Promise.all([
      context.queryClient.ensureQueryData(siteSettingsQuery()).catch(() => DEFAULT_PUBLIC_SETTINGS),
      context.queryClient.ensureQueryData(contentQuery("hero")),
      context.queryClient.ensureQueryData(siteSectionsQuery("home")),
      context.queryClient.ensureQueryData(packagesQuery("umrah")),
      context.queryClient.ensureQueryData(servicesQuery()).catch(() => []),
      context.queryClient.ensureQueryData(galleryQuery("umrah", 1)).catch(() => []),
    ]);
    return { settings, hero };
  },
  head: ({ loaderData }) => {
    const s = loaderData?.settings;
    const heroImage = loaderData?.hero?.image;
    const title = s?.seoSiteTitle || i18n.t("seo.home.title");
    const description = s?.seoMetaDescription || i18n.t("seo.home.description");
    const ogImage = s?.seoOgImage;

    return {
      meta: [
        { title },
        {
          name: "description",
          content: description,
        },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        ...(ogImage ? [{ property: "og:image", content: ogImage }] : []),
      ],
      links: [
        canonical("/"),
        ...(heroImage
          ? [
              {
                rel: "preload" as const,
                as: "image" as const,
                href: heroImage,
                imageSrcSet: transformSrcSet(heroImage),
                imageSizes: "100vw",
                fetchPriority: "high" as const,
              },
            ]
          : []),
      ],
    };
  },
  component: Index,
});

/**
 * Landing page.
 * Section visibility is controlled dynamically by the database-backed site_sections configuration.
 */
function Index() {
  const { data: sections } = useQuery(siteSectionsQuery("home"));
  const isVisible = (key: string, fallback = true) => isSectionVisible(sections, key, fallback);

  return (
    <SiteLayout>
      {isVisible("hero", true) && (
        <div data-section="hero">
          <HeroSection />
        </div>
      )}
      <UmrahProgrammes />
      {isVisible("services", true) && (
        <div data-section="services">
          <ServicesSection />
        </div>
      )}
      {isVisible("features", true) && (
        <div data-section="features">
          <LazySection minHeight="26rem">
            <FeaturesSection />
          </LazySection>
        </div>
      )}
      {isVisible("branches", true) && (
        <div data-section="branches">
          <LazySection minHeight="34rem">
            <BranchesSection />
          </LazySection>
        </div>
      )}
      {isVisible("gallery", true) && (
        <div data-section="gallery">
          <LazySection minHeight="28rem">
            <GalleryPreviewSection />
          </LazySection>
        </div>
      )}
      {isVisible("testimonials", false) && (
        <div data-section="testimonials">
          <LazySection minHeight="24rem">
            <TestimonialsSection />
          </LazySection>
        </div>
      )}
      {isVisible("blog", true) && (
        <div data-section="blog">
          <LazySection minHeight="30rem">
            <LatestArticlesSection />
          </LazySection>
        </div>
      )}
      {isVisible("faq", false) && (
        <div data-section="faq">
          <LazySection minHeight="24rem">
            <FaqHomeSection />
          </LazySection>
        </div>
      )}
      {isVisible("stats", true) && (
        <div data-section="stats">
          <LazySection minHeight="20rem">
            <StatsSection />
          </LazySection>
        </div>
      )}
      {isVisible("about", true) && (
        <div data-section="about">
          <LazySection minHeight="22rem">
            <AboutHomeSection />
          </LazySection>
        </div>
      )}
      {isVisible("cta", true) && (
        <div data-section="cta">
          <LazySection minHeight="18rem">
            <CtaSection />
          </LazySection>
        </div>
      )}
    </SiteLayout>
  );
}
