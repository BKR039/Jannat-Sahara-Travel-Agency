import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/admin/ui";
import { BranchesSection } from "@/components/admin/settings/BranchesSection";

export const Route = createFileRoute("/admin/branches")({ component: BranchesAdminPage });

function BranchesAdminPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("adminBranches.title")} description={t("adminBranches.subtitle")} />
      <div className="mx-auto max-w-3xl">
        <BranchesSection />
      </div>
    </>
  );
}
