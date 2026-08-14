import { createFileRoute } from "@tanstack/react-router";
import { PackageEditorPage } from "@/components/admin/packages/PackageEditorPage";
import { TripWizard } from "@/components/admin/packages/TripWizard";

export const Route = createFileRoute("/admin/packages/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Package editor — Janat Sahara Admin" },
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

