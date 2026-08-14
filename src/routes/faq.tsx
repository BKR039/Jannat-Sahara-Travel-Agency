import { createFileRoute } from "@tanstack/react-router";
import i18n from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeading } from "@/components/common/SectionHeading";
import { EmptyState } from "@/components/common/SkeletonGrid";
import { faqsQuery } from "@/lib/queries";
import { useLocalized } from "@/lib/localize";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: i18n.t("seo.faq.title") },
      { name: "description", content: i18n.t("seo.faq.description") },
      { property: "og:title", content: i18n.t("seo.faq.title") },
      { property: "og:description", content: i18n.t("seo.faq.ogDescription") },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
  }),
  component: FaqPage,
});

function FaqPage() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const { data } = useQuery(faqsQuery());

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <SectionHeading eyebrow="?" title={t("nav.faq")} description={t("brand.tagline")} />
        {!data?.length ? (
          <EmptyState label={t("common.empty")} />
        ) : (
          <Accordion type="single" collapsible className="space-y-3">
            {data.map((f, i) => (
              <AccordionItem
                key={f.id}
                value={f.id}
                className="rounded-lg border border-border-subtle bg-card px-5 ds-reveal"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <AccordionTrigger className="text-start text-body font-semibold">
                  {L(f, "question")}
                </AccordionTrigger>
                <AccordionContent className="text-small leading-relaxed text-muted-foreground">
                  {L(f, "answer")}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </section>
    </SiteLayout>
  );
}
