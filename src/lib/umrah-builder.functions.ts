import { createServerFn } from "@tanstack/react-start";
import { CustomPackageRequestInput } from "./umrah-builder.schema";
import { customerKey } from "./admin/customer-identity";

export interface CatalogueHotel {
  id: string;
  name: string;
  city: string;
}

/**
 * Resolve a submitted hotel id against the live catalogue.
 *
 * `rows` must already be filtered to active hotels, so reaching this function
 * means: the id has to exist in that set AND belong to the city it was chosen
 * for. A stale draft, a deactivated hotel, a deleted hotel or a tampered
 * payload all land here and are refused — never silently swapped for another
 * hotel, and never stored as a request the agency cannot honour.
 *
 * @returns the catalogue name, or null when no hotel was selected
 * @throws  `HOTEL_UNAVAILABLE`
 */
export function resolveCatalogueHotel(
  rows: readonly CatalogueHotel[],
  id: string | null | undefined,
  city: "makkah" | "madinah",
): string | null {
  if (!id) return null;
  const row = rows.find((h) => h.id === id);
  if (!row || row.city !== city) throw new Error("HOTEL_UNAVAILABLE");
  return row.name;
}

/**
 * How long two identical submissions are treated as one.
 *
 * The request itself is the idempotency token: same customer, same trip shape,
 * within this window is a retry rather than a new enquiry. A genuinely
 * different trip differs in at least one compared field, and the same trip
 * asked again later falls outside the window — legitimate repeat business is
 * never suppressed.
 */
export const RESUBMIT_WINDOW_MS = 10 * 60 * 1000;

/** Fields that must all match for two submissions to be the same request. */
export const DUPLICATE_MATCH_FIELDS = [
  "customer_key",
  "departure_date",
  "return_date",
  "makkah_nights",
  "madinah_nights",
  "adults",
  "children",
  "infants",
] as const;

/** The shape compared when deciding whether two submissions are the same. */
export type DuplicateProbe = Record<
  (typeof DUPLICATE_MATCH_FIELDS)[number],
  string | number | null | undefined
>;

/**
 * True when two submissions describe the same request.
 *
 * Every compared field must match exactly — including `customer_key`, so one
 * traveller's retry can never collapse into a different traveller's request.
 * Nothing is compared approximately.
 */
export function isSameRequest(a: DuplicateProbe, b: DuplicateProbe): boolean {
  return DUPLICATE_MATCH_FIELDS.every((field) => (a[field] ?? null) === (b[field] ?? null));
}

/**
 * Public custom-Umrah-package endpoint: validated, sanitized, rate limited and
 * stored with the service-role client (the table has no anonymous insert policy).
 */
export const submitCustomPackageRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CustomPackageRequestInput.parse(d))
  .handler(async ({ data }) => {
    const {
      enforceRateLimit,
      sanitizeText,
      sanitizeOptionalText,
      sanitizeEmail,
      sanitizeHeaderValue,
    } = await import("./security.server");
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
    // hotel row is later archived, and so a submitted id cannot claim a hotel
    // the catalogue does not actually offer.
    const hotelIds = [data.makkahHotelId, data.madinahHotelId].filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
    let catalogue: CatalogueHotel[] = [];
    if (hotelIds.length) {
      const { data: rows, error: hotelError } = await supabaseAdmin
        .from("hotels")
        .select("id, name, city")
        .in("id", hotelIds)
        .eq("active", true);
      if (hotelError) {
        console.error("[custom-package] hotel lookup failed", hotelError);
        throw new Error("HOTEL_LOOKUP_FAILED");
      }
      catalogue = (rows ?? []) as CatalogueHotel[];
    }

    const makkahHotelName = resolveCatalogueHotel(catalogue, data.makkahHotelId, "makkah");
    const madinahHotelName = resolveCatalogueHotel(catalogue, data.madinahHotelId, "madinah");

    const row_phone = sanitizeText(data.phone, 32);
    const row_email = data.email ? sanitizeEmail(data.email) : null;

    const row = {
      reference,
      status: "new",
      customer_name: sanitizeText(data.name, 120),
      phone: row_phone,
      email: row_email,
      whatsapp: sanitizeOptionalText(data.whatsapp, 32) ?? null,
      contact_preference: data.contactPreference || null,
      room_type: data.roomType || null,
      locale: data.locale ?? "ar",
      departure_date: data.departureDate,
      return_date: data.returnDate,
      departure_airport: data.airportFlexible
        ? null
        : (sanitizeOptionalText(data.departureAirport, 120) ?? null),
      return_airport: data.airportFlexible
        ? null
        : (sanitizeOptionalText(data.returnAirport, 120) ?? null),
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
      // CRM link (Phase 7.1). Derived from the contact details this traveller
      // gave, with the exact rule the customer aggregation uses, so the request
      // lands on the right customer instead of creating a parallel identity.
      // The reference is the fallback identity when neither phone nor email is
      // usable — a key of one, never a merge into someone else's profile.
      customer_key: customerKey(row_phone, row_email, reference),
    };

    // A retried submission (double tap, refresh, flaky network) must not become
    // a second request or a second customer.
    const { data: recent } = await supabaseAdmin
      .from("custom_package_requests")
      .select(
        "id, reference, customer_key, departure_date, return_date, makkah_nights, madinah_nights, adults, children, infants",
      )
      .eq("customer_key", row.customer_key)
      .gte("created_at", new Date(Date.now() - RESUBMIT_WINDOW_MS).toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    const priorMatch = (recent ?? []).find((candidate) => isSameRequest(candidate, row));
    if (priorMatch) {
      // The traveller sees their real reference again; no second row is written
      // and no second notification email is sent.
      return { reference: priorMatch.reference, emailSent: false };
    }

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
          body: JSON.stringify({
            from,
            to: [to],
            subject: sanitizeHeaderValue(subject, 200),
            html,
            text,
          }),
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

    // Only the human-readable reference leaves the server. The internal row id
    // is never needed by the public UI and is not exposed.
    return { reference: inserted.reference, emailSent };
  });
