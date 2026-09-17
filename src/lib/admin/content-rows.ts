/**
 * Write rules for the two localized website-content catalogues managed from
 * Admin → Website: `services` and `features`.
 *
 * Both tables follow the project's localization convention (B-01): the base
 * column holds Arabic, `_fr` and `_en` hold the translations the agency types.
 * Nothing here translates, copies or derives one language from another — an
 * empty translation is stored as NULL so `localizeField` applies the documented
 * public fallback.
 *
 * These helpers are pure on purpose. Create and update in the admin screens go
 * through the SAME column builder, so the two paths can never drift apart, and
 * the locale-integrity rules are testable without a database.
 */

export type ColumnValue = string | number | boolean | null;
export type ColumnMap = Record<string, ColumnValue>;

/** Lowercase, hyphen-separated, no leading/trailing hyphen. */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Public pages a service card is able to link to.
 *
 * `HomeSections` renders each service as a link to `/<slug>`, so a slug that
 * has no route produces a dead card. These are the real existing public routes
 * — the list is not a new feature, it is a guard against broken links.
 */
/*
 * "visa" was dropped from this list when the public visa page was withdrawn:
 * listing a slug with no route would let an editor create a dead card.
 */
export const SERVICE_TARGETS = [
  "umrah",
  "umrah-builder",
  "trips",
  "flights",
  "about",
  "contact",
  "gallery",
  "blog",
  "faq",
] as const;

export type ServiceTarget = (typeof SERVICE_TARGETS)[number];

/**
 * Slugs whose public route is not simply `/<slug>`.
 *
 * The custom-Umrah builder lives at `/umrah/builder`, but a slug has to match
 * `SLUG_RE` (no slashes), so the two cannot be the same string. Keeping the
 * exception in one map means the service card, the admin hint and any future
 * caller all resolve the same URL instead of each guessing.
 */
const SERVICE_ROUTE_OVERRIDES: Record<string, string> = {
  "umrah-builder": "/umrah/builder",
};

/** Public path a service card links to. */
export function serviceHref(slug: string): string {
  return SERVICE_ROUTE_OVERRIDES[slug] ?? `/${slug}`;
}

export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** True when the slug matches a public route that actually exists. */
export function isKnownServiceTarget(slug: string): boolean {
  return (SERVICE_TARGETS as readonly string[]).includes(slug);
}

export interface ServiceDraft {
  id: string | null;
  title: string;
  title_fr: string;
  title_en: string;
  slug: string;
  description: string;
  description_fr: string;
  description_en: string;
  icon: string;
  cover: string;
  sort_order: number;
  active: boolean;
}

export interface FeatureDraft {
  id: string | null;
  title: string;
  title_fr: string;
  title_en: string;
  description: string;
  description_fr: string;
  description_en: string;
  icon: string;
  sort_order: number;
  active: boolean;
}

export const EMPTY_SERVICE: ServiceDraft = {
  id: null,
  title: "",
  title_fr: "",
  title_en: "",
  slug: "",
  description: "",
  description_fr: "",
  description_en: "",
  icon: "",
  cover: "",
  sort_order: 0,
  active: true,
};

export const EMPTY_FEATURE: FeatureDraft = {
  id: null,
  title: "",
  title_fr: "",
  title_en: "",
  description: "",
  description_fr: "",
  description_en: "",
  icon: "",
  sort_order: 0,
  active: true,
};

/** Empty translation -> NULL, never an empty string and never the base text. */
function optional(value: string): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function order(value: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function serviceColumns(d: ServiceDraft): ColumnMap {
  return {
    title: d.title.trim(),
    title_fr: optional(d.title_fr),
    title_en: optional(d.title_en),
    slug: normalizeSlug(d.slug),
    description: optional(d.description),
    description_fr: optional(d.description_fr),
    description_en: optional(d.description_en),
    icon: optional(d.icon),
    cover: optional(d.cover),
    sort_order: order(d.sort_order),
    active: !!d.active,
  };
}

export function featureColumns(d: FeatureDraft): ColumnMap {
  return {
    title: d.title.trim(),
    title_fr: optional(d.title_fr),
    title_en: optional(d.title_en),
    description: optional(d.description),
    description_fr: optional(d.description_fr),
    description_en: optional(d.description_en),
    icon: optional(d.icon),
    sort_order: order(d.sort_order),
    active: !!d.active,
  };
}

/**
 * The subset of `next` that actually differs from the stored row.
 *
 * Updating only what changed keeps an edit to one language from rewriting the
 * other two, and keeps the database audit trigger's `changed` payload honest.
 */
export function changedColumns(
  current: Record<string, unknown> | null | undefined,
  next: ColumnMap,
): ColumnMap {
  if (!current) return { ...next };
  const diff: ColumnMap = {};
  for (const [key, value] of Object.entries(next)) {
    const before = current[key] ?? null;
    const after = value ?? null;
    if (before !== after) diff[key] = value;
  }
  return diff;
}

/** Validation error codes; the screen turns them into localized messages. */
export type ErrorCode = "titleRequired" | "slugRequired" | "slugInvalid";

export function validateService(d: ServiceDraft): Partial<Record<"title" | "slug", ErrorCode>> {
  const errors: Partial<Record<"title" | "slug", ErrorCode>> = {};
  if (d.title.trim().length < 2) errors.title = "titleRequired";
  const slug = normalizeSlug(d.slug);
  if (!slug) errors.slug = "slugRequired";
  else if (!SLUG_RE.test(slug)) errors.slug = "slugInvalid";
  return errors;
}

export function validateFeature(d: FeatureDraft): Partial<Record<"title", ErrorCode>> {
  const errors: Partial<Record<"title", ErrorCode>> = {};
  if (d.title.trim().length < 2) errors.title = "titleRequired";
  return errors;
}

/** Next free position, so a new row lands at the end of the public list. */
export function nextSortOrder(rows: Array<{ sort_order: number | null }>): number {
  return rows.reduce((max, r) => Math.max(max, r.sort_order ?? 0), 0) + 1;
}
