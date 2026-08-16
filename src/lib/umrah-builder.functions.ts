import { createServerFn } from "@tanstack/react-start";
import { CustomPackageRequestInput } from "./umrah-builder.schema";

/**
 * Public custom-Umrah-package endpoint: validated, sanitized, rate limited and
 * stored with the service-role client (the table has no anonymous insert policy).
 */
export const submitCustomPackageRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CustomPackageRequestInput.parse(d))
  .handler(async ({ data }) => {
    const { enforceRateLimit, sanitizeText, sanitizeOptionalText, sanitizeEmail, sanitizeHeaderValue } =
      await import("./security.server");
    const { renderCustomPackageEmail } = await import("./umrah-builder-email.server");

    await enforceRateLimit({ scope: "custom_package_request", limit: 5, windowSeconds: 900 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const reference = `JS-UMR-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(
      Math.random() * 36 ** 2,
    )
      .toString(36)
      .toUpperCase()
      .padStart(2, "0")}`;

    // Resolve hotel names server-side so the request stays readable even if a
    // hotel row is later archived or removed from the catalogue.
    const hotelIds = [data.makkahHotelId, data.madinahHotelId].filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
    const hotelNames = new Map<string, string>();
    if (hotelIds.length) {
      const { data: hotels } = await supabaseAdmin
        .from("hotels")
        .select("id, name")
        .in("id", hotelIds);
      (hotels ?? []).forEach((h) => hotelNames.set(h.id, h.name));
    }

    const makkahHotelName = data.makkahHotelId ? hotelNames.get(data.makkahHotelId) ?? null : null;
    const madinahHotelName = data.madinahHotelId ? hotelNames.get(data.madinahHotelId) ?? null : null;

    const row = {
      reference,
      status: "new",
      customer_name: sanitizeText(data.name, 120),
      phone: sanitizeText(data.phone, 32),
      email: data.email ? sanitizeEmail(data.email) : null,
      locale: data.locale ?? "ar",
      departure_date: data.departureDate,
      return_date: data.returnDate,
      departure_airport: data.airportFlexible ? null : sanitizeOptionalText(data.departureAirport, 120) ?? null,
      return_airport: data.airportFlexible ? null : sanitizeOptionalText(data.returnAirport, 120) ?? null,
      airport_flexible: !!data.airportFlexible,
      makkah_nights: data.makkahNights,
      makkah_hotel_id: data.makkahHotelId ?? null,
      makkah_hotel_name: makkahHotelName,
      makkah_area: data.makkahArea || null,
      makkah_preference: data.makkahPreference || null,
      madinah_nights: data.madinahNights,
      madinah_hotel_id: data.madinahHotelId ?? null,
      madinah_hotel_name: madinahHotelName,
      madinah_area: data.madinahArea || null,
      madinah_preference: data.madinahPreference || null,
      adults: data.adults,
      children: data.children,
      infants: data.infants,
      notes: sanitizeOptionalText(data.notes, 2000) ?? null,
    };

    const { data: inserted, error } = await supabaseAdmin
      .from("custom_package_requests")
      .insert(row as never)
      .select("id, reference, created_at")
      .single();

    if (error || !inserted) {
      console.error("[custom-package] insert failed", error);
      throw new Error("Failed to save your request");
    }

    let emailSent = false;
    try {
      const resendKey = process.env.RESEND_API_KEY;
      const to = process.env.BOOKING_NOTIFICATION_EMAIL;
      const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

      if (resendKey && to) {
        const { subject, html, text } = renderCustomPackageEmail({
          reference: inserted.reference,
          createdAt: new Date(inserted.created_at).toISOString(),
          input: { ...data, name: row.customer_name, phone: row.phone, email: row.email ?? "" },
          makkahHotelName,
          madinahHotelName,
        });

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [to], subject: sanitizeHeaderValue(subject, 200), html, text }),
        });
        if (!res.ok) {
          console.error(`[custom-package] resend failed [${res.status}]: ${await res.text()}`);
        } else {
          emailSent = true;
        }
      } else {
        console.warn("[custom-package] email env missing — skipping notification");
      }
    } catch (err) {
      console.error("[custom-package] email error", err);
    }

    return { id: inserted.id, reference: inserted.reference, emailSent };
  });
