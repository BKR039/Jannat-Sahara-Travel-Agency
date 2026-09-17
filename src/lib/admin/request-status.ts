/**
 * The canonical request-status model — one definition shared by the admin UI
 * and the server function that writes it.
 *
 * Root cause this closes (U-06): the requests inbox rendered the same four
 * buttons for every request type, including `resolved`, which is not an allowed
 * value for `custom_package_requests` or `flight_requests`. The write reached
 * Postgres and died on the CHECK constraint with a generic error toast.
 *
 * Every list below mirrors a real database constraint. Do not add a value here
 * without adding it to the constraint first — and never widen the constraint to
 * match a UI guess.
 *
 *   custom_package_requests.status  CHECK (new|reviewing|offer_preparing|contacted|confirmed|cancelled)
 *   flight_requests.status          CHECK (new|contacted|waiting|quoted|confirmed|cancelled)
 *   bookings.status                 no CHECK — constrained here and in updateBooking
 *   contact_messages.status         no CHECK — defaults to `unread`; `handled`
 *                                   is derived from `resolved`
 */

export const REQUEST_KINDS = ["flight", "booking", "contact", "custom_package"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const CUSTOM_PACKAGE_STATUSES = [
  "new",
  "reviewing",
  "offer_preparing",
  "contacted",
  "confirmed",
  "cancelled",
] as const;

export const FLIGHT_STATUSES = [
  "new",
  "contacted",
  "waiting",
  "quoted",
  "confirmed",
  "cancelled",
] as const;

export const BOOKING_STATUSES = [
  "new",
  "pending",
  "contacted",
  "confirmed",
  "completed",
  "cancelled",
] as const;

/*
 * `unread` is the column default in `contact_messages`, so every message a
 * visitor sends arrives with it. It was missing from this list, which meant
 * `nextStatuses("contact", "unread")` returned nothing: the inbox treated a
 * brand-new message as a closed request and offered no way to act on it. It
 * is the same state as `new` and is modelled here rather than migrated, since
 * the rows and the dashboard's unread count both already use it.
 */
export const CONTACT_STATUSES = ["unread", "new", "contacted", "resolved"] as const;

export const STATUSES_BY_KIND: Record<RequestKind, readonly string[]> = {
  custom_package: CUSTOM_PACKAGE_STATUSES,
  flight: FLIGHT_STATUSES,
  booking: BOOKING_STATUSES,
  contact: CONTACT_STATUSES,
};

/** Statuses that close a request, shown apart from the working ones. */
export const TERMINAL_STATUSES = new Set(["confirmed", "completed", "resolved", "cancelled"]);

export function isValidStatus(kind: RequestKind, status: string): boolean {
  return STATUSES_BY_KIND[kind].includes(status);
}

/** i18n key for a status label; resolved by the caller through the admin namespace. */
export function statusLabelKey(status: string): string {
  return `ops.statuses.${status}`;
}

/* ------------------------------------------------------------- lifecycle */

/**
 * The one place that says which status may follow which (Phase 7.4).
 *
 * `isValidStatus` only answers "is this status legal for this kind" — it does
 * not stop a client jumping from `cancelled` straight back to `new`. These
 * maps close that gap, and the UI, the server and the tests all read them so
 * the rule cannot drift between layers.
 *
 * A terminal status has no outgoing transitions: once a request is confirmed
 * or cancelled it stays that way. Reopening is deliberately NOT modelled — the
 * agency creates a new request instead, which keeps the original history
 * truthful.
 */
export const ALLOWED_TRANSITIONS: Record<RequestKind, Record<string, readonly string[]>> = {
  custom_package: {
    new: ["reviewing", "offer_preparing", "contacted", "cancelled"],
    reviewing: ["offer_preparing", "contacted", "confirmed", "cancelled"],
    // Sending an offer moves the request to `contacted` (see offer.functions).
    offer_preparing: ["contacted", "confirmed", "cancelled"],
    // A revised offer legitimately goes back to preparing.
    contacted: ["offer_preparing", "confirmed", "cancelled"],
    confirmed: [],
    cancelled: [],
  },
  flight: {
    new: ["contacted", "waiting", "quoted", "cancelled"],
    contacted: ["waiting", "quoted", "confirmed", "cancelled"],
    waiting: ["contacted", "quoted", "confirmed", "cancelled"],
    quoted: ["contacted", "confirmed", "cancelled"],
    confirmed: [],
    cancelled: [],
  },
  booking: {
    new: ["pending", "contacted", "confirmed", "cancelled"],
    pending: ["contacted", "confirmed", "cancelled"],
    contacted: ["pending", "confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  },
  contact: {
    unread: ["contacted", "resolved"],
    new: ["contacted", "resolved"],
    contacted: ["resolved"],
    resolved: [],
  },
};

/**
 * Terminal means "nothing follows", and that is per kind, not global.
 *
 * `TERMINAL_STATUSES` is a presentation set — it tells the badge which
 * statuses to render as closed. It cannot decide the lifecycle, because
 * `confirmed` closes a custom Umrah request but a confirmed *booking* still
 * has `completed` ahead of it. Deriving terminality from the transition map
 * keeps the two from contradicting each other.
 */
export function isTerminalStatus(kind: RequestKind, status: string): boolean {
  return nextStatuses(kind, status).length === 0;
}

/** Statuses reachable from where the request stands right now. */
export function nextStatuses(kind: RequestKind, current: string): readonly string[] {
  return ALLOWED_TRANSITIONS[kind][current] ?? [];
}

/**
 * True when the move is legal. Staying put is always allowed so that saving a
 * note or an assignee without touching the status never trips the rule.
 */
export function canTransition(kind: RequestKind, from: string, to: string): boolean {
  if (!isValidStatus(kind, to) || !isValidStatus(kind, from)) return false;
  if (from === to) return true;
  return nextStatuses(kind, from).includes(to);
}

/**
 * Every transition target must itself be a status the database CHECK allows —
 * asserted by the test suite so a typo here can never reach a live UPDATE.
 */
export function lifecycleIsConsistent(): boolean {
  return REQUEST_KINDS.every((kind) => {
    const map = ALLOWED_TRANSITIONS[kind];
    const statuses = STATUSES_BY_KIND[kind];
    const keysCovered = statuses.every((s) => s in map);
    const targetsLegal = Object.values(map).every((targets) =>
      targets.every((t) => statuses.includes(t)),
    );
    // Every kind must end somewhere, and a dead end must be a status the
    // badge also treats as closed.
    const deadEnds = statuses.filter((s) => (map[s] ?? []).length === 0);
    const endsExist = deadEnds.length > 0;
    const deadEndsLookClosed = deadEnds.every((s) => TERMINAL_STATUSES.has(s));
    return keysCovered && targetsLegal && endsExist && deadEndsLookClosed;
  });
}
