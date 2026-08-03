import { createFileRoute } from "@tanstack/react-router";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeading } from "@/components/common/SectionHeading";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: i18n.t("seo.legalPrivacy.title") },
      { name: "description", content: i18n.t("seo.legalPrivacy.description") },
      { property: "og:title", content: i18n.t("seo.legalPrivacy.title") },
      { property: "og:description", content: i18n.t("seo.legalPrivacy.ogDescription") },
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
          <p>{t("legalPrivacy.p1")}</p>
          <p>{t("legalPrivacy.p2")}</p>
          <p>{t("legalPrivacy.p3")}</p>
          <p className="text-muted-foreground">{t("legalPrivacy.updated")}</p>
        </div>
      </section>
    </SiteLayout>
  );
}
