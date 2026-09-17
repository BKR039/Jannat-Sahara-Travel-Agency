import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { isOfferEditable, offerHasContent, unknownHotels } from "./offer-text";

/**
 * Offer preparation for a custom Umrah request.
 *
 * Uses the offer columns that already exist on `custom_package_requests` — no
 * second table, no duplicated state. Gated by `requireAdmin` (Phase 1 policy)
 * and audited through the existing `audit_logs` table.
 *
 * `offer_sent_at` is the one field that is never set by saving. It is written
 * only after the provider actually accepts the message, so "sent" in the UI
 * always means an email really left the system.
 */

const OfferInput = z.object({
  id: z.string().uuid(),
  proposedHotels: z.string().max(2000).optional().nullable(),
  proposedFlights: z.string().max(2000).optional().nullable(),
  offerAmount: z
    .number()
    .refine(Number.isFinite, "Must be a finite number")
    .min(0)
    .max(10_000_000)
    .nullable()
    .optional(),
  offerCurrency: z.enum(["TND", "EUR", "USD", "SAR"]).default("TND"),
  offerNotes: z.string().max(4000).optional().nullable(),
});

const clean = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return s.length ? s : null;
};

/**
 * Refuse hotel names the catalogue does not contain.
 *
 * Only the active catalogue counts: a deactivated hotel must not reappear in a
 * new offer. Nothing is auto-corrected — a mismatch is reported so the agent
 * fixes it, never silently swapped for a different hotel.
 */
async function assertKnownHotels(proposedHotels: string | null | undefined) {
  if (!proposedHotels?.trim()) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("hotels")
    .select("name, city")
    .eq("active", true);
  if (error) throw error;
  const unknown = unknownHotels(proposedHotels, rows ?? []);
  if (unknown.length > 0) throw new Error(`HOTEL_UNKNOWN:${unknown[0]}`);
}

/** Persist the draft offer. Never marks it as sent. */
export const saveOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OfferInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("./authorize.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: current, error: readError } = await supabaseAdmin
      .from("custom_package_requests")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw readError;
    if (!current) throw new Error("REQUEST_NOT_FOUND");

    // A confirmed or cancelled request is closed; editing its offer would
    // rewrite history the agency has already acted on.
    if (!isOfferEditable(current.status)) throw new Error("REQUEST_CLOSED");

    // Structured hotel lines must name a hotel the agency actually works with.
    // Free-form prose the agent types is left untouched.
    await assertKnownHotels(data.proposedHotels);

    const patch: Record<string, unknown> = {
      proposed_hotels: clean(data.proposedHotels),
      proposed_flights: clean(data.proposedFlights),
      offer_amount: data.offerAmount ?? null,
      offer_currency: data.offerCurrency,
      offer_notes: clean(data.offerNotes),
    };

    // Move an untouched request into the working state; never regress a
    // request the agency has already taken further.
    if (current.status === "new" || current.status === "reviewing") {
      patch["status"] = "offer_preparing";
    }

    const { error } = await supabaseAdmin
      .from("custom_package_requests")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw error;

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: (context.claims?.email as string) ?? null,
      action: "offer_updated",
      entity: "custom_package_requests",
      entity_id: data.id,
      metadata: { amount: data.offerAmount ?? null, currency: data.offerCurrency },
    });

    return { ok: true, status: (patch["status"] as string) ?? current.status };
  });

/**
 * Email the saved offer to the customer.
 *
 * Refuses rather than pretending when it cannot deliver: no customer email on
 * the request, no offer content, or no mail provider configured. `offer_sent_at`
 * is written only on a successful provider response.
 */
export const sendOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin } = await import("./authorize.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { renderOfferEmail } = await import("./offer-email.server");
    const { sanitizeHeaderValue } = await import("@/lib/security.server");

    const { data: row, error } = await supabaseAdmin
      .from("custom_package_requests")
      .select(
        "id, reference, customer_name, email, locale, status, offer_sent_at, departure_date, return_date, adults, children, infants, proposed_hotels, proposed_flights, offer_amount, offer_currency, offer_notes",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("REQUEST_NOT_FOUND");

    // Re-read guards, evaluated against the row as it stands right now — two
    // admins working the same request cannot both send, and a retried click
    // cannot produce a second email.
    if (row.offer_sent_at) throw new Error("OFFER_ALREADY_SENT");
    if (!isOfferEditable(row.status)) throw new Error("REQUEST_CLOSED");

    if (!row.email) throw new Error("NO_CUSTOMER_EMAIL");

    if (
      !offerHasContent({
        proposedHotels: row.proposed_hotels,
        proposedFlights: row.proposed_flights,
        offerAmount: row.offer_amount == null ? null : Number(row.offer_amount),
        offerNotes: row.offer_notes,
      })
    ) {
      throw new Error("OFFER_EMPTY");
    }

    // An amount is what makes this an offer rather than a message.
    if (row.offer_amount == null || !Number.isFinite(Number(row.offer_amount))) {
      throw new Error("OFFER_NO_AMOUNT");
    }

    await assertKnownHotels(row.proposed_hotels);

    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
    if (!resendKey) throw new Error("EMAIL_NOT_CONFIGURED");

    const { subject, html, text } = renderOfferEmail({
      reference: row.reference,
      customerName: row.customer_name,
      locale: row.locale ?? "ar",
      departureDate: row.departure_date,
      returnDate: row.return_date,
      adults: row.adults ?? 1,
      children: row.children ?? 0,
      infants: row.infants ?? 0,
      proposedHotels: row.proposed_hotels,
      proposedFlights: row.proposed_flights,
      offerAmount: row.offer_amount == null ? null : Number(row.offer_amount),
      offerCurrency: row.offer_currency ?? "TND",
      offerNotes: row.offer_notes,
    });

    /**
     * Email and database cannot be one transaction. The order below sends
     * first and records second, so a provider failure can never leave a
     * request marked as sent — the failure mode that matters most.
     *
     * The remaining window is the opposite one: the provider accepts, then the
     * timestamp write fails, leaving `offer_sent_at` NULL while the customer
     * already has the email. A retry would then send a second copy. The
     * idempotency key closes that: Resend collapses a repeat of the same key
     * into the original send, so retrying is safe rather than duplicative.
     */
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        // Stable per request: a retry is the same send, never a new one.
        "Idempotency-Key": `offer-${data.id}`,
      },
      body: JSON.stringify({
        from,
        to: [row.email],
        subject: sanitizeHeaderValue(subject, 200),
        html,
        text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(`[offer] send failed [${res.status}]: ${detail}`);
      throw new Error("EMAIL_SEND_FAILED");
    }

    // Only now is the offer genuinely sent.
    const sentAt = new Date().toISOString();
    // The message is out. Recording that must not be lost to a transient
    // database blip, so the write is retried briefly before giving up.
    const claimSend = async () =>
      await supabaseAdmin
        .from("custom_package_requests")
        .update({ offer_sent_at: sentAt, last_contact_at: sentAt, status: "contacted" } as never)
        // `is("offer_sent_at", null)` makes the write itself the lock: if
        // another admin got there first the update matches no row and we say
        // so instead of overwriting their timestamp.
        .is("offer_sent_at", null)
        .eq("id", data.id)
        .select("id");

    let claimed: Array<{ id: string }> | null = null;
    let updateError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await claimSend();
      updateError = result.error;
      claimed = result.data;
      if (!result.error) break;
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
    if (updateError) {
      // The customer has the email but we could not record it. Say so plainly
      // rather than reporting a clean success; the idempotency key makes the
      // admin's retry safe.
      console.error("[offer] sent but not recorded", updateError);
      throw new Error("OFFER_SENT_NOT_RECORDED");
    }
    if (!claimed || claimed.length === 0) throw new Error("OFFER_ALREADY_SENT");

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: (context.claims?.email as string) ?? null,
      action: "offer_sent",
      entity: "custom_package_requests",
      entity_id: data.id,
      metadata: { reference: row.reference },
    });

    return { ok: true, offerSentAt: sentAt };
  });
