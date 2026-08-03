import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { PackagesPage } from "@/components/sections/PackagesPage";

export const Route = createFileRoute("/visa")({
  head: () => ({
    meta: [
      { title: i18n.t("seo.visa.title") },
      { name: "description", content: i18n.t("seo.visa.description") },
      { property: "og:title", content: i18n.t("seo.visa.title") },
      { property: "og:description", content: i18n.t("seo.visa.ogDescription") },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/visa" }],
  }),
  component: () => {
    const { t } = useTranslation();
    return (
    <PackagesPage
      category="visa"
      title={t("nav.visa")}
      description={t("seo.visa.description")}
      cover="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80"
    />
  );
  },
});
