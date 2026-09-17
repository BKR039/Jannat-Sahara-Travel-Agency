/**
 * Whether a programme can safely be deleted.
 *
 * `bookings.package_id` references a programme. Deleting a programme that
 * still has bookings against it either breaks the reference or silently
 * detaches a customer's record from what they bought — neither is something an
 * operator should be able to do from a list row.
 *
 * The rule is deliberately conservative: any booking at all blocks deletion,
 * including cancelled ones, because a cancelled booking is still the record of
 * a transaction that happened. Hiding remains available and is the right move
 * for a programme that has run — it keeps the data and removes it from view.
 */

export interface DeleteDependency {
  /** Bookings referencing this programme, cancelled ones included. */
  bookings: number;
}

export type DeleteVerdict =
  | { canDelete: true }
  | { canDelete: false; reason: "has_bookings"; bookings: number };

export function deleteVerdict(deps: DeleteDependency): DeleteVerdict {
  const bookings = Number(deps.bookings ?? 0);
  if (Number.isFinite(bookings) && bookings > 0) {
    return { canDelete: false, reason: "has_bookings", bookings };
  }
  return { canDelete: true };
}

/** i18n key explaining why deletion is refused. */
export function blockedReasonKey(verdict: DeleteVerdict): string | null {
  return verdict.canDelete ? null : `ops.packagesList.deleteBlocked.${verdict.reason}`;
}
