import { createServerFn } from "@tanstack/react-start";
import { BookingInput } from "./booking.schema";

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => BookingInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { renderEmail } = await import("./booking-email.server");

    const primary = data.passengers.find((p) => p.isPrimary) ?? data.passengers[0];
    const totalPeople = data.adults + data.children + data.infants;

    if (!primary.phone || !primary.email) {
      throw new Error("Primary passenger must provide phone and email");
    }

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        package_id: data.packageId ?? null,
        package_title: data.packageTitle ?? null,
        package_category: data.packageCategory ?? null,
        name: primary.fullName,
        phone: primary.phone,
        email: primary.email,
        people: totalPeople,
        adults: data.adults,
        children: data.children,
        infants: data.infants,
        total_price: data.totalPrice ?? null,
        currency: data.currency,
        communication_preference: data.communicationPreference ?? null,
        emergency_contact: primary.emergencyContact ?? null,
        notes: data.notes ?? null,
        passport_path: primary.passportPath ?? null,
        status: "new",
      })
      .select("id, created_at")
      .single();

    if (error || !row) {
      console.error("[booking] insert failed", error);
      throw new Error("Failed to save booking");
    }

    const { error: paxError } = await supabaseAdmin.from("booking_passengers").insert(
      data.passengers.map((p, i) => ({
        booking_id: row.id,
        passenger_type: p.type,
        sort_order: i,
        is_primary: p.isPrimary,
        full_name: p.fullName,
        passport_number: p.passportNumber || null,
        nationality: p.nationality || null,
        gender: p.gender || null,
        date_of_birth: p.dateOfBirth || null,
        passport_expiry: p.passportExpiry || null,
        phone: p.phone || null,
        email: p.email || null,
        emergency_contact: p.emergencyContact || null,
        passport_path: p.passportPath || null,
        notes: p.notes || null,
      })),
    );

    if (paxError) {
      console.error("[booking] passengers insert failed", paxError);
    }

    // Best-effort email — never block the user if email fails.
    let emailSent = false;
    try {
      const resendKey = process.env.RESEND_API_KEY;
      const to = process.env.BOOKING_NOTIFICATION_EMAIL;
      const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

      if (resendKey && to) {
        const passportUrls: Array<string | null> = [];
        for (const p of data.passengers) {
          if (!p.passportPath) {
            passportUrls.push(null);
            continue;
          }
          const { data: signed } = await supabaseAdmin.storage
            .from("passports")
            .createSignedUrl(p.passportPath, 60 * 30);
          passportUrls.push(signed?.signedUrl ?? null);
        }

        const { html, text, subject } = renderEmail({
          id: row.id,
          createdAt: new Date(row.created_at).toISOString(),
          input: data,
          passportUrls,
        });

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from, to: [to], subject, html, text }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error(`[booking] resend failed [${res.status}]: ${body}`);
        } else {
          emailSent = true;
        }
      } else {
        console.warn("[booking] RESEND_API_KEY or BOOKING_NOTIFICATION_EMAIL missing — skipping email");
      }
    } catch (err) {
      console.error("[booking] email error", err);
    }

    return { id: row.id, emailSent };
  });
