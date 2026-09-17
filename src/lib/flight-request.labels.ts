/**
 * Localized display labels for flight-request enum values.
 *
 * The stable wire values live in ./flight-request.schema; the words a person
 * reads live in the locale files under `flightRequest.cabins.*`. Keeping them
 * apart means there is one translation system, not two, and adding a language
 * never touches the schema.
 *
 * Uses the shared i18next instance directly (not the React hook) so the same
 * helper works in components, in route `head()` and in server-rendered emails,
 * where an explicit `lang` is passed instead of the active UI language.
 */
import i18n from "@/lib/i18n";
import type { CabinClass, TRIP_TYPES } from "./flight-request.schema";

/**
 * @param cabin stable cabin value
 * @param lang  language to render in; defaults to the active UI language
 */
export function cabinLabel(cabin: CabinClass, lang?: string | undefined): string {
  const base = (lang ?? i18n.language ?? "ar").split("-")[0];
  return i18n.t(`flightRequest.cabins.${cabin}`, { lng: base, defaultValue: cabin });
}

/**
 * @param tripType stable trip-type value ("round_trip" | "one_way")
 * @param lang     language to render in; defaults to the active UI language
 *
 * Same reason as `cabinLabel` for going through the shared instance rather
 * than a caller's `t`: the admin inbox reads from the `admin` namespace, so a
 * `t("flightRequest.roundTrip")` there resolved to nothing and printed the key
 * itself in the middle of the request summary.
 */
export function tripTypeLabel(
  tripType: (typeof TRIP_TYPES)[number] | string,
  lang?: string | undefined,
): string {
  const base = (lang ?? i18n.language ?? "ar").split("-")[0];
  const key = tripType === "round_trip" ? "roundTrip" : tripType === "one_way" ? "oneWay" : null;
  if (!key) return tripType;
  return i18n.t(`flightRequest.${key}`, { lng: base, defaultValue: tripType });
}
