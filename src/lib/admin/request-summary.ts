import type { TFunction } from "i18next";
import { cabinLabel, tripTypeLabel } from "@/lib/flight-request.labels";

/**
 * Structured summary emitted by `crm.server.ts` alongside the legacy string.
 */
export type SummaryParams =
  | { kind: "flight"; from: string; to: string; tripType: string; cabin: string }
  | { kind: "booking"; title: string | null; travellers: number }
  | { kind: "custom_package"; nights: number; travellers: number }
  | null
  | undefined;

/**
 * Render an inbox row's summary in the operator's language.
 *
 * The server composes an English string ("Umrah builder · 9 night(s) ·
 * 4 traveller(s)") which was rendered verbatim inside the Arabic admin. That
 * string is still produced — it remains the search haystack and the fallback
 * for any row shape this function does not recognise — but when the structured
 * params are present the line is rebuilt from i18n instead.
 *
 * `fallback` is returned unchanged for message rows, whose summary is the
 * customer's own subject line and must never be translated.
 */
export function requestSummary(params: SummaryParams, fallback: string, t: TFunction): string {
  if (!params) return fallback;

  switch (params.kind) {
    case "flight":
      /*
       * `tripType` and `cabin` arrive as the stable wire values
       * ("round_trip", "economy"). Rendered raw they put English enum names in
       * the middle of an Arabic line, so they go through the same label
       * helpers the public flight form already uses — one translation system,
       * not two.
       */
      return t("ops.requests.summary.flight", {
        from: params.from,
        to: params.to,
        tripType: tripTypeLabel(params.tripType),
        cabin: cabinLabel(params.cabin as never),
      });

    case "booking":
      return params.title
        ? t("ops.requests.summary.booking", {
            title: params.title,
            count: params.travellers,
          })
        : t("ops.requests.summary.bookingNoTitle", { count: params.travellers });

    case "custom_package":
      return t("ops.requests.summary.customPackage", {
        nights: params.nights,
        count: params.travellers,
      });

    default:
      return fallback;
  }
}
