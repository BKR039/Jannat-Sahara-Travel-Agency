import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { CustomPackageCta } from "@/components/umrah/CustomPackageCta";
import { PackagesPage } from "@/components/sections/PackagesPage";

export const Route = createFileRoute("/umrah")({
  head: () => ({
    meta: [
      { title: i18n.t("seo.umrah.title") },
      { name: "description", content: i18n.t("seo.umrah.description") },
      { property: "og:title", content: i18n.t("seo.umrah.title") },
      { property: "og:description", content: i18n.t("seo.umrah.ogDescription") },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/umrah" }],
  }),
  component: UmrahRoute,
});

function UmrahRoute() {
  const { t } = useTranslation();
  return (
    <PackagesPage
      category="umrah"
      title={t("nav.umrah")}
      description={t("seo.umrah.description")}
      banner={<CustomPackageCta />}
      cover="https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1920&q=80"
    />
  );
}
