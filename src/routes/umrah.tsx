import { createFileRoute } from "@tanstack/react-router";
import { PackagesPage } from "@/components/sections/PackagesPage";

export const Route = createFileRoute("/umrah")({
  head: () => ({
    meta: [
      { title: "باقات العمرة — جنة الصحراء" },
      { name: "description", content: "أفضل باقات العمرة من تونس بأسعار تنافسية وخدمات متكاملة." },
      { property: "og:title", content: "باقات العمرة — جنة الصحراء" },
      { property: "og:description", content: "باقات عمرة شاملة الطيران والفندق والتنقل." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/umrah" }],
  }),
  component: () => (
    <PackagesPage
      category="umrah"
      title="باقات العمرة"
      description="اختر باقة العمرة التي تناسبك من بين مجموعة مميزة من العروض"
      cover="https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1920&q=80"
    />
  ),
});
