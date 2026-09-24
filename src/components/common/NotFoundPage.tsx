import { Link, useRouter } from "@tanstack/react-router";
import { Compass, Home, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import i18n from "@/lib/i18n";

export interface NotFoundPageProps {
  title?: string;
  description?: string;
  isDashboard?: boolean;
}

/**
 * Canonical 404 / Not Found page for Jannat Sahara.
 * Lightweight, desert-journey aesthetic, zero sensitive information disclosure.
 */
export function NotFoundPage({
  title = "الصفحة غير موجودة",
  description = "تعذر العثور على الصفحة التي تبحث عنها. قد يكون الرابط خاطئاً أو تم نقل المحتوى.",
  isDashboard = false,
}: NotFoundPageProps) {
  const router = useRouter();
  const isRtl = i18n.dir() === "rtl";
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history && window.history.length > 1) {
      window.history.back();
    } else {
      router.navigate({ to: isDashboard ? "/admin" : "/" });
    }
  };

  return (
    <main
      role="main"
      className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12 text-center"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="relative mx-auto max-w-lg">
        {/* Subtle Desert Journey Glow & Compass Badge */}
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-primary/20 bg-primary/5 shadow-sm ring-8 ring-primary/5 dark:bg-primary/10">
          <Compass className="h-12 w-12 text-primary animate-pulse" aria-hidden="true" />
        </div>

        {/* 404 Number Badge */}
        <div className="mb-3">
          <span className="font-serif text-7xl font-extrabold tracking-tight text-foreground sm:text-8xl">
            404
          </span>
        </div>

        {/* Heading & Subheading */}
        <h1 className="text-h3 font-bold text-foreground sm:text-h2">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-small text-muted-foreground sm:text-base">
          {description}
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="default" variant="default">
            <Link to={isDashboard ? "/admin" : "/"}>
              <Home className="me-2 h-4 w-4" />
              {isDashboard ? "العودة للوحة الإدارة" : "العودة إلى الرئيسية"}
            </Link>
          </Button>

          <Button size="default" variant="outline" onClick={handleGoBack}>
            <BackArrow className="me-2 h-4 w-4" />
            العودة إلى الصفحة السابقة
          </Button>
        </div>

        {/* Helpful destination links for public visitors */}
        {!isDashboard && (
          <div className="mt-12 border-t border-border-subtle pt-6">
            <p className="text-caption font-medium text-muted-foreground">
              أو استكشف خدماتنا الرئيسية:
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-small">
              <Link to="/umrah" className="text-primary hover:underline">
                رحلات العمرة
              </Link>
              <Link to="/trips" className="text-primary hover:underline">
                الرحلات السياحية
              </Link>
              <Link to="/flights" className="text-primary hover:underline">
                حجز الطيران
              </Link>
              <Link to="/contact" className="text-primary hover:underline">
                تواصل معنا
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default NotFoundPage;
