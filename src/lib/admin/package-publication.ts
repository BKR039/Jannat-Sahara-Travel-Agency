/**
 * Programme publication and visibility.
 *
 * The brief asks for two independent axes — draft/published and visible/hidden.
 * `packages` has a single `package_status` enum: draft | published | archived |
 * sold_out. Rather than add a column, the four operator actions map onto values
 * the enum already carries, because the public catalogue's only filter is
 * `status = 'published'`:
 *
 *   publish    -> published   (public)
 *   unpublish  -> draft       (never been public / withdrawn to editing)
 *   hide       -> archived    (was public, retired from view, content kept)
 *   show       -> published   (public again)
 *
 * `sold_out` is not an operator action: it describes availability, not intent,
 * and is derived from seat data. It is recognised here so a sold-out programme
 * is not mislabelled as hidden.
 *
 * This means no migration, and the public filter keeps working untouched.
 */
import type { Database } from "@/integrations/supabase/types";

export type PackageStatus = Database["public"]["Enums"]["package_status"];

export type PublicationAction = "publish" | "unpublish" | "hide" | "show";

/** Status a given action produces. */
export const ACTION_RESULT: Record<PublicationAction, PackageStatus> = {
  publish: "published",
  unpublish: "draft",
  hide: "archived",
  show: "published",
};

/** Is the programme currently reachable on the public site? */
export function isPublic(status: PackageStatus): boolean {
  return status === "published" || status === "sold_out";
}

/**
 * Which actions make sense from here.
 *
 * Offering "publish" on an already-published programme, or "show" on a draft
 * that has never been public, is how an operator ends up clicking something
 * that appears to do nothing.
 */
export function availableActions(status: PackageStatus): PublicationAction[] {
  switch (status) {
    case "draft":
      return ["publish"];
    case "published":
    case "sold_out":
      return ["unpublish", "hide"];
    case "archived":
      return ["show"];
    default:
      return [];
  }
}

export function canPerform(status: PackageStatus, action: PublicationAction): boolean {
  return availableActions(status).includes(action);
}

/**
 * Apply an action, or null when it does not apply to the current status.
 * Returning null rather than throwing lets the caller treat a stale UI as a
 * no-op instead of an error.
 */
export function applyAction(
  status: PackageStatus,
  action: PublicationAction,
): PackageStatus | null {
  return canPerform(status, action) ? ACTION_RESULT[action] : null;
}

/** i18n key for the badge describing where a programme stands. */
export function publicationLabelKey(status: PackageStatus): string {
  return `ops.packagesList.publication.${status}`;
}
