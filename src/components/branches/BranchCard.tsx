import { MapPin, Phone, Clock, ExternalLink, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocalized } from "@/lib/localize";
import { cn } from "@/lib/utils";
import type { Branch } from "@/lib/queries";

/**
 * One agency branch, as a trust signal.
 *
 * The branches are the agency's real offices, so everything here comes from
 * the `branches` row and nothing is filled in: a branch without a phone shows
 * no phone line, and the map link is only offered when the agency published a
 * `google_maps_url` or real coordinates. No opening hours, distances or
 * "response times" are implied.
 */

/** Readable +216 55 123 456 from whatever digits the agency stored. */
export function prettyPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("216") && digits.length >= 11) {
    const local = digits.slice(3);
    return `+216 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 8)}`;
  }
  return `+${digits}`;
}

/**
 * A map link only when there is something real to point at.
 *
 * The published URL wins; coordinates are used only when they are finite and
 * not the 0,0 an unset pair defaults to — linking to the Gulf of Guinea is
 * worse than offering no link.
 */
export function mapsHref(branch: Branch): string | null {
  if (branch.google_maps_url) return branch.google_maps_url;
  const lat = Number(branch.latitude);
  const lng = Number(branch.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function BranchCard({
  branch,
  featured = false,
  className,
  as: Name = "h3",
}: {
  branch: Branch;
  /** The main office gets more weight: bigger name, tinted surface. */
  featured?: boolean;
  className?: string;
  /**
   * Heading level for the branch name.
   *
   * `h3` suits the contact page, where the cards sit under a "Our branches"
   * `h2`. The branches page has no such intermediate heading — the cards come
   * straight after its `h1` — so it passes `h2` and the outline stops skipping
   * a level.
   */
  as?: "h2" | "h3";
}) {
  const { t } = useTranslation();
  const { L } = useLocalized();

  const name = L(branch, "name", "base");
  const city = L(branch, "city", "base");
  const address = L(branch, "address", "base");
  const hours = L(branch, "working_hours", "empty");
  const href = mapsHref(branch);

  return (
    <article
      className={cn(
        "flex flex-col rounded-card border p-5",
        featured ? "border-primary/20 bg-accent/40 sm:p-6" : "border-border-subtle bg-card",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-input border",
            featured
              ? "border-primary/25 bg-surface text-primary"
              : "border-border-subtle bg-surface-sunken/60 text-muted-foreground",
          )}
        >
          <MapPin className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          {branch.is_main_branch && (
            <span className="mb-1 inline-block rounded-badge bg-primary/10 px-2 py-0.5 text-caption font-semibold text-primary">
              {t("branches.mainBranch")}
            </span>
          )}
          <Name
            className={cn(
              "font-bold leading-snug text-foreground [overflow-wrap:anywhere]",
              featured ? "text-h5" : "text-body",
            )}
          >
            {name}
          </Name>
          {city && <p className="mt-0.5 text-caption text-muted-foreground">{city}</p>}
        </div>
      </div>

      <dl className="mt-4 space-y-2.5 text-small">
        {address && (
          <div className="flex gap-2.5 leading-relaxed">
            <dt className="sr-only">{t("branches.info.address")}</dt>
            <MapPin className="ds-icon-lead text-muted-foreground" aria-hidden="true" />
            <dd className="min-w-0 text-foreground/90 [overflow-wrap:anywhere]">{address}</dd>
          </div>
        )}
        {branch.phone && (
          <div className="flex items-center gap-2.5">
            <dt className="sr-only">{t("branches.info.phone")}</dt>
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <dd className="min-w-0">
              <a
                href={`tel:${branch.phone.replace(/\s+/g, "")}`}
                dir="ltr"
                className="inline-flex min-h-11 items-center font-semibold text-foreground hover:text-primary"
              >
                {prettyPhone(branch.phone)}
              </a>
            </dd>
          </div>
        )}
        {branch.email && (
          <div className="flex items-center gap-2.5">
            <dt className="sr-only">{t("branches.info.email")}</dt>
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <dd className="min-w-0">
              <a
                href={`mailto:${branch.email}`}
                dir="ltr"
                className="inline-flex min-h-11 items-center text-foreground/90 hover:text-primary [overflow-wrap:anywhere]"
              >
                {branch.email}
              </a>
            </dd>
          </div>
        )}
        {hours && (
          <div className="flex gap-2.5 leading-relaxed">
            <dt className="sr-only">{t("branches.info.hours")}</dt>
            <Clock className="ds-icon-lead text-muted-foreground" aria-hidden="true" />
            <dd className="min-w-0 text-muted-foreground">{hours}</dd>
          </div>
        )}
      </dl>

      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-small font-semibold text-primary hover:underline"
        >
          {t("branches.viewOnMap")}
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        </a>
      )}
    </article>
  );
}
