import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { FlightRequestSection } from "@/components/flights/FlightRequestSection";

export const Route = createFileRoute("/flights")({
  head: () => ({
    meta: [
      { title: "تذاكر الطيران — اطلب أفضل العروض | جنة الصحراء" },
      {
        name: "description",
        content:
          "احجز أي رحلة في العالم: أرسل تفاصيل رحلتك وسيبحث فريق جنة الصحراء عن أفضل خيارات الطيران المتوفرة ويتواصل معك.",
      },
      { property: "og:title", content: "تذاكر الطيران — اطلب أفضل العروض" },
      {
        property: "og:description",
        content: "أي شركة طيران وأي وجهة في العالم — أرسل طلبك واحصل على أفضل الأسعار المتوفرة.",
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
