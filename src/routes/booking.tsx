import { createFileRoute } from "@tanstack/react-router";
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
      { title: "إتمام الحجز — جنة الصحراء للأسفار" },
      {
        name: "description",
        content:
          "أكمل حجز الباقة التي اخترتها: عدد المسافرين، بيانات كل مسافر وجوازات السفر، مراجعة ثم تأكيد — دون أي دفع إلكتروني.",
      },
      { property: "og:title", content: "إتمام الحجز — جنة الصحراء للأسفار" },
      {
        property: "og:description",
        content: "حجز سهل في خطوات قليلة بعد اختيار الباقة المناسبة لك.",
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
