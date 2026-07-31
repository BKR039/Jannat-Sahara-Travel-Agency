import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { BookingFlow } from "@/components/booking/flow/BookingFlow";
import type { ServiceKey } from "@/components/booking/flow/model";

const searchSchema = z.object({
  service: z.enum(["umrah", "trip", "flight", "visa"]).optional(),
  pkg: z.string().max(200).optional(),
});

export const Route = createFileRoute("/booking")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "احجز رحلتك — جنة الصحراء للأسفار" },
      {
        name: "description",
        content:
          "احجز باقة العمرة أو الرحلة أو التأشيرة في خطوات بسيطة: اختر الخدمة، اختر الباقة، أضف بيانات المسافرين وأكّد الحجز.",
      },
      { property: "og:title", content: "احجز رحلتك — جنة الصحراء للأسفار" },
      {
        property: "og:description",
        content: "تجربة حجز مرنة: اختر الباقة، حدد عدد المسافرين، أكمل البيانات وأكّد.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/booking" }],
  }),
  component: BookingPage,
});

function BookingPage() {
  const { service, pkg } = Route.useSearch();
  return (
    <SiteLayout>
      <BookingFlow
        initialService={(service as ServiceKey | undefined) ?? null}
        initialPackageSlug={pkg ?? null}
      />
    </SiteLayout>
  );
}
