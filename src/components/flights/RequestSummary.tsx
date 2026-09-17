import { useTranslation } from "react-i18next";
import { ArrowDown, Armchair, CalendarDays, MapPin, Plane, Users } from "lucide-react";
import { describeAirportValue } from "@/lib/airports";
import { cabinLabel } from "@/lib/flight-request.labels";
import { intlLocale, useLocalized } from "@/lib/localize";
import { cn } from "@/lib/utils";
import type { Draft } from "./model";

/**
 * The trip, restated in the traveller's own words just before they commit.
 *
 * The form previously ended at a submit button: someone who had scrolled
 * through eight fields sent a request without ever seeing the route, the
 * dates and the party size together.
 *
 * Nothing here is invented — no airline, no price, no availability, no seat
 * count. Every line is something the traveller entered, read back. Until the
 * route exists there is nothing to verify, so the panel says what is still
 * missing instead of rendering an empty scaffold.
 */
export function RequestSummary({ draft, className }: { draft: Draft; className?: string }) {
  const { t, i18n } = useTranslation();
  const { lang } = useLocalized();
  const locale = intlLocale(lang);

  const from = describeAirportValue(draft.fromAirport, lang);
  const to = describeAirportValue(draft.toAirport, lang);
  const travellers = draft.adults + draft.children + draft.infants;
  const hasRoute = from.kind !== "empty" && to.kind !== "empty";

  const day = (iso: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div
      className={cn("rounded-card-lg border border-primary/20 bg-accent/40 p-5 sm:p-6", className)}
    >
      <p className="text-caption font-semibold uppercase tracking-wide text-primary">
        {t("flightRequest.summaryTitle")}
      </p>

      {!hasRoute ? (
        <p className="mt-3 text-small leading-relaxed text-muted-foreground">
          {t("flightRequest.summaryEmpty")}
        </p>
      ) : (
        <>
          {/* The route is the headline of the summary, as it is of the page. */}
          <div className="mt-4 space-y-1">
            <SummaryEndpoint value={from} />
            <div className="flex items-center gap-2 ps-[1.375rem]" aria-hidden="true">
              <ArrowDown className="h-4 w-4 text-primary/70" />
              <span className="h-px flex-1 bg-primary/15" />
            </div>
            <SummaryEndpoint value={to} />
          </div>

          <dl className="mt-5 space-y-2.5 border-t border-primary/15 pt-4">
            <SummaryRow
              icon={Plane}
              label={t("flightRequest.summaryTrip")}
              value={
                draft.tripType === "round_trip"
                  ? t("flightRequest.roundTrip")
                  : t("flightRequest.oneWay")
              }
            />
            <SummaryRow
              icon={CalendarDays}
              label={t("flightRequest.summaryDates")}
              value={
                draft.departureDate
                  ? draft.tripType === "round_trip" && draft.returnDate
                    ? `${day(draft.departureDate)} → ${day(draft.returnDate)}`
                    : (day(draft.departureDate) ?? "—")
                  : "—"
              }
            />
            <SummaryRow
              icon={Users}
              label={t("flightRequest.summaryTravellers")}
              value={t("flightRequest.passengersCount", { count: travellers })}
            />
            <SummaryRow
              icon={Armchair}
              label={t("flightRequest.summaryCabin")}
              value={cabinLabel(draft.cabinClass, i18n.language)}
            />
          </dl>
        </>
      )}
    </div>
  );
}

/** One end of the journey: identity first, then where it is. */
function SummaryEndpoint({ value }: { value: ReturnType<typeof describeAirportValue> }) {
  const { t } = useTranslation();
  if (value.kind === "empty") return null;

  return (
    <div className="flex items-start gap-2.5">
      {value.kind === "catalogue" ? (
        <span
          dir="ltr"
          className="mt-0.5 inline-flex h-6 min-w-[2.75rem] shrink-0 items-center justify-center rounded-badge bg-primary/15 px-1.5 text-caption font-bold text-primary"
        >
          {value.code}
        </span>
      ) : (
        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center text-primary">
          <MapPin className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-body font-bold text-foreground" dir="auto">
          {value.kind === "catalogue" ? value.city : value.text}
        </span>
        <span className="block truncate text-caption text-muted-foreground" dir="auto">
          {value.kind === "catalogue" ? value.country : t("flightRequest.customBadge")}
        </span>
      </span>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-caption text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className="min-w-0 truncate text-small font-semibold text-foreground" dir="auto">
        {value}
      </dd>
    </div>
  );
}
