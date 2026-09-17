import { createFileRoute } from "@tanstack/react-router";
import { PackageEditorPage } from "@/components/admin/packages/PackageEditorPage";
import { TripWizard } from "@/components/admin/packages/TripWizard";
import { adminDocTitle } from "@/lib/admin/doc-title";

export const Route = createFileRoute("/admin/packages/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: adminDocTitle("packageEditor") },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PackageEditorRoute,
});

function PackageEditorRoute() {
  const { id } = Route.useParams();
  if (id === "new") return <TripWizard />;
  return <PackageEditorPage key={id} packageId={id} />;
}
