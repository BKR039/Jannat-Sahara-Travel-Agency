import { createFileRoute } from "@tanstack/react-router";
import i18n from "@/lib/i18n";
import { UmrahBuilder } from "@/components/umrah/builder/UmrahBuilder";

export const Route = createFileRoute("/umrah_/builder")({
  head: () => ({
    meta: [
      { title: i18n.t("umrahBuilder.seo.title") },
      { name: "description", content: i18n.t("umrahBuilder.seo.description") },
      { property: "og:title", content: i18n.t("umrahBuilder.seo.title") },
      { property: "og:description", content: i18n.t("umrahBuilder.seo.description") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/umrah/builder" }],
  }),
  component: UmrahBuilder,
});
