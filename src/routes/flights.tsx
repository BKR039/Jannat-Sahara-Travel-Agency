import { createFileRoute } from "@tanstack/react-router";
import i18n from "@/lib/i18n";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { FlightRequestSection } from "@/components/flights/FlightRequestSection";

export const Route = createFileRoute("/flights")({
  head: () => ({
    meta: [
      { title: i18n.t("seo.flights.title") },
      {
        name: "description",
        content: i18n.t("seo.flights.description"),
      },
      { property: "og:title", content: i18n.t("seo.flights.ogTitle") },
      {
        property: "og:description",
        content: i18n.t("seo.flights.ogDescription"),
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/flights" }],
  }),
  component: () => (
    <SiteLayout>
      <FlightRequestSection />
    </SiteLayout>
  ),
});
