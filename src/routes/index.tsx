import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { t } = useTranslation();
  return (
    <SiteLayout>
      <section className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center gap-6 px-4 py-24 text-center md:px-6">
        <span className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
          Foundation ready · الأساس جاهز
        </span>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight text-foreground md:text-6xl">
          {t("brand.tagline")}
        </h1>
        <p className="max-w-xl text-base text-muted-foreground md:text-lg">
          {t("brand.name")}
        </p>
      </section>
    </SiteLayout>
  );
}
