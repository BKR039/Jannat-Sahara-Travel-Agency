import { createServerFn } from "@tanstack/react-start";
import { BookingInput } from "./booking.schema";

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => BookingInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { renderEmail } = await import("./booking-email.server");
    const { enforceRateLimit, sanitizeText, sanitizeOptionalText, sanitizeEmail, sanitizeHeaderValue } =
      await import("./security.server");

    // Throttle abusive submissions per client (fails open on infra errors).
    await enforceRateLimit({ scope: "booking", limit: 5, windowSeconds: 900 });

    const primary = data.passengers.find((p) => p.isPrimary) ?? data.passengers[0];
    const totalPeople = data.adults + data.children + data.infants;

    if (!primary.phone || !primary.email) {
      throw new Error("Primary passenger must provide phone and email");
    }

    // Passport paths are issued server-side; never trust a client-supplied path.
    const isOwnPassportPath = (path: string | null | undefined) =>
      !!path && /^bookings\/[0-9a-f-]{36}\/passport\.[a-z0-9]{2,8}$/i.test(path);

    for (const p of data.passengers) {
      if (p.passportPath && !isOwnPassportPath(p.passportPath)) {
        throw new Error("Invalid passport reference");
      }
    }

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        package_id: data.packageId ?? null,
        package_title: sanitizeOptionalText(data.packageTitle, 200),
        package_category: data.packageCategory ?? null,
        name: sanitizeText(primary.fullName, 120),
        phone: sanitizeText(primary.phone, 32),
        email: sanitizeEmail(primary.email),
        people: totalPeople,
        adults: data.adults,
        children: data.children,
        infants: data.infants,
        total_price: data.totalPrice ?? null,
        currency: data.currency,
        communication_preference: data.communicationPreference ?? null,
        emergency_contact: sanitizeOptionalText(primary.emergencyContact, 160),
        notes: sanitizeOptionalText(data.notes, 2000),
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
        full_name: sanitizeText(p.fullName, 120),
        passport_number: sanitizeOptionalText(p.passportNumber, 40),
        nationality: sanitizeOptionalText(p.nationality, 80),
        gender: p.gender || null,
        date_of_birth: p.dateOfBirth || null,
        passport_expiry: p.passportExpiry || null,
        phone: sanitizeOptionalText(p.phone, 32),
        email: p.email ? sanitizeEmail(p.email) : null,
        emergency_contact: sanitizeOptionalText(p.emergencyContact, 160),
        passport_path: p.passportPath || null,
        notes: sanitizeOptionalText(p.notes, 1000),
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
