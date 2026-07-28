import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { packagesQuery, type PackageCategory } from "@/lib/queries";
import { PackageCard } from "@/components/common/PackageCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SkeletonGrid } from "@/components/common/SkeletonGrid";

export function FeaturedPackagesSection({
  category,
  title,
  description,
  viewAllHref,
  eyebrow,
}: {
  category: PackageCategory;
  title: string;
  description?: string;
  viewAllHref: string;
  eyebrow?: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(packagesQuery(category, true));

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} align="start" className="mb-0" />
        <Link
          to={viewAllHref}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          {t("actions.viewAll")}
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>

      <div className="mt-10">
        {isLoading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data?.slice(0, 4).map((p, i) => (
              <div key={p.id} className="animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                <PackageCard pkg={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
