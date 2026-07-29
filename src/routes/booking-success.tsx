import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Home, Phone } from "lucide-react";
import { z } from "zod";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/booking-success")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "تم استلام الحجز — جنة الصحراء" },
      { name: "description", content: "شكراً لحجزك. سنتواصل معك قريباً لتأكيد التفاصيل." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BookingSuccess,
});

function BookingSuccess() {
  const { t } = useTranslation();
  const { id } = Route.useSearch();

  return (
    <SiteLayout>
      <section className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center md:px-6">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ds-reveal">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-h2 font-extrabold ">{t("bookingSuccess.title")}</h1>
        <p className="mt-3 max-w-md text-muted-foreground">{t("bookingSuccess.subtitle")}</p>
        {id && (
          <div className="mt-6 rounded-xl border border-border-subtle bg-card px-5 py-3 text-small">
            <span className="text-muted-foreground">{t("bookingSuccess.reference")}: </span>
            <span className="font-mono font-semibold">{id.slice(0, 8).toUpperCase()}</span>
          </div>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/">
              <Home className="me-2 h-4 w-4" />
              {t("bookingSuccess.home")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/contact">
              <Phone className="me-2 h-4 w-4" />
              {t("bookingSuccess.contact")}
            </Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
