/**
 * Compatibility surface over the admin design kit.
 *
 * This file used to carry its own `PageHeader`, `AdminCard`, `EmptyState`,
 * `StatCard` and `StatusBadge` — a second set of the primitives in
 * `admin/kit`, drawn slightly differently. That is why screens built at
 * different times had different heading sizes, card borders and empty states:
 * not because anyone chose two languages, but because there were two
 * implementations and each screen picked one.
 *
 * The names stay so the twelve screens importing them keep working, but they
 * are now views onto the kit. New code should import from `@/components/admin/kit`
 * directly; nothing here has an implementation of its own any more.
 *
 * `MissingFrBadge` / `isEmptyFr` are the exception — they are about translation
 * completeness rather than layout, and this is their home.
 */
import { useTranslation } from "react-i18next";

export { Panel as AdminCard, EmptyState, StatusBadge, PageHeading as PageHeader } from "./kit";

/* ---------------------------- translation status ----------------------------- */

/** Subtle pill shown next to a field/row whose French translation is empty. */
export function MissingFrBadge({ className = "" }: { className?: string }) {
  const { t } = useTranslation("admin");
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-warning-muted px-2 py-0.5 text-caption font-medium text-warning ${className}`}
      title={t("shell.kit.missingFr.title")}
    >
      {t("shell.kit.missingFr.badge")}
    </span>
  );
}

export function isEmptyFr(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0 || value.every((v) => isEmptyFr(v));
  return false;
}
