/**
 * Programme seat availability.
 *
 * The `packages` table carries two manual numbers: `total_seats` (capacity)
 * and `seats`, which was a hand-maintained "remaining" figure. A hand-kept
 * remaining count drifts the moment a booking is taken or cancelled without
 * someone also editing the programme, so it is not what this module trusts.
 *
 * Booked is derived from the `bookings` table instead — every booking that
 * still holds a seat, summed by traveller count. The operator edits capacity
 * and nothing else; remaining follows from real bookings.
 *
 * `seats` is deliberately left alone: `PackageCard` still reads it for its
 * sold-out badge, and repurposing it here would change public behaviour in a
 * phase that is only meant to touch Admin. Reconciling the two is recorded as
 * follow-up work, not done silently.
 */

/** Booking statuses that no longer hold a seat. */
export const RELEASED_BOOKING_STATUSES = new Set(["cancelled"]);

/** Below this share of capacity a programme reads as nearly gone. */
export const LIMITED_THRESHOLD = 0.2;

export type AvailabilityState = "available" | "limited" | "full" | "unset";

export interface Availability {
  /** Configured capacity, or null when the agency has not set one. */
  capacity: number | null;
  /** Travellers holding a seat right now, derived from bookings. */
  booked: number;
  /** Seats left, never negative. Null when capacity is unset. */
  remaining: number | null;
  /** Share of capacity taken, 0..1. Null when capacity is unset. */
  ratio: number | null;
  state: AvailabilityState;
}

export interface BookingSeat {
  package_id: string | null;
  people: number | null;
  status: string | null;
}

/** Travellers currently holding seats on a programme. */
export function bookedSeats(packageId: string, bookings: readonly BookingSeat[]): number {
  return bookings.reduce((sum, b) => {
    if (b.package_id !== packageId) return sum;
    if (b.status && RELEASED_BOOKING_STATUSES.has(b.status)) return sum;
    const people = Number(b.people ?? 0);
    return sum + (Number.isFinite(people) && people > 0 ? people : 0);
  }, 0);
}

/**
 * Availability for one programme.
 *
 * A programme with no capacity set reports `unset` rather than guessing a
 * number — the agency has simply not published one, and inventing a capacity
 * would put a fabricated figure in front of an operator.
 */
export function availabilityOf(
  packageId: string,
  totalSeats: number | null | undefined,
  bookings: readonly BookingSeat[],
): Availability {
  const booked = bookedSeats(packageId, bookings);
  const capacity =
    totalSeats === null || totalSeats === undefined || !Number.isFinite(Number(totalSeats))
      ? null
      : Math.max(0, Math.trunc(Number(totalSeats)));

  if (capacity === null) {
    return { capacity: null, booked, remaining: null, ratio: null, state: "unset" };
  }

  // Overselling is possible in the data; availability still floors at zero.
  const remaining = Math.max(0, capacity - booked);
  const ratio = capacity === 0 ? 1 : Math.min(1, booked / capacity);

  const state: AvailabilityState =
    remaining <= 0 ? "full" : remaining <= capacity * LIMITED_THRESHOLD ? "limited" : "available";

  return { capacity, booked, remaining, ratio, state };
}
