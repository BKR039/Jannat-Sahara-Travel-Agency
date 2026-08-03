import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeading } from "@/components/common/SectionHeading";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام — جنة الصحراء" },
      { name: "description", content: "شروط الاستخدام لموقع جنة الصحراء للأسفار." },
      { property: "og:title", content: "شروط الاستخدام — جنة الصحراء" },
      { property: "og:description", content: "الشروط والأحكام الخاصة بحجوزاتنا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/legal/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { t } = useTranslation();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <SectionHeading
          eyebrow={t("footer.legal")}
          title={t("footer.terms")}
          description=""
        />
        <div className="mt-10 space-y-6 text-body leading-relaxed text-foreground">
          <p>
            باستخدامك لموقع جنة الصحراء للأسفار، فإنك توافق على هذه الشروط. يجب
            أن تكون المعلومات المقدمة أثناء الحجز دقيقة وكاملة.
          </p>
          <p>
            لا يتم تحصيل أي مبلغ عبر الموقع. يتم تأكيد الحجز والدفع مباشرة مع
            فريقنا عبر الهاتف أو الواتساب أو في أقرب فرع.
          </p>
          <p>
            نحتفظ بالحق في تعديل الأسعار أو البرامج بناءً على توفر الخدمات من
            شركائنا. سيتم إبلاغك بأي تغييرات قبل تأكيد الحجز النهائي.
          </p>
          <p className="text-muted-foreground">آخر تحديث: أغسطس 2026.</p>
        </div>
      </section>
    </SiteLayout>
  );
}
