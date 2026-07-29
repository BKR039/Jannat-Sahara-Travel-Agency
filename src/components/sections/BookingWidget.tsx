import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Search, MapPin, Calendar, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

const TYPES = ["umrah", "trip", "flight", "visa"] as const;

export function BookingWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [type, setType] = useState<(typeof TYPES)[number]>("umrah");
  const [destination, setDestination] = useState("");

  const routeMap: Record<(typeof TYPES)[number], string> = {
    umrah: "/umrah",
    trip: "/trips",
    flight: "/flights",
    visa: "/visa",
  };

  return (
    <div className="relative -mt-16 z-10 mx-auto max-w-6xl px-4 md:px-6">
      <div className="rounded-xl border border-border-subtle bg-card/95 p-6 shadow-xl backdrop-blur md:p-8 ds-reveal">
        <div className="mb-5 flex flex-wrap gap-2">
          {TYPES.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setType(k)}
              className={`rounded-full px-4 py-2 text-small font-semibold transition-colors duration-150 ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                type === k
                  ? "bg-primary text-primary-foreground shadow-brand-glow"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t(`categories.${k}`)}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: routeMap[type] });
          }}
          className="grid gap-3 md:grid-cols-4"
        >
          <label className="flex items-center gap-2 rounded-sm border border-input bg-surface px-4 py-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring md:col-span-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("home.bookingWidget.destination")}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-transparent text-base outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-sm border border-input bg-surface px-4 py-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input type="date" className="w-full bg-transparent text-base outline-none" />
          </label>
          <Button type="submit" size="lg" >
            <Search className="me-2 h-4 w-4" />
            {t("home.bookingWidget.search")}
          </Button>
        </form>

        <p className="mt-4 flex items-center gap-2 text-caption text-muted-foreground">
          <Compass className="h-3.5 w-3.5" />
          {t("home.bookingWidget.title")}
        </p>
      </div>
    </div>
  );
}
