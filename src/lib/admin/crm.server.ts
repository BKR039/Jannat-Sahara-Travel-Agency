/**
 * Server-only customer (CRM) aggregation.
 *
 * Customers are derived from existing bookings, flight requests, contact
 * messages and custom Umrah requests — there is no separate customer table, so
 * nothing in the schema is duplicated. The grouping rule lives in
 * ./customer-identity so the submission path, the request inbox and this
 * aggregation all resolve the same person to the same key.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { customerKey } from "./customer-identity";

export interface CustomerSummary {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  bookings: number;
  requests: number;
  /** Custom Umrah Builder requests — counted inside `requests` as well. */
  umrahRequests: number;
  lastTrip: string | null;
  lastActivity: string;
  totalSpent: number;
  currency: string;
  status: "customer" | "lead" | "cancelled";
}

const ACTIVE = ["new", "pending", "contacted", "confirmed", "completed"];

export async function loadCustomers() {
  const [bookingsRes, flightsRes, messagesRes, customRes] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select(
        "id, name, phone, email, package_id, package_title, status, payment_status, paid_amount, total_price, currency, adults, children, infants, people, created_at",
      )
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("flight_requests")
      .select(
        "id, reference, name, phone, email, status, from_airport, to_airport, created_at, last_contact_at",
      )
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("contact_messages")
      .select("id, name, email, phone, subject, message, status, handled, created_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("custom_package_requests")
      .select(
        "id, reference, customer_name, phone, email, status, departure_date, return_date, makkah_nights, madinah_nights, adults, children, infants, created_at, last_contact_at",
      )
      .order("created_at", { ascending: false }),
  ]);

  const bookings = bookingsRes.data ?? [];
  const flights = flightsRes.data ?? [];
  const messages = messagesRes.data ?? [];
  const customRequests = customRes.data ?? [];

  const map = new Map<
    string,
    CustomerSummary & {
      bookingRows: typeof bookings;
      flightRows: typeof flights;
      messageRows: typeof messages;
      customRows: typeof customRequests;
    }
  >();

  function ensure(
    key: string,
    name: string | null,
    phone: string | null,
    email: string | null,
    createdAt: string,
    currency: string,
  ) {
    const existing = map.get(key);
    if (existing) {
      existing.name = existing.name || name || "Unknown";
      existing.phone = existing.phone ?? phone ?? null;
      existing.email = existing.email ?? email ?? null;
      if (new Date(createdAt) > new Date(existing.lastActivity)) existing.lastActivity = createdAt;
      return existing;
    }
    const created = {
      key,
      name: name || "Unknown",
      phone: phone ?? null,
      email: email ?? null,
      bookings: 0,
      requests: 0,
      umrahRequests: 0,
      lastTrip: null as string | null,
      lastActivity: createdAt,
      totalSpent: 0,
      currency,
      status: "lead" as CustomerSummary["status"],
      bookingRows: [] as typeof bookings,
      flightRows: [] as typeof flights,
      messageRows: [] as typeof messages,
      customRows: [] as typeof customRequests,
    };
    map.set(key, created);
    return created;
  }

  bookings.forEach((b) => {
    const c = ensure(
      customerKey(b.phone, b.email, b.id),
      b.name,
      b.phone,
      b.email,
      b.created_at,
      b.currency ?? "TND",
    );
    c.bookingRows.push(b);
    c.bookings += 1;
    if (ACTIVE.includes(b.status)) c.totalSpent += Number(b.total_price ?? 0);
    if (!c.lastTrip) c.lastTrip = b.package_title ?? null;
    if (ACTIVE.includes(b.status)) c.status = "customer";
    else if (c.status !== "customer") c.status = "cancelled";
  });

  flights.forEach((f) => {
    const c = ensure(
      customerKey(f.phone, f.email, f.id),
      f.name,
      f.phone,
      f.email,
      f.created_at,
      "TND",
    );
    c.flightRows.push(f);
    c.requests += 1;
  });

  messages.forEach((m) => {
    const c = ensure(
      customerKey(m.phone, m.email, m.id),
      m.name,
      m.phone ?? null,
      m.email,
      m.created_at,
      "TND",
    );
    c.messageRows.push(m);
    c.requests += 1;
  });

  // A traveller who used the Umrah Builder but never booked is still a real
  // lead, so the request creates the customer when nothing else has.
  customRequests.forEach((r) => {
    const c = ensure(
      customerKey(r.phone, r.email, r.id),
      r.customer_name,
      r.phone,
      r.email,
      r.created_at,
      "TND",
    );
    c.customRows.push(r);
    c.requests += 1;
    c.umrahRequests += 1;
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
  );
}

export async function loadCustomer(key: string) {
  const all = await loadCustomers();
  const found = all.find((c) => c.key === key);
  if (!found) return null;
  const { data: notes } = await supabaseAdmin
    .from("customer_notes")
    .select("id, note, author_email, created_at")
    .eq("customer_key", key)
    .order("created_at", { ascending: false });
  return { ...found, notes: notes ?? [] };
}

export async function loadRequests() {
  const [flightsRes, bookingsRes, messagesRes, customRes] = await Promise.all([
    supabaseAdmin
      .from("flight_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),
    supabaseAdmin
      .from("bookings")
      .select(
        "id, name, phone, email, package_title, package_category, status, people, adults, children, infants, notes, total_price, currency, created_at",
      )
      .in("status", ["new", "pending", "contacted"])
      .order("created_at", { ascending: false })
      .limit(300),
    supabaseAdmin
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),
    supabaseAdmin
      .from("custom_package_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  type UnifiedRequest = {
    id: string;
    kind: "flight" | "booking" | "contact" | "custom_package";
    reference: string | null;
    name: string;
    phone: string | null;
    email: string | null;
    /** CRM customer this request belongs to — same rule as loadCustomers(). */
    customerKey: string;
    /** Travel date and party size, surfaced so the inbox can prioritise
     *  without re-reading `detail`. Null for kinds that have no trip. */
    departureDate: string | null;
    travellers: number | null;
    lastContactAt: string | null;
    summary: string;
    /*
     * Structured counterpart to `summary`, so the inbox can render the line in
     * the operator's language. `summary` was assembled server-side in English
     * ("Umrah builder · 9 night(s) · 4 traveller(s)") and shown verbatim inside
     * the Arabic admin. It stays as the search haystack and as a fallback.
     */
    summaryParams:
      | { kind: "flight"; from: string; to: string; tripType: string; cabin: string }
      | { kind: "booking"; title: string | null; travellers: number }
      | { kind: "custom_package"; nights: number; travellers: number }
      | null;
    detail: Record<string, string | number | boolean | null>;
    status: string;
    assigned_to: string | null;
    last_contact_at: string | null;
    created_at: string;
  };

  const rows: UnifiedRequest[] = [];

  (flightsRes.data ?? []).forEach((f) => {
    rows.push({
      id: f.id,
      kind: "flight",
      reference: f.reference,
      name: f.name,
      phone: f.phone,
      email: f.email,
      customerKey: customerKey(f.phone, f.email, f.id),
      /*
       * A flight request has a departure date and a party size like any other
       * request, but the inbox was handed nulls for both, so a flight leaving
       * in three days sorted below a message from last week and never showed
       * an urgency badge. The columns were always there; only this mapping was
       * missing.
       */
      departureDate: f.departure_date ?? null,
      travellers: (f.adults ?? 0) + (f.children ?? 0) + (f.infants ?? 0),
      lastContactAt: f.last_contact_at ?? null,
      summary: `${f.from_airport} → ${f.to_airport} · ${f.trip_type} · ${f.cabin_class}`,
      summaryParams: {
        kind: "flight",
        from: f.from_airport,
        to: f.to_airport,
        tripType: f.trip_type,
        cabin: f.cabin_class,
      },
      detail: f as unknown as Record<string, string | number | boolean | null>,
      status: f.status,
      assigned_to: f.assigned_to ?? null,
      last_contact_at: f.last_contact_at ?? null,
      created_at: f.created_at,
    });
  });

  (bookingsRes.data ?? []).forEach((b) => {
    rows.push({
      id: b.id,
      kind: "booking",
      reference: null,
      name: b.name,
      phone: b.phone,
      email: b.email,
      customerKey: customerKey(b.phone, b.email, b.id),
      departureDate: null,
      travellers: null,
      lastContactAt: null,
      summary: `${b.package_title ?? "General enquiry"} · ${b.people ?? 1} traveller(s)`,
      summaryParams: { kind: "booking", title: b.package_title ?? null, travellers: b.people ?? 1 },
      detail: b as unknown as Record<string, string | number | boolean | null>,
      status: b.status,
      assigned_to: null,
      last_contact_at: null,
      created_at: b.created_at,
    });
  });

  (messagesRes.data ?? []).forEach((m) => {
    rows.push({
      id: m.id,
      kind: "contact",
      reference: null,
      name: m.name,
      phone: m.phone,
      email: m.email,
      customerKey: customerKey(m.phone, m.email, m.id),
      departureDate: null,
      travellers: null,
      lastContactAt: null,
      summary: m.subject ?? m.message.slice(0, 80),
      // A message summary is the customer's own words — nothing to localize.
      summaryParams: null,
      detail: m as unknown as Record<string, string | number | boolean | null>,
      status: m.status ?? (m.handled ? "resolved" : "new"),
      assigned_to: null,
      last_contact_at: m.last_contact_at ?? null,
      created_at: m.created_at,
    });
  });

  (customRes.data ?? []).forEach((r) => {
    const nights = (r.makkah_nights ?? 0) + (r.madinah_nights ?? 0);
    const travellers = (r.adults ?? 0) + (r.children ?? 0) + (r.infants ?? 0);
    rows.push({
      id: r.id,
      kind: "custom_package",
      reference: r.reference,
      name: r.customer_name,
      phone: r.phone,
      email: r.email,
      // Stored on the row since Phase 7.1; recomputed when a historical row
      // predates the backfill so the inbox never shows an unlinked request.
      customerKey: (r.customer_key as string | null) || customerKey(r.phone, r.email, r.id),
      departureDate: r.departure_date,
      travellers,
      lastContactAt: r.last_contact_at ?? null,
      summary: `Umrah builder · ${nights} night(s) · ${travellers} traveller(s)`,
      summaryParams: { kind: "custom_package", nights, travellers },
      detail: r as unknown as Record<string, string | number | boolean | null>,
      status: r.status,
      assigned_to: r.assigned_to ?? null,
      last_contact_at: r.last_contact_at ?? null,
      created_at: r.created_at,
    });
  });

  return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
