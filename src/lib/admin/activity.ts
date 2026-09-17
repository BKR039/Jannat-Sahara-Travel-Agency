/**
 * Operational history for one request, derived from the existing `audit_logs`.
 *
 * No second audit system exists and none is created here: `audit_logs` already
 * carries actor, action, entity, entity_id, metadata and a timestamp, so the
 * timeline is a read-model over rows the application already writes.
 *
 * The one event that is NOT an audit row is "request created". The request's
 * own `created_at` records it, and adding a write just to render it would put
 * a row in the audit trail that documents nothing the row itself doesn't
 * already prove. It is synthesised from real data and always attributed to the
 * system, never to a person.
 */

import type { RequestKind } from "./request-status";

export type ActivityActorKind = "user" | "system";

export interface ActivityEvent {
  id: string;
  /** i18n key suffix under `ops.activity.events.*`. */
  event: string;
  at: string;
  actorKind: ActivityActorKind;
  /** Display name for a person, or null for a system event. */
  actorLabel: string | null;
  /** Status transition, when the event carries one. */
  from?: string;
  to?: string;
  /** Already-formatted, non-sensitive detail (e.g. an offer amount). */
  detail?: string;
}

/** Audit actions this timeline knows how to render. */
export const KNOWN_ACTIONS: Record<string, string> = {
  request_status_changed: "statusChanged",
  offer_updated: "offerUpdated",
  offer_sent: "offerSent",
};

/** The audit row shape the timeline reads — only these columns are selected. */
export interface AuditRow {
  id: string;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
  metadata: unknown;
}

/**
 * A person's display name, never a raw identifier.
 *
 * The audit trail stores an email, which is the only human-readable handle it
 * has. The local part is shown so the admin recognises a colleague without the
 * full address being rendered into a shared screen; a row with no actor is a
 * system event and is labelled as such rather than guessing a name.
 */
export function actorLabel(row: Pick<AuditRow, "actor_id" | "actor_email">): {
  kind: ActivityActorKind;
  label: string | null;
} {
  const email = (row.actor_email ?? "").trim();
  if (email) {
    const local = email.split("@")[0] ?? "";
    return { kind: "user", label: local || null };
  }
  // An actor id with no email still means a person acted, but we cannot name
  // them — a UUID is not a name, so it is never shown.
  if (row.actor_id) return { kind: "user", label: null };
  return { kind: "system", label: null };
}

/** Keys that must never reach the screen, whatever a future writer stores. */
const SENSITIVE_KEYS = [
  "email",
  "phone",
  "whatsapp",
  "passport",
  "token",
  "key",
  "secret",
  "password",
  "authorization",
  "provider",
  "response",
];

function isSensitive(key: string): boolean {
  const k = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => k.includes(s));
}

/** Read one scalar from audit metadata, refusing anything sensitive. */
export function safeMeta(metadata: unknown, key: string): string | number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  if (isSensitive(key)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  if (typeof value === "string") return value.slice(0, 120);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

/**
 * Turn audit rows into timeline events, newest first.
 *
 * Unknown actions are dropped rather than rendered as a raw database string:
 * a timeline that shows `some_internal_action` to an agency owner is worse
 * than one that shows nothing.
 */
export function toActivity(rows: readonly AuditRow[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const row of rows) {
    const event = KNOWN_ACTIONS[row.action];
    if (!event) continue;

    const { kind, label } = actorLabel(row);
    const item: ActivityEvent = {
      id: row.id,
      event,
      at: row.created_at,
      actorKind: kind,
      actorLabel: label,
    };

    if (row.action === "request_status_changed") {
      const from = safeMeta(row.metadata, "from");
      const to = safeMeta(row.metadata, "to");
      if (typeof from === "string") item.from = from;
      if (typeof to === "string") item.to = to;
    }

    if (row.action === "offer_sent" || row.action === "offer_updated") {
      const amount = safeMeta(row.metadata, "amount");
      const currency = safeMeta(row.metadata, "currency");
      if (typeof amount === "number" && typeof currency === "string") {
        item.detail = `${amount.toLocaleString("en-US")} ${currency}`;
      }
    }

    events.push(item);
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/**
 * The synthesised opening event.
 *
 * Placed last because the list is newest-first, and always attributed to the
 * system: a custom request arrives from the public builder, not from an admin.
 */
export function createdEvent(requestId: string, createdAt: string): ActivityEvent {
  return {
    id: `created-${requestId}`,
    event: "requestCreated",
    at: createdAt,
    actorKind: "system",
    actorLabel: null,
  };
}

/** Complete newest-first timeline for a request. */
export function buildTimeline(
  requestId: string,
  createdAt: string | null,
  rows: readonly AuditRow[],
  /** True when older audit rows were not fetched, so "created" is not the end. */
  hasMore = false,
): ActivityEvent[] {
  const events = toActivity(rows);
  if (createdAt && !hasMore) events.push(createdEvent(requestId, createdAt));
  return events;
}

/** i18n key for a timeline event label. */
export function activityLabelKey(event: string): string {
  return `ops.activity.events.${event}`;
}

/** Entity name used by every custom-request audit row. */
export const REQUEST_ENTITY: Record<RequestKind, string> = {
  custom_package: "custom_package_requests",
  flight: "flight_requests",
  booking: "bookings",
  contact: "contact_messages",
};

/** How many events one page of history holds. */
export const ACTIVITY_PAGE_SIZE = 20;
