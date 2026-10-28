import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { HeroSection } from "@/components/sections/HeroSection";
import { UmrahProgrammes } from "@/components/sections/UmrahProgrammes";
import {
  ServicesSection,
  FeaturesSection,
  LatestArticlesSection,
  CtaSection,
  GalleryPreviewSection,
  TestimonialsSection,
  AboutHomeSection,
  FaqHomeSection,
} from "@/components/sections/HomeSections";
import { StatsSection } from "@/components/sections/StatsSection";
import { BranchesSection } from "@/components/sections/BranchesSection";
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

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [settings, hero] = await Promise.all([
      context.queryClient.ensureQueryData(siteSettingsQuery()).catch(() => DEFAULT_PUBLIC_SETTINGS),
      context.queryClient.ensureQueryData(contentQuery("hero")).catch(() => null),
    ]);
    // Only hero data is needed for the first paint and image preload. Start
    // warming below-fold sections in parallel without blocking the HTML shell.
    void Promise.all([
      context.queryClient.prefetchQuery(siteSectionsQuery("home")),
      context.queryClient.prefetchQuery(packagesQuery("umrah")),
      context.queryClient.prefetchQuery(servicesQuery()),
      context.queryClient.prefetchQuery(galleryQuery("umrah", 1)),
    ]).catch(() => undefined);
    return { settings: settings ?? DEFAULT_PUBLIC_SETTINGS, hero: hero ?? null };
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
          <FeaturesSection />
        </div>
      )}
      {isVisible("branches", true) && (
        <div data-section="branches">
          <BranchesSection />
        </div>
      )}
      {isVisible("gallery", true) && (
        <div data-section="gallery">
          <GalleryPreviewSection />
        </div>
      )}
      {isVisible("testimonials", true) && (
        <div data-section="testimonials">
          <TestimonialsSection />
        </div>
      )}
      {isVisible("blog", true) && (
        <div data-section="blog">
          <LatestArticlesSection />
        </div>
      )}
      {isVisible("faq", true) && (
        <div data-section="faq">
          <FaqHomeSection />
        </div>
      )}
      {isVisible("stats", true) && (
        <div data-section="stats">
          <StatsSection />
        </div>
      )}
      {isVisible("about", true) && (
        <div data-section="about">
          <AboutHomeSection />
        </div>
      )}
      {isVisible("cta", true) && (
        <div data-section="cta">
          <CtaSection />
        </div>
      )}
    </SiteLayout>
  );
}
