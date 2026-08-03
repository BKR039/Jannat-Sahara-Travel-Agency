import { createFileRoute } from "@tanstack/react-router";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeading } from "@/components/common/SectionHeading";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: i18n.t("seo.legalTerms.title") },
      { name: "description", content: i18n.t("seo.legalTerms.description") },
      { property: "og:title", content: i18n.t("seo.legalTerms.title") },
      { property: "og:description", content: i18n.t("seo.legalTerms.ogDescription") },
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
          <p>{t("legalTerms.p1")}</p>
          <p>{t("legalTerms.p2")}</p>
          <p>{t("legalTerms.p3")}</p>
          <p className="text-muted-foreground">{t("legalTerms.updated")}</p>
        </div>
      </section>
    </SiteLayout>
  );
}
