/**
 * Server-only customer (CRM) aggregation.
 * Customers are derived from existing bookings, flight requests and messages —
 * there is no separate customer table, so nothing in the schema is duplicated.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface CustomerSummary {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  bookings: number;
  requests: number;
  lastTrip: string | null;
  lastActivity: string;
  totalSpent: number;
  currency: string;
  status: "customer" | "lead" | "cancelled";
}

function keyOf(phone: string | null | undefined, email: string | null | undefined, fallback: string) {
  const p = (phone ?? "").replace(/[^0-9+]/g, "");
  if (p.length >= 6) return `p:${p.slice(-8)}`;
  const e = (email ?? "").trim().toLowerCase();
  if (e) return `e:${e}`;
  return `x:${fallback}`;
}

const ACTIVE = ["new", "pending", "contacted", "confirmed", "completed"];

export async function loadCustomers() {
  const [bookingsRes, flightsRes, messagesRes] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select(
        "id, name, phone, email, package_id, package_title, status, payment_status, paid_amount, total_price, currency, adults, children, infants, people, created_at",
      )
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("flight_requests")
      .select("id, reference, name, phone, email, status, from_airport, to_airport, created_at, last_contact_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("contact_messages")
      .select("id, name, email, phone, subject, message, status, handled, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const bookings = bookingsRes.data ?? [];
  const flights = flightsRes.data ?? [];
  const messages = messagesRes.data ?? [];

  const map = new Map<
    string,
    CustomerSummary & {
      bookingRows: typeof bookings;
      flightRows: typeof flights;
      messageRows: typeof messages;
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
      lastTrip: null as string | null,
      lastActivity: createdAt,
      totalSpent: 0,
      currency,
      status: "lead" as CustomerSummary["status"],
      bookingRows: [] as typeof bookings,
      flightRows: [] as typeof flights,
      messageRows: [] as typeof messages,
    };
    map.set(key, created);
    return created;
  }

  bookings.forEach((b) => {
    const c = ensure(keyOf(b.phone, b.email, b.id), b.name, b.phone, b.email, b.created_at, b.currency ?? "TND");
    c.bookingRows.push(b);
    c.bookings += 1;
    if (ACTIVE.includes(b.status)) c.totalSpent += Number(b.total_price ?? 0);
    if (!c.lastTrip) c.lastTrip = b.package_title ?? null;
    if (ACTIVE.includes(b.status)) c.status = "customer";
    else if (c.status !== "customer") c.status = "cancelled";
  });

  flights.forEach((f) => {
    const c = ensure(keyOf(f.phone, f.email, f.id), f.name, f.phone, f.email, f.created_at, "TND");
    c.flightRows.push(f);
    c.requests += 1;
  });

  messages.forEach((m) => {
    const c = ensure(keyOf(m.phone, m.email, m.id), m.name, m.phone ?? null, m.email, m.created_at, "TND");
    c.messageRows.push(m);
    c.requests += 1;
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
    summary: string;
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
      summary: `${f.from_airport} → ${f.to_airport} · ${f.trip_type} · ${f.cabin_class}`,
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
      summary: `${b.package_title ?? "General enquiry"} · ${b.people ?? 1} traveller(s)`,
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
      summary: m.subject ?? m.message.slice(0, 80),
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
      summary: `Umrah builder · ${nights} night(s) · ${travellers} traveller(s)`,
      detail: r as unknown as Record<string, string | number | boolean | null>,
      status: r.status,
      assigned_to: r.assigned_to ?? null,
      last_contact_at: r.last_contact_at ?? null,
      created_at: r.created_at,
    });
  });

  return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
