import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Aggregated dashboard payload: KPIs, insights, upcoming trips, recent bookings. */
export const getCommandCenter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, loadCommandCenter } = await import("./dashboard.server");
    await assertAdmin(context.userId);
    return loadCommandCenter();
  });

/** Decision-oriented reports payload. */
export const getReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, loadReports } = await import("./dashboard.server");
    await assertAdmin(context.userId);
    return loadReports();
  });

/** Customer list derived from bookings, flight requests and messages. */
export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("./dashboard.server");
    const { loadCustomers } = await import("./crm.server");
    await assertAdmin(context.userId);
    const customers = await loadCustomers();
    return customers.map(({ bookingRows: _b, flightRows: _f, messageRows: _m, ...rest }) => rest);
  });

/** Full customer profile: bookings, requests, messages and internal notes. */
export const getCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ key: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ context, data }) => {
    const { assertAdmin } = await import("./dashboard.server");
    const { loadCustomer } = await import("./crm.server");
    await assertAdmin(context.userId);
    return loadCustomer(data.key);
  });

/** Add an internal note to a customer. */
export const addCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ key: z.string().min(1).max(200), note: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { assertAdmin } = await import("./dashboard.server");
    await assertAdmin(context.userId);
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
    const { assertAdmin } = await import("./dashboard.server");
    const { loadRequests } = await import("./crm.server");
    await assertAdmin(context.userId);
    return loadRequests();
  });

/** Update the status / assignment / internal note of any request type. */
export const updateRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        kind: z.enum(["flight", "booking", "contact"]),
        status: z.string().min(1).max(40).optional(),
        assigned_to: z.string().max(120).nullable().optional(),
        internal_notes: z.string().max(4000).optional(),
        admin_reply: z.string().max(4000).optional(),
        markContacted: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { assertAdmin } = await import("./dashboard.server");
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    if (data.kind === "flight") {
      const patch: Record<string, unknown> = {};
      if (data.status) patch["status"] = data.status;
      if (data.assigned_to !== undefined) patch["assigned_to"] = data.assigned_to;
      if (data.internal_notes !== undefined) patch["internal_notes"] = data.internal_notes;
      if (data.admin_reply !== undefined) patch["admin_reply"] = data.admin_reply;
      if (data.markContacted) patch["last_contact_at"] = now;
      if (data.status === "confirmed") patch["completed_at"] = now;
      const { error } = await supabaseAdmin.from("flight_requests").update(patch as never).eq("id", data.id);
      if (error) throw error;
    } else if (data.kind === "booking") {
      const patch: Record<string, unknown> = {};
      if (data.status) patch["status"] = data.status;
      if (data.internal_notes !== undefined) patch["notes"] = data.internal_notes;
      const { error } = await supabaseAdmin.from("bookings").update(patch as never).eq("id", data.id);
      if (error) throw error;
    } else {
      const patch: Record<string, unknown> = {};
      if (data.status) {
        patch["status"] = data.status;
        patch["handled"] = data.status === "resolved";
      }
      if (data.markContacted) patch["last_contact_at"] = now;
      const { error } = await supabaseAdmin.from("contact_messages").update(patch as never).eq("id", data.id);
      if (error) throw error;
    }
    return { ok: true };
  });

/** Update a booking's operational and payment status. */
export const updateBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "pending", "contacted", "confirmed", "completed", "cancelled"]).optional(),
        payment_status: z.enum(["unpaid", "partially_paid", "paid", "refunded"]).optional(),
        paid_amount: z.number().min(0).max(10_000_000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { assertAdmin } = await import("./dashboard.server");
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.status) patch["status"] = data.status;
    if (data.payment_status) patch["payment_status"] = data.payment_status;
    if (data.paid_amount !== undefined) patch["paid_amount"] = data.paid_amount;
    const { error } = await supabaseAdmin.from("bookings").update(patch as never).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Duplicate a trip: copies everything, clears dates, saves as draft. */
export const duplicateTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { assertAdmin } = await import("./dashboard.server");
    await assertAdmin(context.userId);
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
