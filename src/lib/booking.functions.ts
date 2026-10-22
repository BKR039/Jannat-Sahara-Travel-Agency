import { createServerFn } from "@tanstack/react-start";
import { BookingInput } from "./booking.schema";

export const submitBooking = createServerFn({ method: "POST" })
  .validator((data: unknown) => BookingInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { renderEmail } = await import("./booking-email.server");
    const {
      enforceRateLimit,
      sanitizeText,
      sanitizeOptionalText,
      sanitizeEmail,
      sanitizeHeaderValue,
    } = await import("./security.server");

    // Throttle abusive submissions per client (fails open on infra errors).
    await enforceRateLimit({ scope: "booking", limit: 5, windowSeconds: 900 });

    const primary = data.passengers.find((p) => p.isPrimary) ?? data.passengers[0];
    const totalPeople = data.adults + data.children + data.infants;

    if (!primary.phone || !primary.email) {
      throw new Error("Primary passenger must provide phone and email");
    }

    // Validate passenger count breakdown consistency
    const adultPaxCount = data.passengers.filter((p) => p.type === "adult").length;
    const childPaxCount = data.passengers.filter((p) => p.type === "child").length;
    const infantPaxCount = data.passengers.filter((p) => p.type === "infant").length;
    if (
      adultPaxCount !== data.adults ||
      childPaxCount !== data.children ||
      infantPaxCount !== data.infants ||
      totalPeople !== data.passengers.length
    ) {
      throw new Error("Passenger counts do not match specified breakdown");
    }

    // Passport paths are issued server-side; never trust a client-supplied path.
    const isOwnPassportPath = (path: string | null | undefined) =>
      !!path && /^bookings\/[0-9a-f-]{36}\/passport\.[a-z0-9]{2,8}$/i.test(path);

    for (const p of data.passengers) {
      if (p.passportPath && !isOwnPassportPath(p.passportPath)) {
        throw new Error("Invalid passport reference");
      }
    }

    // Authoritative Server-Side Pricing Calculation (SEC-05)
    // Never trust client-controlled totalPrice for financial truth.
    let finalTotalPrice: number | null = null;
    let finalCurrency = data.currency || "TND";
    let finalPackageTitle = sanitizeOptionalText(data.packageTitle, 200);
    let finalPackageCategory = data.packageCategory ?? null;

    if (data.packageId) {
      const { data: pkg, error: pkgError } = await supabaseAdmin
        .from("packages")
        .select(
          "id, status, price, discount_price, child_price, infant_price, currency, title, category",
        )
        .eq("id", data.packageId)
        .maybeSingle();

      if (pkgError || !pkg) {
        throw new Error("Package not found");
      }

      if (pkg.status !== "published") {
        throw new Error("Selected package is not available for booking");
      }

      const adultPrice =
        pkg.discount_price != null ? Number(pkg.discount_price) : Number(pkg.price ?? 0);
      const childPrice = pkg.child_price != null ? Number(pkg.child_price) : adultPrice;
      const infantPrice = pkg.infant_price != null ? Number(pkg.infant_price) : 0;

      finalTotalPrice = Math.round(
        adultPrice * data.adults + childPrice * data.children + infantPrice * data.infants,
      );
      finalCurrency = pkg.currency || "TND";
      finalPackageTitle = sanitizeOptionalText(pkg.title, 200);
      finalPackageCategory = pkg.category;
    } else {
      // If no package is referenced, do not accept client-dictated financial totals
      finalTotalPrice = null;
    }

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        package_id: data.packageId ?? null,
        package_title: finalPackageTitle,
        package_category: finalPackageCategory,
        name: sanitizeText(primary.fullName, 120),
        phone: sanitizeText(primary.phone, 32),
        email: sanitizeEmail(primary.email),
        people: totalPeople,
        adults: data.adults,
        children: data.children,
        infants: data.infants,
        total_price: finalTotalPrice,
        currency: finalCurrency,
        communication_preference: data.communicationPreference ?? null,
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
        gender: p.gender || null,
        phone: sanitizeOptionalText(p.phone, 32),
        email: p.email ? sanitizeEmail(p.email) : null,
        passport_path: p.passportPath || null,
        notes: sanitizeOptionalText(p.notes, 1000),
      })),
    );

    if (paxError) {
      console.error("[booking] passengers insert failed", paxError);
    }

    // Connect to customer CRM record
    try {
      const { customerKey } = await import("./admin/customer-identity");
      const cKey = customerKey(primary.phone, primary.email, row.id);
      await supabaseAdmin.from("customer_profiles").upsert(
        {
          customer_key: cKey,
          full_name: sanitizeText(primary.fullName, 120),
          phone: sanitizeText(primary.phone, 32),
          email: primary.email ? sanitizeEmail(primary.email) : null,
          status: "customer",
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "customer_key" },
      );
    } catch (profileErr) {
      console.error("[booking] customer profile upsert failed (non-fatal)", profileErr);
    }

    // Best-effort email — never block the user if email fails.
    let emailSent = false;
    try {
      // Check database settings for booking notification recipient and toggle
      const { data: bookingEnabledRow } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("key", "email_booking_enabled")
        .maybeSingle();

      const bookingEnabled = bookingEnabledRow ? bookingEnabledRow.value !== "false" : true;

      const { data: recipientRow } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("key", "email_owner_recipient")
        .maybeSingle();

      const resendKey = process.env.RESEND_API_KEY;
      const to = process.env.BOOKING_NOTIFICATION_EMAIL || recipientRow?.value;
      const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

      if (bookingEnabled && resendKey && to) {
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
          input: {
            ...data,
            totalPrice: finalTotalPrice,
            currency: finalCurrency,
            packageTitle: finalPackageTitle,
            packageCategory: finalPackageCategory,
          },
          passportUrls,
        });

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [to],
            subject: sanitizeHeaderValue(subject, 200),
            html,
            text,
          }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error(`[booking] resend failed [${res.status}]: ${body}`);
        } else {
          emailSent = true;
        }
      } else {
        console.warn(
          "[booking] RESEND_API_KEY or BOOKING_NOTIFICATION_EMAIL missing — skipping email",
        );
      }
    } catch (err) {
      console.error("[booking] email error", err);
    }

    return { id: row.id, emailSent };
  });
