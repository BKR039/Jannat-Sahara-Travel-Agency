import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeading } from "@/components/common/SectionHeading";
import { EmptyState } from "@/components/common/SkeletonGrid";
import { faqsQuery } from "@/lib/queries";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة — جنة الصحراء" },
      { name: "description", content: "إجابات على أهم الأسئلة حول باقات العمرة والرحلات والتأشيرات." },
      { property: "og:title", content: "الأسئلة الشائعة — جنة الصحراء" },
      { property: "og:description", content: "كل ما تحتاج معرفته قبل الحجز." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
  }),
  component: FaqPage,
});

function FaqPage() {
  const { t } = useTranslation();
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
                  {f.question}
                </AccordionTrigger>
                <AccordionContent className="text-small leading-relaxed text-muted-foreground">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </section>
    </SiteLayout>
  );
}
