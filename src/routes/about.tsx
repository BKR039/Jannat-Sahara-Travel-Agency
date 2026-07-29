import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeading } from "@/components/common/SectionHeading";
import { FeaturesSection, TestimonialsSection } from "@/components/sections/HomeSections";
import { StatsSection } from "@/components/sections/StatsSection";
import { contentQuery } from "@/lib/queries";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — جنة الصحراء للأسفار" },
      { name: "description", content: "تعرف على وكالة جنة الصحراء للأسفار وقصتنا ورؤيتنا." },
      { property: "og:title", content: "من نحن — جنة الصحراء" },
      { property: "og:description", content: "وكالة أسفار تونسية بخبرة سنوات في العمرة والسياحة." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data } = useQuery(contentQuery("about"));
  const extra = (data?.data as { mission?: string; vision?: string; values?: string[] } | null) ?? {};

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {data?.image && <img src={data.image} alt="" className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-green/85 to-brand-green/95" />
        </div>
        <div className="mx-auto max-w-4xl px-4 py-24 text-center text-on-dark md:px-6">
          <span className="rounded-full border border-on-dark/30 bg-on-dark/10 px-4 py-1 text-caption font-semibold uppercase tracking-widest backdrop-blur">
            {data?.subtitle}
          </span>
          <h1 className="mt-4 text-h1 font-extrabold ds-reveal">
            {data?.title ?? "من نحن"}
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 md:px-6">
        <p className="text-body-lg leading-relaxed text-foreground/90">{data?.body}</p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {extra.mission && (
            <div className="rounded-lg border border-border-subtle bg-card p-6">
              <h3 className="mb-2 text-body-lg font-bold text-primary">مهمتنا</h3>
              <p className="text-small text-muted-foreground">{extra.mission}</p>
            </div>
          )}
          {extra.vision && (
            <div className="rounded-lg border border-border-subtle bg-card p-6">
              <h3 className="mb-2 text-body-lg font-bold text-primary">رؤيتنا</h3>
              <p className="text-small text-muted-foreground">{extra.vision}</p>
            </div>
          )}
        </div>

        {extra.values && extra.values.length > 0 && (
          <div className="mt-12">
            <SectionHeading title="قيمنا" align="start" className="mb-6" />
            <div className="flex flex-wrap gap-3">
              {extra.values.map((v) => (
                <span key={v} className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-small font-semibold text-primary">
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <StatsSection />
      <FeaturesSection />
      <TestimonialsSection />
    </SiteLayout>
  );
}
