import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeading } from "@/components/common/SectionHeading";
import { PackageCard } from "@/components/common/PackageCard";
import { SkeletonGrid, EmptyState } from "@/components/common/SkeletonGrid";
import { packagesQuery, type PackageCategory } from "@/lib/queries";

export function PackagesPage({
  category,
  title,
  description,
  cover,
}: {
  category: PackageCategory;
  title: string;
  description: string;
  cover: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(packagesQuery(category));

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={cover} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-green/85 to-brand-green/95" />
        </div>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-24 text-center text-on-dark md:px-6">
          <span className="rounded-full border border-on-dark/30 bg-on-dark/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur">
            {t(`categories.${category}`)}
          </span>
          <h1 className="text-4xl font-extrabold md:text-6xl animate-fade-in">{title}</h1>
          <p className="max-w-2xl text-lg opacity-90">{description}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        {isLoading ? (
          <SkeletonGrid count={8} />
        ) : !data?.length ? (
          <EmptyState label={t("common.empty")} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.map((p, i) => (
              <div key={p.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <PackageCard pkg={p} />
              </div>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
