/**
 * Dictionary key for a stored category value.
 *
 * `common.json` keys categories in the singular — `umrah`, `trip`, `flight`,
 * `visa` — which matches `packages.category`. Other tables were seeded with
 * the plural: the gallery stores `trips` and `flights`, so `t("categories.
 * trips")` missed and fell back to printing the raw English value next to
 * translated siblings. Normalising here keeps one dictionary rather than
 * carrying duplicate plural entries in three locale files.
 *
 * Unknown values are returned untouched, so a new category still resolves if
 * someone adds the key, and still falls back visibly if they do not.
 */
const ALIASES: Record<string, string> = {
  umrahs: "umrah",
  trips: "trip",
  flights: "flight",
  visas: "visa",
};

export function categoryKey(value: string): string {
  const key = value.trim().toLowerCase();
  return ALIASES[key] ?? key;
}
