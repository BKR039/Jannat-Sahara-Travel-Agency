/**
 * Server-only computations for the admin Travel Command Center.
 * Everything here is deterministic and derived from real database rows.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Severity = "info" | "opportunity" | "attention" | "critical";

export interface Insight {
  id: string;
  severity: Severity;
  title: string;
  body: string;
  href?: string;
  actionLabel?: string;
}

export async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["super_admin", "admin", "staff"]);
  if (error) throw new Error("Failed to verify permissions");
  if (!data || data.length === 0) throw new Error("Forbidden: admin required");
}

const DAY = 86_400_000;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function travellers(b: { adults?: number | null; children?: number | null; infants?: number | null; people?: number | null }) {
  const sum = (b.adults ?? 0) + (b.children ?? 0) + (b.infants ?? 0);
  return sum > 0 ? sum : (b.people ?? 0);
}

function pct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

const ACTIVE_BOOKING = ["new", "pending", "contacted", "confirmed", "completed"];

export async function loadCommandCenter() {
  const now = new Date();
  const since = new Date(now.getTime() - DAY * 400).toISOString();

  const [bookingsRes, packagesRes, flightsRes, messagesRes] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select(
        "id, name, phone, email, package_id, package_title, package_category, status, payment_status, paid_amount, total_price, currency, adults, children, infants, people, created_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("packages")
      .select(
        "id, title, slug, cover, category, destination, status, price, currency, departure_date, duration, seats, total_seats, created_at",
      )
      .order("departure_date", { ascending: true }),
    supabaseAdmin
      .from("flight_requests")
      .select("id, reference, name, phone, status, created_at, last_contact_at, to_airport")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("contact_messages")
      .select("id, name, email, subject, status, handled, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
  ]);

  const bookings = bookingsRes.data ?? [];
  const packages = packagesRes.data ?? [];
  const flights = flightsRes.data ?? [];
  const messages = messagesRes.data ?? [];

  /* ------------------------------- KPI window ------------------------------ */
  const startThis = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  const inThis = bookings.filter((b) => new Date(b.created_at).getTime() >= startThis);
  const inPrev = bookings.filter((b) => {
    const t = new Date(b.created_at).getTime();
    return t >= startPrev && t < startThis;
  });

  const revenue = (rows: typeof bookings) =>
    rows
      .filter((b) => ACTIVE_BOOKING.includes(b.status))
      .reduce((sum, b) => sum + Number(b.total_price ?? 0), 0);

  const revenueThis = revenue(inThis);
  const revenuePrev = revenue(inPrev);
  const travellersThis = inThis.reduce((s, b) => s + travellers(b), 0);
  const travellersPrev = inPrev.reduce((s, b) => s + travellers(b), 0);

  const upcoming = packages
    .filter((p) => p.departure_date && new Date(p.departure_date).getTime() >= now.getTime() - DAY)
    .filter((p) => p.status !== "archived");

  const bookedByPackage = new Map<string, number>();
  bookings
    .filter((b) => ACTIVE_BOOKING.includes(b.status))
    .forEach((b) => {
      if (!b.package_id) return;
      bookedByPackage.set(b.package_id, (bookedByPackage.get(b.package_id) ?? 0) + travellers(b));
    });

  /* ------------------------------ 12m series ------------------------------ */
  const monthlyRevenue = new Map<string, number>();
  const monthlyBookings = new Map<string, number>();
  bookings.forEach((b) => {
    const key = monthKey(new Date(b.created_at));
    monthlyBookings.set(key, (monthlyBookings.get(key) ?? 0) + 1);
    if (ACTIVE_BOOKING.includes(b.status)) {
      monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + Number(b.total_price ?? 0));
    }
  });
  const months: Array<{ month: string; revenue: number; bookings: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    months.push({
      month: d.toLocaleDateString("en-GB", { month: "short" }),
      revenue: monthlyRevenue.get(key) ?? 0,
      bookings: monthlyBookings.get(key) ?? 0,
    });
  }

  const currency = bookings[0]?.currency ?? packages[0]?.currency ?? "TND";

  const kpis = {
    currency,
    revenue: { value: revenueThis, delta: pct(revenueThis, revenuePrev), series: months.map((m) => m.revenue) },
    bookings: { value: inThis.length, delta: pct(inThis.length, inPrev.length), series: months.map((m) => m.bookings) },
    travellers: { value: travellersThis, delta: pct(travellersThis, travellersPrev), series: months.map((m) => m.bookings) },
    upcomingTrips: { value: upcoming.length, delta: null as number | null, series: [] as number[] },
  };

  /* --------------------------- upcoming departures ------------------------- */
  const upcomingTrips = upcoming.slice(0, 6).map((p) => {
    const capacity = p.total_seats ?? p.seats ?? null;
    const booked = bookedByPackage.get(p.id) ?? 0;
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      cover: p.cover,
      category: p.category as string,
      destination: p.destination,
      departure_date: p.departure_date,
      status: p.status as string,
      capacity,
      booked,
    };
  });

  /* ---------------------------- recent bookings ---------------------------- */
  const recentBookings = bookings.slice(0, 8).map((b) => ({
    id: b.id,
    name: b.name,
    phone: b.phone,
    trip: b.package_title,
    status: b.status,
    payment_status: b.payment_status,
    amount: b.total_price == null ? null : Number(b.total_price),
    currency: b.currency ?? currency,
    created_at: b.created_at,
  }));

  /* -------------------------------- insights ------------------------------ */
  const insights: Insight[] = [];

  // Capacity pressure + projected sell-out
  for (const t of upcomingTrips) {
    if (!t.capacity || t.capacity <= 0) continue;
    const fill = t.booked / t.capacity;
    if (fill < 0.7 || t.booked >= t.capacity) continue;
    const last14 = bookings.filter(
      (b) =>
        b.package_id === t.id &&
        ACTIVE_BOOKING.includes(b.status) &&
        Date.now() - new Date(b.created_at).getTime() <= DAY * 14,
    );
    const pacePerDay = last14.reduce((s, b) => s + travellers(b), 0) / 14;
    const remaining = t.capacity - t.booked;
    const days = pacePerDay > 0 ? Math.max(1, Math.ceil(remaining / pacePerDay)) : null;
    insights.push({
      id: `capacity-${t.id}`,
      severity: fill >= 0.9 ? "critical" : "opportunity",
      title: `${t.title} is ${Math.round(fill * 100)}% full`,
      body: days
        ? `${remaining} seat${remaining === 1 ? "" : "s"} left and registrations are accelerating. At the current pace the trip may reach capacity in about ${days} day${days === 1 ? "" : "s"}.`
        : `Only ${remaining} seat${remaining === 1 ? "" : "s"} left. Consider opening a second departure.`,
      href: "/admin/bookings",
      actionLabel: "Review bookings",
    });
  }

  // Uncontacted requests older than 24h
  const staleFlights = flights.filter(
    (f) => f.status === "new" && !f.last_contact_at && Date.now() - new Date(f.created_at).getTime() > DAY,
  );
  const staleBookings = bookings.filter(
    (b) => b.status === "new" && Date.now() - new Date(b.created_at).getTime() > DAY,
  );
  const staleTotal = staleFlights.length + staleBookings.length;
  if (staleTotal > 0) {
    insights.push({
      id: "stale-requests",
      severity: staleTotal >= 8 ? "critical" : "attention",
      title: `${staleTotal} request${staleTotal === 1 ? "" : "s"} not contacted for more than 24 hours`,
      body: `${staleFlights.length} flight request${staleFlights.length === 1 ? "" : "s"} and ${staleBookings.length} new booking${staleBookings.length === 1 ? "" : "s"} are still waiting for a first reply.`,
      href: "/admin/requests",
      actionLabel: "Open requests",
    });
  }

  // Revenue trend
  const revDelta = pct(revenueThis, revenuePrev);
  if (revDelta != null && Math.abs(revDelta) >= 15 && (revenueThis > 0 || revenuePrev > 0)) {
    insights.push({
      id: "revenue-trend",
      severity: revDelta > 0 ? "opportunity" : "attention",
      title:
        revDelta > 0
          ? `Revenue is up ${Math.round(revDelta)}% versus last month`
          : `Revenue is down ${Math.abs(Math.round(revDelta))}% versus last month`,
      body:
        revDelta > 0
          ? `Bookings created this month represent ${Math.round(revenueThis).toLocaleString("en-US")} ${currency}. Keep the best performing trips visible on the homepage.`
          : `Bookings created this month represent ${Math.round(revenueThis).toLocaleString("en-US")} ${currency}, against ${Math.round(revenuePrev).toLocaleString("en-US")} ${currency} last month.`,
      href: "/admin/reports",
      actionLabel: "See reports",
    });
  }

  // Destination demand shift
  const demandThis = new Map<string, number>();
  const demandPrev = new Map<string, number>();
  bookings.forEach((b) => {
    const pkg = packages.find((p) => p.id === b.package_id);
    const key = pkg?.destination ?? b.package_title ?? null;
    if (!key) return;
    const t = new Date(b.created_at).getTime();
    if (t >= startThis) demandThis.set(key, (demandThis.get(key) ?? 0) + 1);
    else if (t >= startPrev) demandPrev.set(key, (demandPrev.get(key) ?? 0) + 1);
  });
  let bestShift: { key: string; delta: number } | null = null;
  demandThis.forEach((count, key) => {
    const prev = demandPrev.get(key) ?? 0;
    const delta = pct(count, prev);
    if (delta != null && delta >= 25 && count >= 2 && (!bestShift || delta > bestShift.delta)) {
      bestShift = { key, delta };
    }
  });
  if (bestShift) {
    const shift = bestShift as { key: string; delta: number };
    insights.push({
      id: "demand-shift",
      severity: "info",
      title: `${shift.key} demand is growing`,
      body: `${shift.key} generated ${Math.round(shift.delta)}% more requests this month compared with the previous month.`,
      href: "/admin/trips",
      actionLabel: "Open trips",
    });
  }

  // Low occupancy close to departure
  const lowOccupancy = upcomingTrips.find((t) => {
    if (!t.capacity || !t.departure_date) return false;
    const daysToGo = (new Date(t.departure_date).getTime() - Date.now()) / DAY;
    return daysToGo <= 30 && daysToGo > 0 && t.booked / t.capacity < 0.4;
  });
  if (lowOccupancy) {
    insights.push({
      id: `low-occupancy-${lowOccupancy.id}`,
      severity: "attention",
      title: `${lowOccupancy.title} is filling slowly`,
      body: `Only ${lowOccupancy.booked} of ${lowOccupancy.capacity} seats are taken and departure is close. A promotion or a price adjustment could help.`,
      href: "/admin/trips",
      actionLabel: "Edit trip",
    });
  }

  // Pending payments
  const awaitingPayment = bookings.filter(
    (b) => ACTIVE_BOOKING.includes(b.status) && (b.payment_status === "unpaid" || b.payment_status === "partially_paid"),
  );
  if (awaitingPayment.length >= 3) {
    const amount = awaitingPayment.reduce(
      (s, b) => s + Math.max(Number(b.total_price ?? 0) - Number(b.paid_amount ?? 0), 0),
      0,
    );
    insights.push({
      id: "pending-payments",
      severity: "attention",
      title: `${awaitingPayment.length} bookings still awaiting payment`,
      body: `About ${Math.round(amount).toLocaleString("en-US")} ${currency} is outstanding across active bookings.`,
      href: "/admin/bookings",
      actionLabel: "Collect payments",
    });
  }

  // Unread messages
  const unread = messages.filter((m) => m.status === "unread" && !m.handled);
  if (unread.length >= 3) {
    insights.push({
      id: "unread-messages",
      severity: "info",
      title: `${unread.length} unread messages`,
      body: "Website visitors are waiting for an answer in the messages inbox.",
      href: "/admin/messages",
      actionLabel: "Open messages",
    });
  }

  const order: Record<Severity, number> = { critical: 0, attention: 1, opportunity: 2, info: 3 };
  insights.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    kpis,
    months,
    insights: insights.slice(0, 4),
    recentBookings,
    upcomingTrips,
    queue: {
      newBookings: bookings.filter((b) => b.status === "new").length,
      newRequests: flights.filter((f) => f.status === "new").length,
      unreadMessages: unread.length,
    },
  };
}

export async function loadReports() {
  const now = new Date();
  const since = new Date(now.getTime() - DAY * 400).toISOString();

  const [bookingsRes, packagesRes, flightsRes, messagesRes] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select(
        "id, name, phone, email, package_id, package_title, package_category, status, total_price, currency, adults, children, infants, people, created_at",
      )
      .gte("created_at", since),
    supabaseAdmin
      .from("packages")
      .select("id, title, destination, category, total_seats, seats, departure_date, status"),
    supabaseAdmin.from("flight_requests").select("id, status, created_at").gte("created_at", since),
    supabaseAdmin.from("contact_messages").select("id, created_at").gte("created_at", since),
  ]);

  const bookings = bookingsRes.data ?? [];
  const packages = packagesRes.data ?? [];
  const flights = flightsRes.data ?? [];
  const messages = messagesRes.data ?? [];
  const currency = bookings[0]?.currency ?? "TND";

  const active = bookings.filter((b) => ACTIVE_BOOKING.includes(b.status));
  const revenue = active.reduce((s, b) => s + Number(b.total_price ?? 0), 0);
  const travellersTotal = active.reduce((s, b) => s + travellers(b), 0);

  const monthly = new Map<string, { revenue: number; bookings: number; travellers: number }>();
  bookings.forEach((b) => {
    const key = monthKey(new Date(b.created_at));
    const cur = monthly.get(key) ?? { revenue: 0, bookings: 0, travellers: 0 };
    cur.bookings += 1;
    if (ACTIVE_BOOKING.includes(b.status)) {
      cur.revenue += Number(b.total_price ?? 0);
      cur.travellers += travellers(b);
    }
    monthly.set(key, cur);
  });
  const trend: Array<{ month: string; revenue: number; bookings: number; travellers: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = monthly.get(monthKey(d)) ?? { revenue: 0, bookings: 0, travellers: 0 };
    trend.push({ month: d.toLocaleDateString("en-GB", { month: "short" }), ...v });
  }

  const byTrip = new Map<string, { title: string; bookings: number; revenue: number; travellers: number }>();
  active.forEach((b) => {
    const key = b.package_id ?? b.package_title ?? "other";
    const title = b.package_title ?? "General enquiry";
    const cur = byTrip.get(key) ?? { title, bookings: 0, revenue: 0, travellers: 0 };
    cur.bookings += 1;
    cur.revenue += Number(b.total_price ?? 0);
    cur.travellers += travellers(b);
    byTrip.set(key, cur);
  });
  const topTrips = Array.from(byTrip.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  const byDestination = new Map<string, number>();
  active.forEach((b) => {
    const pkg = packages.find((p) => p.id === b.package_id);
    const key = pkg?.destination ?? b.package_category ?? "Other";
    byDestination.set(key, (byDestination.get(key) ?? 0) + 1);
  });
  const topDestinations = Array.from(byDestination.entries())
    .map(([destination, count]) => ({ destination, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const leads = flights.length + messages.length + bookings.length;
  const conversion = leads > 0 ? (bookings.filter((b) => b.status === "confirmed" || b.status === "completed").length / leads) * 100 : 0;

  const customers = new Map<string, string>();
  bookings.forEach((b) => customers.set((b.phone ?? b.email ?? b.id).toLowerCase(), b.created_at));
  const acquisition = new Map<string, number>();
  customers.forEach((created) => {
    const key = monthKey(new Date(created));
    acquisition.set(key, (acquisition.get(key) ?? 0) + 1);
  });
  const acquisitionSeries: Array<{ month: string; customers: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    acquisitionSeries.push({
      month: d.toLocaleDateString("en-GB", { month: "short" }),
      customers: acquisition.get(monthKey(d)) ?? 0,
    });
  }

  const bookedByPackage = new Map<string, number>();
  active.forEach((b) => {
    if (!b.package_id) return;
    bookedByPackage.set(b.package_id, (bookedByPackage.get(b.package_id) ?? 0) + travellers(b));
  });
  const capacity = packages
    .filter((p) => p.departure_date && new Date(p.departure_date).getTime() >= Date.now() - DAY && p.status !== "archived")
    .slice(0, 8)
    .map((p) => ({
      title: p.title,
      capacity: p.total_seats ?? p.seats ?? 0,
      booked: bookedByPackage.get(p.id) ?? 0,
      departure_date: p.departure_date,
    }));

  return {
    currency,
    summary: {
      revenue,
      bookings: bookings.length,
      travellers: travellersTotal,
      averageValue: active.length > 0 ? revenue / active.length : 0,
      conversion,
      customers: customers.size,
    },
    trend,
    topTrips,
    topDestinations,
    acquisition: acquisitionSeries,
    capacity,
  };
}
