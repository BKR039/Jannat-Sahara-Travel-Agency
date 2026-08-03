import { createServerFn } from "@tanstack/react-start";
import { FlightRequestInput } from "./flight-request.schema";

/** Public flight-request endpoint: validated, sanitized and rate limited. */
export const submitFlightRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => FlightRequestInput.parse(d))
  .handler(async ({ data }) => {
    const { enforceRateLimit, sanitizeText, sanitizeOptionalText, sanitizeEmail, sanitizeHeaderValue } =
      await import("./security.server");
    const { renderFlightRequestEmail } = await import("./flight-request-email.server");

    await enforceRateLimit({ scope: "flight_request", limit: 5, windowSeconds: 900 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const reference = `JS-FLT-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(
      Math.random() * 36 ** 2,
    )
      .toString(36)
      .toUpperCase()
      .padStart(2, "0")}`;

    const clean = {
      name: sanitizeText(data.name, 120),
      phone: sanitizeText(data.phone, 32),
      email: sanitizeEmail(data.email),
      from_airport: sanitizeText(data.fromAirport, 120),
      to_airport: sanitizeText(data.toAirport, 120),
      trip_type: data.tripType,
      departure_date: data.departureDate,
      return_date: data.tripType === "round_trip" ? data.returnDate || null : null,
      adults: data.adults,
      children: data.children,
      infants: data.infants,
      cabin_class: data.cabinClass,
      notes: sanitizeOptionalText(data.notes, 2000),
    };

    const { data: row, error } = await supabaseAdmin
      .from("flight_requests")
      .insert({ ...clean, reference, status: "new" })
      .select("id, reference, created_at")
      .single();

    if (error || !row) {
      console.error("[flight-request] insert failed", error);
      throw new Error("Failed to save your request");
    }

    let emailSent = false;
    try {
      const resendKey = process.env.RESEND_API_KEY;
      const to = process.env.BOOKING_NOTIFICATION_EMAIL;
      const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

      if (resendKey && to) {
        const { html, text, subject } = renderFlightRequestEmail({
          reference: row.reference,
          createdAt: new Date(row.created_at).toISOString(),
          input: {
            ...data,
            name: clean.name,
            phone: clean.phone,
            email: clean.email,
            fromAirport: clean.from_airport,
            toAirport: clean.to_airport,
            notes: clean.notes ?? "",
            returnDate: clean.return_date ?? "",
          },
        });

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [to], subject: sanitizeHeaderValue(subject, 200), html, text }),
        });
        if (!res.ok) {
          console.error(`[flight-request] resend failed [${res.status}]: ${await res.text()}`);
        } else {
          emailSent = true;
        }
      } else {
        console.warn("[flight-request] email env missing — skipping notification");
      }
    } catch (err) {
      console.error("[flight-request] email error", err);
    }

    return { id: row.id, reference: row.reference, emailSent };
  });
