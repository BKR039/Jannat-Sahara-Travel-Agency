import { createFileRoute } from "@tanstack/react-router";
import { PackagesPage } from "@/components/sections/PackagesPage";

export const Route = createFileRoute("/visa")({
  head: () => ({
    meta: [
      { title: "خدمات التأشيرات — جنة الصحراء" },
      { name: "description", content: "خدمات استخراج التأشيرات لمختلف الوجهات." },
      { property: "og:title", content: "خدمات التأشيرات — جنة الصحراء" },
      { property: "og:description", content: "استخرج تأشيرتك بسهولة وسرعة." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/visa" }],
  }),
  component: () => (
    <PackagesPage
      category="visa"
      title="خدمات التأشيرات"
      description="نساعدك في استخراج تأشيرة السفر بسهولة"
      cover="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80"
    />
  ),
});
