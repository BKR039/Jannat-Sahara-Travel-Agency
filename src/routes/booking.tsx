import { createFileRoute } from "@tanstack/react-router";
import i18n from "@/lib/i18n";
import { z } from "zod";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { BookingFlow } from "@/components/booking/flow/BookingFlow";

const searchSchema = z.object({
  pkg: z.string().max(200).optional(),
});

export const Route = createFileRoute("/booking")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: i18n.t("seo.booking.title") },
      {
        name: "description",
        content: i18n.t("seo.booking.description"),
      },
      { property: "og:title", content: i18n.t("seo.booking.title") },
      {
        property: "og:description",
        content: i18n.t("seo.booking.ogDescription"),
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/booking" }],
  }),
  component: BookingPage,
});

function BookingPage() {
  const { pkg } = Route.useSearch();
  return (
    <SiteLayout>
      <BookingFlow packageSlug={pkg ?? null} />
    </SiteLayout>
  );
}
