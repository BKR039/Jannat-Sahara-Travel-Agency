import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { PackagesPage } from "@/components/sections/PackagesPage";
import { canonical } from "@/lib/seo";

export const Route = createFileRoute("/trips")({
  head: () => ({
    meta: [
      { title: i18n.t("seo.trips.title") },
      { name: "description", content: i18n.t("seo.trips.description") },
      { property: "og:title", content: i18n.t("seo.trips.title") },
      { property: "og:description", content: i18n.t("seo.trips.ogDescription") },
      { property: "og:type", content: "website" },
    ],
    links: [canonical("/trips")],
  }),
  component: TripsRoute,
});

function TripsRoute() {
  const { t } = useTranslation();
  return (
    <PackagesPage
      category="trip"
      title={t("nav.trips")}
      description={t("seo.trips.description")}
      heroContentKey="trips_hero"
    />
  );
}
