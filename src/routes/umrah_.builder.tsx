import { createFileRoute } from "@tanstack/react-router";
import i18n from "@/lib/i18n";
import { UmrahBuilder } from "@/components/umrah/builder/UmrahBuilder";
import { canonical } from "@/lib/seo";

import { packagesQuery, hotelsQuery } from "@/lib/queries";

export const Route = createFileRoute("/umrah_/builder")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(packagesQuery("umrah")),
      context.queryClient.ensureQueryData(hotelsQuery("makkah")),
      context.queryClient.ensureQueryData(hotelsQuery("madinah")),
    ]);
  },
  head: () => ({
    meta: [
      { title: i18n.t("umrahBuilder.seo.title") },
      { name: "description", content: i18n.t("umrahBuilder.seo.description") },
      { property: "og:title", content: i18n.t("umrahBuilder.seo.title") },
      { property: "og:description", content: i18n.t("umrahBuilder.seo.description") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [canonical("/umrah/builder")],
  }),
  component: UmrahBuilder,
});
