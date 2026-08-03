import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeading } from "@/components/common/SectionHeading";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — جنة الصحراء" },
      { name: "description", content: "سياسة الخصوصية لموقع جنة الصحراء للأسفار." },
      { property: "og:title", content: "سياسة الخصوصية — جنة الصحراء" },
      { property: "og:description", content: "كيف نحمي بياناتك ونستخدمها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/legal/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <SectionHeading
          eyebrow={t("footer.legal")}
          title={t("footer.privacy")}
          description=""
        />
        <div className="mt-10 space-y-6 text-body leading-relaxed text-foreground">
          <p>
            نحن في جنة الصحراء للأسفار نلتزم بحماية خصوصيتك. تُستخدم البيانات التي
            تقدمها فقط لتأكيد الحجوزات والتواصل معك بخصوص رحلتك.
          </p>
          <p>
            لا نبيع أو نشارك بياناتك الشخصية مع أطراف ثالثة لأغراض تسويقية. يمكنك
            طلب حذف بياناتك في أي وقت عبر التواصل معنا.
          </p>
          <p>
            يتم تخزين جوازات السفر ووثائق السفر في مساحة تخزين آمنة ولا يتم
            الوصول إليها إلا من قبل الفريق المختص.
          </p>
          <p className="text-muted-foreground">آخر تحديث: أغسطس 2026.</p>
        </div>
      </section>
    </SiteLayout>
  );
}
