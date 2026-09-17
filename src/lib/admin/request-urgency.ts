/**
 * How urgent a request is, and how a queue of them should be ordered.
 *
 * Phase 7.2 put this logic inline in the Command Center queue. The inbox needs
 * exactly the same judgement, so rather than write it twice the rule is
 * extracted here and both callers read it. The thresholds and the ordering are
 * unchanged from the dashboard — this is a move, not a new model.
 */

const DAY = 86_400_000;

/** Travel this close means the request cannot wait. */
export const DEPARTURE_SOON_DAYS = 30;

/** A new request untouched for longer than this is overdue a first reply. */
export const FIRST_REPLY_HOURS = 24;

export type Urgency = "departure" | "waiting" | null;

export interface UrgencyInput {
  status: string;
  createdAt: string;
  departureDate?: string | null;
  lastContactAt?: string | null;
}

/** Whole days until departure, or null when no date was given. */
export function daysToDeparture(
  departureDate: string | null | undefined,
  now = Date.now(),
): number | null {
  if (!departureDate) return null;
  const t = new Date(departureDate).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((t - now) / DAY);
}

/**
 * Why this request needs attention, or null when it is simply queued.
 *
 * Departure pressure outranks a slow first reply: a trip leaving next week
 * matters more than one that has been sitting unanswered for two days.
 */
export function urgencyOf(r: UrgencyInput, now = Date.now()): Urgency {
  const days = daysToDeparture(r.departureDate, now);
  if (days != null && days <= DEPARTURE_SOON_DAYS) return "departure";
  const waiting = now - new Date(r.createdAt).getTime();
  if (r.status === "new" && !r.lastContactAt && waiting > DAY) return "waiting";
  return null;
}

/**
 * Queue order: soonest departure first, then longest waiting.
 *
 * Requests with no departure date sort after every dated one rather than
 * jumping the queue on a missing value.
 */
export function byUrgency(a: UrgencyInput, b: UrgencyInput): number {
  const aDep = a.departureDate ? new Date(a.departureDate).getTime() : Infinity;
  const bDep = b.departureDate ? new Date(b.departureDate).getTime() : Infinity;
  if (aDep !== bDep) return aDep - bDep;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/** i18n key for an urgency badge. */
export function urgencyLabelKey(u: Exclude<Urgency, null>): string {
  return `ops.requests.urgency.${u}`;
}
