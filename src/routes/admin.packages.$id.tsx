import { createFileRoute, Link } from "@tanstack/react-router";
import { TripEditorPage } from "@/components/admin/packages/TripEditorPage";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/admin/packages/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: adminDocTitle("packageEditor") },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PackageEditorRoute,
  errorComponent: PackageEditorError,
});

function PackageEditorRoute() {
  const { id } = Route.useParams();
  return <TripEditorPage key={id} packageId={id} />;
}

function PackageEditorError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 text-center px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="text-h5 font-bold text-foreground">تعذّر تحميل الرحلة</h1>
      <p className="text-small text-muted-foreground">
        {error?.message || "حدث خطأ غير متوقع أثناء تحميل بيانات الرحلة"}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="me-1.5 h-4 w-4" />
          إعادة المحاولة
        </Button>
        <Button size="sm" asChild>
          <Link to="/admin/packages">
            <ArrowLeft className="me-1.5 h-4 w-4 rtl:-scale-x-100" />
            العودة إلى الرحلات
          </Link>
        </Button>
      </div>
    </div>
  );
}
