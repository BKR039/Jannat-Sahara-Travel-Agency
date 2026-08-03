import { createFileRoute } from "@tanstack/react-router";
import { PackageEditorPage } from "@/components/admin/packages/PackageEditorPage";

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
  return <PackageEditorPage key={id} packageId={id} />;
}
