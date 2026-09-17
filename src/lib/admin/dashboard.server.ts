/**
 * Server-only computations for the admin Travel Command Center.
 * Everything here is deterministic and derived from real database rows.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { TERMINAL_STATUSES } from "./request-status";
import { DEPARTURE_SOON_DAYS, byUrgency, daysToDeparture, urgencyOf } from "./request-urgency";

export type Severity = "info" | "opportunity" | "attention" | "critical";

export interface Insight {
  id: string;
  severity: Severity;
  title: string;
  body: string;
  href?: string;
  actionLabel?: string;
  /**
   * Localized insights (Phase 7.2) carry i18n keys plus their numeric
   * parameters instead of a server-rendered sentence, so the same insight
   * reads correctly in Arabic, French and English. `title`/`body` stay
   * populated as an English fallback for any client that ignores the keys.
   */
  titleKey?: string;
  bodyKey?: string;
  actionLabelKey?: string;
  params?: Record<string, string | number>;
}

// Authorization lives in ./authorize.server — this module only loads data.

const DAY = 86_400_000;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function travellers(b: {
  adults?: number | null;
  children?: number | null;
  infants?: number | null;
  people?: number | null;
}) {
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

  const [bookingsRes, packagesRes, flightsRes, messagesRes, customRes] = await Promise.all([
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
    // Only the columns the dashboard actually reads — never the whole row.
    supabaseAdmin
      .from("custom_package_requests")
      .select(
        "id, reference, customer_name, customer_key, status, created_at, last_contact_at, departure_date, return_date, adults, children, infants, offer_sent_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
  ]);

  const bookings = bookingsRes.data ?? [];
  const packages = packagesRes.data ?? [];
  const flights = flightsRes.data ?? [];
  const messages = messagesRes.data ?? [];
  const customRequests = customRes.data ?? [];

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

  /* ------------------- custom Umrah requests (Phase 7.2) ------------------- */
  /**
   * Statuses come from ./request-status, which mirrors the database CHECK
   * constraint. Nothing here invents a status: "actionable" simply means the
   * request has not reached one of the terminal statuses.
   */
  const isActionable = (status: string) => !TERMINAL_STATUSES.has(status);
  const customTravellers = (r: {
    adults: number | null;
    children: number | null;
    infants: number | null;
  }) => (r.adults ?? 0) + (r.children ?? 0) + (r.infants ?? 0);

  const customThis = customRequests.filter((r) => new Date(r.created_at).getTime() >= startThis);
  const customPrev = customRequests.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return t >= startPrev && t < startThis;
  });
  const customActionable = customRequests.filter((r) => isActionable(r.status));
  const customNew = customRequests.filter((r) => r.status === "new");
  const customClosed = customRequests.filter((r) => TERMINAL_STATUSES.has(r.status));

  // Same 12-month convention the revenue and bookings series already use.
  const monthlyCustom = new Map<string, number>();
  customRequests.forEach((r) => {
    const key = monthKey(new Date(r.created_at));
    monthlyCustom.set(key, (monthlyCustom.get(key) ?? 0) + 1);
  });
  const customSeries: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    customSeries.push(monthlyCustom.get(monthKey(d)) ?? 0);
  }

  /** Waiting for a first reply: still new and older than a day. */
  const customAwaitingContact = customNew.filter(
    (r) => !r.last_contact_at && Date.now() - new Date(r.created_at).getTime() > DAY,
  );

  /** The agency has engaged but no offer has actually been sent yet. */
  const customAwaitingOffer = customRequests.filter(
    (r) =>
      isActionable(r.status) &&
      !r.offer_sent_at &&
      (r.status === "reviewing" || r.status === "offer_preparing" || r.status === "contacted"),
  );

  /** Travel is close and the request is still open — same window as the queue. */
  const customDepartingSoon = customActionable.filter((r) => {
    const days = daysToDeparture(r.departure_date);
    return days != null && days > 0 && days <= DEPARTURE_SOON_DAYS;
  });

  const customLargeParty = customActionable.filter((r) => customTravellers(r) >= 10);

  /**
   * The queue lists what needs a decision, most urgent first: travel closest,
   * then longest waiting. Each entry carries the row id so the dashboard links
   * straight to that request, and `customer_key` so it resolves to the same
   * CRM customer Phase 7.1 established.
   */
  // Ordering and urgency come from ./request-urgency, shared with the inbox.
  const asUrgency = (r: (typeof customActionable)[number]) => ({
    status: r.status,
    createdAt: r.created_at,
    departureDate: r.departure_date,
    lastContactAt: r.last_contact_at,
  });

  const customQueue = [...customActionable]
    .sort((a, b) => byUrgency(asUrgency(a), asUrgency(b)))
    .slice(0, 5)
    .map((r) => {
      const days = daysToDeparture(r.departure_date);
      return {
        id: r.id,
        reference: r.reference,
        customerName: r.customer_name,
        customerKey: r.customer_key,
        status: r.status,
        createdAt: r.created_at,
        departureDate: r.departure_date,
        returnDate: r.return_date,
        travellers: customTravellers(r),
        daysToDeparture: days,
        /** Why this row is urgent, or null when it is simply queued. */
        urgency: urgencyOf(asUrgency(r)),
      };
    });

  const currency = bookings[0]?.currency ?? packages[0]?.currency ?? "TND";

  const kpis = {
    currency,
    revenue: {
      value: revenueThis,
      delta: pct(revenueThis, revenuePrev),
      series: months.map((m) => m.revenue),
    },
    bookings: {
      value: inThis.length,
      delta: pct(inThis.length, inPrev.length),
      series: months.map((m) => m.bookings),
    },
    travellers: {
      value: travellersThis,
      delta: pct(travellersThis, travellersPrev),
      series: months.map((m) => m.bookings),
    },
    upcomingTrips: { value: upcoming.length, delta: null as number | null, series: [] as number[] },
    customRequests: {
      value: customThis.length,
      delta: pct(customThis.length, customPrev.length),
      series: customSeries,
      total: customRequests.length,
      actionable: customActionable.length,
      awaitingContact: customAwaitingContact.length,
      closed: customClosed.length,
    },
  };

  /* --------------------------- upcoming departures ------------------------- */
  const upcomingTrips = upcoming.slice(0, 6).map((p) => {
    /*
     * Capacity is `total_seats` and only `total_seats`.
     *
     * This used to fall back to `seats`, but `seats` is the *remaining* count
     * the public cards read for their sold-out badge — not a capacity. Falling
     * back to it meant a programme with 16 seats left and 32 travellers booked
     * reported 32 booked out of a capacity of 16. Where no capacity is
     * configured the answer is "unknown", not a substituted number.
     */
    const capacity = p.total_seats ?? null;
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
    (f) =>
      f.status === "new" &&
      !f.last_contact_at &&
      Date.now() - new Date(f.created_at).getTime() > DAY,
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
      // The trips screen is served at /admin/packages. This insight used to
      // link to a path the router never registered, so it dead-ended (A-03).
      href: "/admin/packages",
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
      href: "/admin/packages",
      actionLabel: "Edit trip",
    });
  }

  // Pending payments
  const awaitingPayment = bookings.filter(
    (b) =>
      ACTIVE_BOOKING.includes(b.status) &&
      (b.payment_status === "unpaid" || b.payment_status === "partially_paid"),
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

  /* ------------- custom Umrah request insights (Phase 7.2) ---------------- */
  /**
   * Every rule below is deterministic and counts real rows. Each one is gated
   * on having enough data to say something true — when the condition is not
   * met the insight is simply not produced, rather than padded with a
   * meaningless "0 requests" card. Text is emitted as i18n keys + numbers so
   * the same insight reads correctly in Arabic, French and English.
   */
  const customInsight = (
    id: string,
    severity: Severity,
    key: string,
    params: Record<string, string | number>,
    english: { title: string; body: string },
  ): Insight => ({
    id,
    severity,
    title: english.title,
    body: english.body,
    titleKey: `shell.dashboard.insights.custom.${key}.title`,
    bodyKey: `shell.dashboard.insights.custom.${key}.body`,
    actionLabelKey: "shell.dashboard.insights.custom.action",
    params,
    href: "/admin/requests",
    actionLabel: "Open requests",
  });

  if (customAwaitingContact.length > 0) {
    insights.push(
      customInsight(
        "custom-awaiting-contact",
        customAwaitingContact.length >= 5 ? "critical" : "attention",
        "awaitingContact",
        { count: customAwaitingContact.length },
        {
          title: `${customAwaitingContact.length} custom Umrah request(s) waiting for a first reply`,
          body: "These requests have been open for more than 24 hours without any contact.",
        },
      ),
    );
  }

  if (customDepartingSoon.length > 0) {
    const soonest = customDepartingSoon.reduce((a, b) =>
      new Date(a.departure_date as string) <= new Date(b.departure_date as string) ? a : b,
    );
    const days = Math.max(
      0,
      Math.floor((new Date(soonest.departure_date as string).getTime() - Date.now()) / DAY),
    );
    insights.push(
      customInsight(
        "custom-departing-soon",
        days <= 14 ? "critical" : "attention",
        "departingSoon",
        { count: customDepartingSoon.length, days, reference: soonest.reference },
        {
          title: `${customDepartingSoon.length} unresolved request(s) travelling within 30 days`,
          body: `The closest is ${soonest.reference}, departing in about ${days} day(s).`,
        },
      ),
    );
  }

  // Two or more is a workload signal; a single one is just normal traffic.
  if (customAwaitingOffer.length >= 2) {
    insights.push(
      customInsight(
        "custom-awaiting-offer",
        "attention",
        "awaitingOffer",
        { count: customAwaitingOffer.length },
        {
          title: `${customAwaitingOffer.length} custom requests have no offer yet`,
          body: "The agency has engaged with these travellers but no offer has been sent.",
        },
      ),
    );
  }

  // Only compare periods when this month has a real sample and a real change.
  const customDelta = pct(customThis.length, customPrev.length);
  if (customThis.length >= 3 && customDelta != null && Math.abs(customDelta) >= 25) {
    insights.push(
      customInsight(
        "custom-volume-trend",
        customDelta > 0 ? "opportunity" : "info",
        customDelta > 0 ? "volumeUp" : "volumeDown",
        {
          count: customThis.length,
          previous: customPrev.length,
          percent: Math.abs(Math.round(customDelta)),
        },
        {
          title: `Custom Umrah requests are ${customDelta > 0 ? "up" : "down"} ${Math.abs(Math.round(customDelta))}% this month`,
          body: `${customThis.length} this month against ${customPrev.length} last month.`,
        },
      ),
    );
  }

  if (customLargeParty.length > 0) {
    const biggest = customLargeParty.reduce((a, b) =>
      customTravellers(a) >= customTravellers(b) ? a : b,
    );
    insights.push(
      customInsight(
        "custom-large-party",
        "opportunity",
        "largeParty",
        {
          count: customLargeParty.length,
          travellers: customTravellers(biggest),
          reference: biggest.reference,
        },
        {
          title: `${customLargeParty.length} large group request(s) open`,
          body: `${biggest.reference} asks for ${customTravellers(biggest)} travellers.`,
        },
      ),
    );
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
      customRequests: customActionable.length,
    },
    customRequestQueue: customQueue,
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

  const byTrip = new Map<
    string,
    { title: string; bookings: number; revenue: number; travellers: number }
  >();
  active.forEach((b) => {
    const key = b.package_id ?? b.package_title ?? "other";
    const title = b.package_title ?? "General enquiry";
    const cur = byTrip.get(key) ?? { title, bookings: 0, revenue: 0, travellers: 0 };
    cur.bookings += 1;
    cur.revenue += Number(b.total_price ?? 0);
    cur.travellers += travellers(b);
    byTrip.set(key, cur);
  });
  const topTrips = Array.from(byTrip.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

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
  const conversion =
    leads > 0
      ? (bookings.filter((b) => b.status === "confirmed" || b.status === "completed").length /
          leads) *
        100
      : 0;

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
    .filter(
      (p) =>
        p.departure_date &&
        new Date(p.departure_date).getTime() >= Date.now() - DAY &&
        p.status !== "archived",
    )
    .slice(0, 8)
    .map((p) => ({
      title: p.title,
      // Same rule as above: `seats` is remaining, never a capacity.
      capacity: p.total_seats ?? 0,
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
