import { createFileRoute } from "@tanstack/react-router";
import { PackagesPage } from "@/components/sections/PackagesPage";

export const Route = createFileRoute("/trips")({
  head: () => ({
    meta: [
      { title: "الرحلات السياحية — جنة الصحراء" },
      { name: "description", content: "رحلات سياحية إلى أجمل الوجهات حول العالم." },
      { property: "og:title", content: "الرحلات السياحية — جنة الصحراء" },
      { property: "og:description", content: "اكتشف وجهات سياحية استثنائية." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/trips" }],
  }),
  component: () => (
    <PackagesPage
      category="trip"
      title="الرحلات السياحية"
      description="وجهات مذهلة تنتظرك حول العالم"
      cover="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&q=80"
    />
  ),
});
