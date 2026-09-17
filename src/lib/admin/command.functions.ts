import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { REQUEST_KINDS, canTransition, isTerminalStatus, isValidStatus } from "./request-status";

/** Request kind -> the table that stores it. Shared by the mutation and the history. */
const TABLE_BY_KIND_PUBLIC = {
  flight: "flight_requests",
  custom_package: "custom_package_requests",
  booking: "bookings",
  contact: "contact_messages",
} as const;

/** Aggregated dashboard payload: KPIs, insights, upcoming trips, recent bookings. */
export const getCommandCenter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./authorize.server");
    const { loadCommandCenter } = await import("./dashboard.server");
    await requireAdmin(context.userId);
    return loadCommandCenter();
  });

/** Decision-oriented reports payload. */
export const getReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./authorize.server");
    const { loadReports } = await import("./dashboard.server");
    await requireAdmin(context.userId);
    return loadReports();
  });

/** Customer list derived from bookings, flight requests, messages and Umrah requests. */
export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./authorize.server");
    const { loadCustomers } = await import("./crm.server");
    await requireAdmin(context.userId);
    const customers = await loadCustomers();
    // The list view needs counts, not the underlying rows; the per-customer
    // detail (getCustomer) is where the related records are actually loaded.
    return customers.map(
      ({ bookingRows: _b, flightRows: _f, messageRows: _m, customRows: _c, ...rest }) => rest,
    );
  });

/** Full customer profile: bookings, requests, messages and internal notes. */
export const getCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ key: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("./authorize.server");
    const { loadCustomer } = await import("./crm.server");
    await requireAdmin(context.userId);
    return loadCustomer(data.key);
  });

/** Add an internal note to a customer. */
export const addCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ key: z.string().min(1).max(200), note: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("./authorize.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("customer_notes").insert({
      customer_key: data.key,
      note: data.note,
      author_id: context.userId,
      author_email: (context.claims?.email as string) ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

/** Unified request inbox (flight requests + booking requests + contact messages). */
export const listRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./authorize.server");
    const { loadRequests } = await import("./crm.server");
    await requireAdmin(context.userId);
    return loadRequests();
  });

/** Update the status / assignment / internal note of any request type. */
export const updateRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        kind: z.enum(REQUEST_KINDS),
        status: z.string().min(1).max(40).optional(),
        assigned_to: z.string().max(120).nullable().optional(),
        internal_notes: z.string().max(4000).optional(),
        admin_reply: z.string().max(4000).optional(),
        markContacted: z.boolean().optional(),
      })
      // The status must be legal for THIS request type. Previously any string
      // up to 40 chars was accepted and the database CHECK constraint was the
      // only guard, which surfaced as an opaque failure (U-06).
      .refine((v) => !v.status || isValidStatus(v.kind, v.status), {
        message: "Status is not valid for this request type",
        path: ["status"],
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("./authorize.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    /**
     * The status the client asked for is never trusted (Phase 7.4). The row is
     * re-read here and the move is checked against the shared lifecycle map, so
     * a tampered payload cannot jump a cancelled request back to `new`, and a
     * closed request cannot be edited at all.
     *
     * `previousStatus` then scopes the UPDATE itself: if another admin changed
     * the request between this read and the write, the update matches no row
     * and we report a conflict rather than silently overwriting their decision.
     */
    const TABLE_BY_KIND = {
      flight: "flight_requests",
      custom_package: "custom_package_requests",
      booking: "bookings",
      contact: "contact_messages",
    } as const;

    const { data: currentRow, error: readError } = await supabaseAdmin
      .from(TABLE_BY_KIND[data.kind])
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw readError;
    if (!currentRow) throw new Error("REQUEST_NOT_FOUND");

    const previousStatus = String((currentRow as { status: string }).status);

    // A closed request accepts nothing at all — not a new status, not a note,
    // and not a redundant repeat of the status it already has. Checked before
    // the transition rule so "staying put" cannot become a loophole.
    if (isTerminalStatus(data.kind, previousStatus)) {
      throw new Error("REQUEST_CLOSED");
    }
    if (data.status && !canTransition(data.kind, previousStatus, data.status)) {
      throw new Error(`INVALID_TRANSITION:${previousStatus}->${data.status}`);
    }

    if (data.kind === "flight") {
      const patch: Record<string, unknown> = {};
      if (data.status) patch["status"] = data.status;
      if (data.assigned_to !== undefined) patch["assigned_to"] = data.assigned_to;
      if (data.internal_notes !== undefined) patch["internal_notes"] = data.internal_notes;
      if (data.admin_reply !== undefined) patch["admin_reply"] = data.admin_reply;
      if (data.markContacted) patch["last_contact_at"] = now;
      if (data.status === "confirmed") patch["completed_at"] = now;
      const { data: written, error } = await supabaseAdmin
        .from("flight_requests")
        .update(patch as never)
        .eq("id", data.id)
        .eq("status", previousStatus)
        .select("id");
      if (error) throw error;
      if (!written || written.length === 0) throw new Error("REQUEST_CONFLICT");
    } else if (data.kind === "custom_package") {
      const patch: Record<string, unknown> = {};
      if (data.status) patch["status"] = data.status;
      if (data.assigned_to !== undefined) patch["assigned_to"] = data.assigned_to;
      if (data.internal_notes !== undefined) patch["internal_notes"] = data.internal_notes;
      if (data.admin_reply !== undefined) patch["offer_notes"] = data.admin_reply;
      if (data.markContacted) patch["last_contact_at"] = now;
      const { data: written, error } = await supabaseAdmin
        .from("custom_package_requests")
        .update(patch as never)
        .eq("id", data.id)
        .eq("status", previousStatus)
        .select("id");
      if (error) throw error;
      if (!written || written.length === 0) throw new Error("REQUEST_CONFLICT");
    } else if (data.kind === "booking") {
      const patch: Record<string, unknown> = {};
      if (data.status) patch["status"] = data.status;
      /*
       * `bookings.notes` is the traveller's own note, written by the public
       * booking form and shown read-only in the bookings screen — it is not an
       * operator field. Mapping `internal_notes` onto it meant any caller that
       * sent a staff note would overwrite what the customer wrote. No caller
       * did, so nothing is lost by removing it; the table simply has no
       * internal-notes column, and the admin UI no longer offers one here.
       */
      const { data: written, error } = await supabaseAdmin
        .from("bookings")
        .update(patch as never)
        .eq("id", data.id)
        .eq("status", previousStatus)
        .select("id");
      if (error) throw error;
      if (!written || written.length === 0) throw new Error("REQUEST_CONFLICT");
    } else {
      const patch: Record<string, unknown> = {};
      if (data.status) {
        patch["status"] = data.status;
        patch["handled"] = data.status === "resolved";
      }
      if (data.markContacted) patch["last_contact_at"] = now;
      const { data: written, error } = await supabaseAdmin
        .from("contact_messages")
        .update(patch as never)
        .eq("id", data.id)
        .eq("status", previousStatus)
        .select("id");
      if (error) throw error;
      if (!written || written.length === 0) throw new Error("REQUEST_CONFLICT");
    }
    // The status change is the single most useful thing a timeline can show,
    // and nothing recorded it before (the generic audit trigger does not cover
    // these tables). Written to the existing audit_logs — no second system.
    if (data.status && data.status !== previousStatus) {
      const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
        actor_id: context.userId,
        actor_email: (context.claims?.email as string) ?? null,
        action: "request_status_changed",
        entity: TABLE_BY_KIND[data.kind],
        entity_id: data.id,
        metadata: { from: previousStatus, to: data.status, kind: data.kind },
      });
      // The mutation already succeeded; a failed audit write is logged rather
      // than thrown, so the admin is not told their status change failed.
      if (auditError) console.error("[request] audit write failed", auditError.message);
    }

    return { ok: true, status: data.status ?? previousStatus };
  });

/**
 * Permanently delete one request.
 *
 * This existed only as a browser-side `supabase.from(...).delete()`, which RLS
 * refuses for authenticated admins. A delete that matches no row is not an
 * error, so the screen reported "deleted" and the request stayed exactly where
 * it was — the most misleading possible outcome for a destructive action.
 *
 * Running it here puts the delete behind the same `requireAdmin` gate as every
 * other mutation, and makes the failure real: if no row matched, the caller is
 * told so instead of being congratulated.
 */
export const deleteRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        kind: z.enum(REQUEST_KINDS),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("./authorize.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const table = TABLE_BY_KIND_PUBLIC[data.kind];
    const { data: deleted, error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw error;
    if (!deleted || deleted.length === 0) throw new Error("REQUEST_NOT_FOUND");

    // Deleting the row removes its own history, so the audit entry records the
    // id as plain metadata rather than pointing at something that is now gone.
    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "request.delete",
      entity: table,
      entity_id: data.id,
      metadata: { kind: data.kind },
    });
    if (auditError) console.error("[request] audit write failed", auditError.message);

    return { ok: true as const };
  });

/**
 * Operational history for one request.
 *
 * Reads the existing `audit_logs`, scoped to this request's entity and id, so
 * an admin can never pull another request's history — or the audit trail of an
 * unrelated table — through this endpoint. Only the columns the timeline
 * renders are selected, and the page size is bounded.
 */
export const getRequestActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        kind: z.enum(REQUEST_KINDS),
        limit: z.number().int().min(1).max(100).optional(),
        before: z.string().datetime().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("./authorize.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { REQUEST_ENTITY, ACTIVITY_PAGE_SIZE, buildTimeline } = await import("./activity");

    const limit = data.limit ?? ACTIVITY_PAGE_SIZE;

    let query = supabaseAdmin
      .from("audit_logs")
      .select("id, action, actor_id, actor_email, created_at, metadata")
      .eq("entity", REQUEST_ENTITY[data.kind])
      .eq("entity_id", data.id)
      .order("created_at", { ascending: false })
      // One extra row tells us whether another page exists without a count.
      .limit(limit + 1);
    if (data.before) query = query.lt("created_at", data.before);

    const { data: rows, error } = await query;
    if (error) throw error;

    const page = (rows ?? []).slice(0, limit);
    const hasMore = (rows ?? []).length > limit;

    // The opening event comes from the request row itself, and only belongs on
    // the last page — otherwise it would appear above older audit entries.
    let createdAt: string | null = null;
    if (!hasMore) {
      const { data: reqRow } = await supabaseAdmin
        .from(TABLE_BY_KIND_PUBLIC[data.kind])
        .select("created_at")
        .eq("id", data.id)
        .maybeSingle();
      createdAt = (reqRow as { created_at?: string } | null)?.created_at ?? null;
    }

    return {
      events: buildTimeline(data.id, createdAt, page, hasMore),
      hasMore,
    };
  });

/** Update a booking's operational and payment status. */
export const updateBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z
          .enum(["new", "pending", "contacted", "confirmed", "completed", "cancelled"])
          .optional(),
        payment_status: z.enum(["unpaid", "partially_paid", "paid", "refunded"]).optional(),
        paid_amount: z.number().min(0).max(10_000_000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("./authorize.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.status) patch["status"] = data.status;
    if (data.payment_status) patch["payment_status"] = data.payment_status;
    if (data.paid_amount !== undefined) patch["paid_amount"] = data.paid_amount;
    const { error } = await supabaseAdmin
      .from("bookings")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Duplicate a trip: copies everything, clears dates, saves as draft. */
export const duplicateTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("./authorize.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("packages")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Trip not found");

    const copy = { ...(row as Record<string, unknown>) };
    delete copy["id"];
    delete copy["created_at"];
    delete copy["updated_at"];
    copy["title"] = `${String(row.title)} (copy)`;
    copy["slug"] = `${String(row.slug)}-copy-${Math.random().toString(36).slice(2, 6)}`;
    copy["status"] = "draft";
    copy["featured"] = false;
    copy["departure_date"] = null;
    copy["return_date"] = null;

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("packages")
      .insert(copy as never)
      .select("id")
      .single();
    if (insertError) throw insertError;
    return { id: inserted.id };
  });
