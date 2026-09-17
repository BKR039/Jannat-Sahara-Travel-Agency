import { canTransition, isTerminalStatus, type RequestKind } from "./request-status";

/**
 * The operator's view of where a request stands.
 *
 * The database keeps a per-kind lifecycle — six statuses for a flight request,
 * six for a custom Umrah request, three for a message — and the inbox used to
 * put all of them in front of the operator as competing buttons. That is a
 * modelling detail leaking into the job: someone answering the phone needs to
 * know whether a request is being worked on, agreed, or turned down, and to be
 * able to move it between exactly those three.
 *
 * So this module is a projection, not a replacement. Nothing here widens what
 * the database accepts: every action still resolves to a real status, still
 * goes through `canTransition`, and is still re-checked server-side by
 * `updateRequest`. The detailed status remains stored, remains in the audit
 * log, and remains visible on the request as the precise state.
 */

export const REQUEST_STAGES = ["new", "processing", "confirmed", "declined"] as const;
export type RequestStage = (typeof REQUEST_STAGES)[number];

/** The three moves an operator can make, in the order they are presented. */
export const STAGE_ACTIONS = ["processing", "confirmed", "declined"] as const;
export type StageAction = (typeof STAGE_ACTIONS)[number];

/**
 * Which stored status each stage means, per kind.
 *
 * A contact message has no "declined": a customer question is answered or it
 * is not, and `contact_messages` has no status that means refused. The action
 * is hidden there rather than mapped onto something that means something else.
 */
const STAGE_OF: Record<RequestKind, Record<string, RequestStage>> = {
  flight: {
    new: "new",
    contacted: "processing",
    waiting: "processing",
    quoted: "processing",
    confirmed: "confirmed",
    cancelled: "declined",
  },
  custom_package: {
    new: "new",
    reviewing: "processing",
    offer_preparing: "processing",
    contacted: "processing",
    confirmed: "confirmed",
    cancelled: "declined",
  },
  booking: {
    new: "new",
    pending: "processing",
    contacted: "processing",
    confirmed: "confirmed",
    completed: "confirmed",
    cancelled: "declined",
  },
  contact: {
    // `unread` is the column default a new message arrives with.
    unread: "new",
    new: "new",
    contacted: "processing",
    resolved: "confirmed",
  },
};

/** The status a stage action writes. `null` means the kind has no such move. */
const STAGE_TARGET: Record<RequestKind, Record<StageAction, string | null>> = {
  flight: { processing: "contacted", confirmed: "confirmed", declined: "cancelled" },
  custom_package: { processing: "reviewing", confirmed: "confirmed", declined: "cancelled" },
  booking: { processing: "pending", confirmed: "confirmed", declined: "cancelled" },
  contact: { processing: "contacted", confirmed: "resolved", declined: null },
};

/** Where this request stands, in the operator's terms. */
export function stageOf(kind: RequestKind, status: string): RequestStage {
  return STAGE_OF[kind][status] ?? "new";
}

/** i18n key for the name of a stage (the state, e.g. "confirmed"). */
export function stageLabelKey(stage: RequestStage): string {
  return `ops.stages.state.${stage}`;
}

/** i18n key for the button that moves a request into a stage. */
export function stageActionKey(action: StageAction): string {
  return `ops.stages.action.${action}`;
}

export interface StageOption {
  action: StageAction;
  /** Status this button would write, or null when the kind has no such move. */
  target: string | null;
  /** True when the request already stands in this stage. */
  current: boolean;
  /** False when the lifecycle refuses the move from where the request is. */
  enabled: boolean;
  /**
   * Why a disabled button is disabled:
   *  - "closed"  the request is finished and accepts no further change;
   *  - "blocked" the move needs an intermediate step (a flight request cannot
   *              go straight from new to confirmed — it is worked on first).
   */
  blockedBy: "closed" | "blocked" | null;
}

/**
 * The three buttons for one request, already resolved against the lifecycle.
 *
 * A move the database would refuse comes back disabled rather than absent, so
 * the operator always sees the same three controls in the same order and can
 * tell "not yet" from "not available here".
 */
export function stageOptions(kind: RequestKind, status: string): StageOption[] {
  const closed = isTerminalStatus(kind, status);
  const here = stageOf(kind, status);
  return STAGE_ACTIONS.filter((action) => STAGE_TARGET[kind][action] !== null).map((action) => {
    const target = STAGE_TARGET[kind][action];
    const current = here === action;
    if (current || closed) {
      return { action, target, current, enabled: false, blockedBy: current ? null : "closed" };
    }
    const allowed = !!target && canTransition(kind, status, target);
    return {
      action,
      target,
      current: false,
      enabled: allowed,
      blockedBy: allowed ? null : "blocked",
    };
  });
}

/** Stage a list filter selects, or "all". */
export type StageFilter = "all" | "open" | RequestStage;

/** True when a request belongs in the given filter bucket. */
export function matchesStageFilter(
  filter: StageFilter,
  kind: RequestKind,
  status: string,
): boolean {
  if (filter === "all") return true;
  const stage = stageOf(kind, status);
  // "Open" is the working queue: everything not yet decided either way.
  if (filter === "open") return stage === "new" || stage === "processing";
  return stage === filter;
}
