import { createFileRoute } from "@tanstack/react-router";
import { PackagesPage } from "@/components/sections/PackagesPage";

export const Route = createFileRoute("/flights")({
  head: () => ({
    meta: [
      { title: "تذاكر الطيران — جنة الصحراء" },
      { name: "description", content: "أفضل الأسعار لتذاكر الطيران الدولية والمحلية." },
      { property: "og:title", content: "تذاكر الطيران — جنة الصحراء" },
      { property: "og:description", content: "احجز تذاكر طيران بأسعار تنافسية." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/flights" }],
  }),
  component: () => (
    <PackagesPage
      category="flight"
      title="تذاكر الطيران"
      description="أفضل الأسعار لجميع الوجهات"
      cover="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&q=80"
    />
  ),
});
