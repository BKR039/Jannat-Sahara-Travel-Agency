/**
 * Text helpers for the offer form.
 *
 * `proposed_hotels` is a free-text column, so the agent stays in control of
 * what it says. The catalogue pickers use this helper to keep the
 * `Makkah: …` / `Madinah: …` lines tidy without discarding anything else typed.
 */

export type OfferCity = "Makkah" | "Madinah";

/** Insert, replace or remove one city's line, leaving the rest untouched. */
export function upsertHotelLine(existing: string, city: OfferCity, name: string): string {
  const lines = (existing ?? "").split("\n");
  const prefix = `${city}:`;
  const trimmedName = (name ?? "").trim();
  const index = lines.findIndex((l) => l.trim().toLowerCase().startsWith(prefix.toLowerCase()));

  if (index >= 0) {
    if (trimmedName) lines[index] = `${prefix} ${trimmedName}`;
    else lines.splice(index, 1);
  } else if (trimmedName) {
    lines.push(`${prefix} ${trimmedName}`);
  }

  return lines
    .filter((l) => l.trim() !== "")
    .join("\n")
    .trim();
}

/** One `City: Name` line parsed out of the free-text proposed-hotels column. */
export interface HotelLine {
  city: OfferCity;
  name: string;
}

/**
 * Structured hotel lines inside the free-text column.
 *
 * Lines the agent typed freely (notes, remarks, a second option written in
 * prose) are deliberately ignored — only the `Makkah:` / `Madinah:` form the
 * catalogue pickers produce is treated as a hotel reference.
 */
export function parseHotelLines(text: string | null | undefined): HotelLine[] {
  const out: HotelLine[] = [];
  for (const raw of (text ?? "").split("\n")) {
    const line = raw.trim();
    const match = /^(Makkah|Madinah)\s*:\s*(.+)$/i.exec(line);
    if (!match) continue;
    const city = (match[1][0].toUpperCase() + match[1].slice(1).toLowerCase()) as OfferCity;
    const name = match[2].trim();
    if (name) out.push({ city, name });
  }
  return out;
}

/** A hotel as the catalogue stores it — the only shape the offer needs. */
export interface CatalogueEntry {
  name: string;
  city: string;
}

/**
 * Names in structured lines that no active catalogue hotel matches.
 *
 * The offer must only ever name hotels the agency actually works with, so a
 * tampered or stale payload naming an unknown hotel is refused server-side
 * rather than emailed to a customer. Matching is case-insensitive on the
 * agency's own names, and the city must match too — a Madinah hotel cannot be
 * proposed for Makkah.
 */
export function unknownHotels(
  text: string | null | undefined,
  catalogue: readonly CatalogueEntry[],
): string[] {
  const byCity = new Map<string, Set<string>>();
  for (const h of catalogue) {
    const key = h.city.toLowerCase();
    if (!byCity.has(key)) byCity.set(key, new Set());
    byCity.get(key)!.add(h.name.trim().toLowerCase());
  }
  return parseHotelLines(text)
    .filter((l) => !byCity.get(l.city.toLowerCase())?.has(l.name.toLowerCase()))
    .map((l) => `${l.city}: ${l.name}`);
}

/** True when the offer carries something a customer could actually act on. */
export function offerHasContent(offer: {
  proposedHotels?: string | null;
  proposedFlights?: string | null;
  offerAmount?: number | null;
  offerNotes?: string | null;
}): boolean {
  return (
    !!offer.proposedHotels?.trim() ||
    !!offer.proposedFlights?.trim() ||
    offer.offerAmount != null ||
    !!offer.offerNotes?.trim()
  );
}

/** Statuses in which an offer may still be prepared or sent. */
export const OFFER_EDITABLE_STATUSES = [
  "new",
  "reviewing",
  "offer_preparing",
  "contacted",
] as const;

export function isOfferEditable(status: string): boolean {
  return (OFFER_EDITABLE_STATUSES as readonly string[]).includes(status);
}
