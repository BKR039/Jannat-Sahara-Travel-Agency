/**
 * Server-only computations for the admin Travel Command Center.
 * Everything here is deterministic and derived from real database rows.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { TERMINAL_STATUSES } from "./request-status";
import { DEPARTURE_SOON_DAYS, byUrgency, daysToDeparture, urgencyOf } from "./request-urgency";
import { actorLabel } from "./activity";

export type Severity = "info" | "opportunity" | "attention" | "critical";

export interface ActionCenterItem {
  id: string;
  kind: "custom_package" | "flight" | "booking" | "message" | "payment" | "deadline";
  severity: Severity;
  title: string;
  subtitle: string;
  clientName: string | null;
  reference?: string | null;
  status: string;
  date: string;
  href: string;
  actionLabel: string;
}

export interface PipelineStage {
  key: "new" | "in_progress" | "awaiting_offer_payment" | "confirmed" | "completed";
  count: number;
  labelKey: string;
  href: string;
}

export interface ActivityFeedItem {
  id: string;
  action: string;
  actorLabel: string | null;
  entity: string | null;
  entityId: string | null;
  description: string;
  status?: string | null;
  createdAt: string;
  href?: string;
}

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

export type DashboardPeriod = "today" | "last7Days" | "thisMonth" | "lastMonth" | "all";

export interface KpiMetric {
  value: number;
  delta: number | null;
  series?: number[];
  hint?: string;
}

export interface PeriodKpiSummary {
  revenue: KpiMetric;
  confirmedBookings: KpiMetric;
  newLeads: KpiMetric;
  activeTravellers: KpiMetric;
  pendingRequests: KpiMetric;
}

export async function loadCommandCenter() {
  const now = new Date();
  const since = new Date(now.getTime() - DAY * 400).toISOString();

  const [bookingsRes, packagesRes, flightsRes, messagesRes, customRes, auditLogsRes] =
    await Promise.all([
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
      supabaseAdmin
        .from("custom_package_requests")
        .select(
          "id, reference, customer_name, customer_key, status, created_at, last_contact_at, departure_date, return_date, adults, children, infants, offer_sent_at, offer_amount",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("audit_logs")
        .select("id, action, entity, entity_id, actor_id, actor_email, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

  const bookings = bookingsRes.data ?? [];
  const packages = packagesRes.data ?? [];
  const flights = flightsRes.data ?? [];
  const messages = messagesRes.data ?? [];
  const customRequests = customRes.data ?? [];
  const auditLogs = auditLogsRes.data ?? [];

  /* ------------------------------- KPI windows ------------------------------ */
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const start7Days = now.getTime() - 7 * DAY;
  const start14Days = now.getTime() - 14 * DAY;
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const startPrevPrevMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();
  const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();

  const isActionable = (status: string) => !TERMINAL_STATUSES.has(status);
  const customTravellers = (r: {
    adults: number | null;
    children: number | null;
    infants: number | null;
  }) => (r.adults ?? 0) + (r.children ?? 0) + (r.infants ?? 0);

  // Helper for metrics within a time range
  const computePeriodMetrics = (
    start: number,
    end: number,
    prevStart: number | null,
    prevEnd: number | null,
  ): PeriodKpiSummary => {
    const inRange = bookings.filter((b) => {
      const t = new Date(b.created_at).getTime();
      return t >= start && t <= end;
    });
    const inRangeCustom = customRequests.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= start && t <= end && r.status === "confirmed" && r.offer_amount != null;
    });

    const inPrevRange =
      prevStart != null && prevEnd != null
        ? bookings.filter((b) => {
            const t = new Date(b.created_at).getTime();
            return t >= prevStart && t <= prevEnd;
          })
        : [];
    const inPrevRangeCustom =
      prevStart != null && prevEnd != null
        ? customRequests.filter((r) => {
            const t = new Date(r.created_at).getTime();
            return (
              t >= prevStart && t <= prevEnd && r.status === "confirmed" && r.offer_amount != null
            );
          })
        : [];

    const rev =
      inRange
        .filter((b) => ACTIVE_BOOKING.includes(b.status))
        .reduce((sum, b) => sum + Number(b.total_price ?? 0), 0) +
      inRangeCustom.reduce((sum, r) => sum + Number(r.offer_amount ?? 0), 0);
    const revPrev =
      inPrevRange
        .filter((b) => ACTIVE_BOOKING.includes(b.status))
        .reduce((sum, b) => sum + Number(b.total_price ?? 0), 0) +
      inPrevRangeCustom.reduce((sum, r) => sum + Number(r.offer_amount ?? 0), 0);

    const confirmed =
      inRange.filter((b) => b.status === "confirmed" || b.status === "completed").length +
      inRangeCustom.length;
    const confirmedPrev =
      inPrevRange.filter((b) => b.status === "confirmed" || b.status === "completed").length +
      inPrevRangeCustom.length;

    const leads =
      customRequests.filter((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= start && t <= end;
      }).length +
      flights.filter((f) => {
        const t = new Date(f.created_at).getTime();
        return t >= start && t <= end;
      }).length +
      messages.filter((m) => {
        const t = new Date(m.created_at).getTime();
        return t >= start && t <= end;
      }).length +
      inRange.length;

    const leadsPrev =
      prevStart != null && prevEnd != null
        ? customRequests.filter((r) => {
            const t = new Date(r.created_at).getTime();
            return t >= prevStart && t <= prevEnd;
          }).length +
          flights.filter((f) => {
            const t = new Date(f.created_at).getTime();
            return t >= prevStart && t <= prevEnd;
          }).length +
          messages.filter((m) => {
            const t = new Date(m.created_at).getTime();
            return t >= prevStart && t <= prevEnd;
          }).length +
          inPrevRange.length
        : 0;

    const activeTrav = inRange
      .filter((b) => ACTIVE_BOOKING.includes(b.status))
      .reduce((sum, b) => sum + travellers(b), 0);
    const activeTravPrev = inPrevRange
      .filter((b) => ACTIVE_BOOKING.includes(b.status))
      .reduce((sum, b) => sum + travellers(b), 0);

    // Current pending requests backlog (current state)
    const pending =
      customRequests.filter((r) => isActionable(r.status)).length +
      flights.filter(
        (f) => f.status === "new" || f.status === "contacted" || f.status === "waiting",
      ).length +
      bookings.filter((b) => b.status === "new" || b.status === "pending").length;

    return {
      revenue: {
        value: rev,
        delta: prevStart != null ? pct(rev, revPrev) : null,
      },
      confirmedBookings: {
        value: confirmed,
        delta: prevStart != null ? pct(confirmed, confirmedPrev) : null,
      },
      newLeads: {
        value: leads,
        delta: prevStart != null ? pct(leads, leadsPrev) : null,
      },
      activeTravellers: {
        value: activeTrav,
        delta: prevStart != null ? pct(activeTrav, activeTravPrev) : null,
      },
      pendingRequests: {
        value: pending,
        delta: null,
      },
    };
  };

  const periodKpis: Record<DashboardPeriod, PeriodKpiSummary> = {
    today: computePeriodMetrics(
      startToday,
      now.getTime(),
      startToday - DAY,
      startToday - DAY + (now.getTime() - startToday),
    ),
    last7Days: computePeriodMetrics(start7Days, now.getTime(), start14Days, start7Days),
    thisMonth: computePeriodMetrics(startThisMonth, now.getTime(), startPrevMonth, startThisMonth),
    lastMonth: computePeriodMetrics(
      startPrevMonth,
      endPrevMonth,
      startPrevPrevMonth,
      startPrevMonth,
    ),
    all: computePeriodMetrics(0, now.getTime(), null, null),
  };

  /* ------------------------------- Legacy KPI window ------------------------------ */
  const inThis = bookings.filter((b) => new Date(b.created_at).getTime() >= startThisMonth);
  const inPrev = bookings.filter((b) => {
    const t = new Date(b.created_at).getTime();
    return t >= startPrevMonth && t < startThisMonth;
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

  /* ------------------- custom Umrah requests (Phase 7.2) ------------------- */
  const customThis = customRequests.filter(
    (r) => new Date(r.created_at).getTime() >= startThisMonth,
  );
  const customPrev = customRequests.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return t >= startPrevMonth && t < startThisMonth;
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
  const monthlyFlights = new Map<string, number>();
  flights.forEach((f) => {
    const key = monthKey(new Date(f.created_at));
    monthlyFlights.set(key, (monthlyFlights.get(key) ?? 0) + 1);
  });
  const customSeries: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    customSeries.push(monthlyCustom.get(monthKey(d)) ?? 0);
  }

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
  const months: Array<{ month: string; revenue: number; bookings: number; requests: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    months.push({
      month: d.toLocaleDateString("en-GB", { month: "short" }),
      revenue: monthlyRevenue.get(key) ?? 0,
      bookings: monthlyBookings.get(key) ?? 0,
      requests: (monthlyCustom.get(key) ?? 0) + (monthlyFlights.get(key) ?? 0),
    });
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
      href: "/admin/requests",
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
    if (t >= startThisMonth) demandThis.set(key, (demandThis.get(key) ?? 0) + 1);
    else if (t >= startPrevMonth) demandPrev.set(key, (demandPrev.get(key) ?? 0) + 1);
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
      href: "/admin/requests",
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

  /* ------------------------------- Action Center ---------------------------- */
  const actionCenter: ActionCenterItem[] = [];

  // A. Unhandled Custom Umrah requests
  customNew.forEach((r) => {
    const isOverdue = Date.now() - new Date(r.created_at).getTime() > DAY;
    const trav = customTravellers(r);
    actionCenter.push({
      id: `custom-new-${r.id}`,
      kind: "custom_package",
      severity: isOverdue ? "critical" : "attention",
      title: "طلب عمرة جديد لم تتم معالجته",
      subtitle: `${trav} مسافرين${r.departure_date ? ` · السفر: ${r.departure_date}` : ""}`,
      clientName: r.customer_name,
      reference: r.reference,
      status: r.status,
      date: r.created_at,
      href: `/admin/requests?request=${r.id}`,
      actionLabel: "معالجة الطلب",
    });
  });

  // B. Custom requests in review / preparing without offer sent
  customAwaitingOffer.forEach((r) => {
    const trav = customTravellers(r);
    actionCenter.push({
      id: `custom-offer-${r.id}`,
      kind: "custom_package",
      severity: "opportunity",
      title: "طلب عمرة بانتظار إعداد العرض",
      subtitle: `${trav} مسافرين · تم التواصل مسبقاً`,
      clientName: r.customer_name,
      reference: r.reference,
      status: r.status,
      date: r.created_at,
      href: `/admin/requests?request=${r.id}`,
      actionLabel: "إعداد العرض",
    });
  });

  // C. Custom requests departing soon (< 30 days) and not confirmed/closed
  customDepartingSoon.forEach((r) => {
    const days = daysToDeparture(r.departure_date);
    actionCenter.push({
      id: `custom-soon-${r.id}`,
      kind: "deadline",
      severity: (days ?? 0) <= 14 ? "critical" : "attention",
      title: "موعد سفر قريب والطلب غير مؤكد",
      subtitle: `${days} يوم متبقي للسفر · ${customTravellers(r)} مسافرين`,
      clientName: r.customer_name,
      reference: r.reference,
      status: r.status,
      date: r.created_at,
      href: `/admin/requests?request=${r.id}`,
      actionLabel: "متابعة الحجز",
    });
  });

  // D. Unhandled flight requests
  flights
    .filter((f) => f.status === "new")
    .forEach((f) => {
      const isOverdue = Date.now() - new Date(f.created_at).getTime() > DAY;
      actionCenter.push({
        id: `flight-new-${f.id}`,
        kind: "flight",
        severity: isOverdue ? "critical" : "attention",
        title: "طلب طيران جديد لم يتم التواصل",
        subtitle: f.to_airport ? `وجهة: ${f.to_airport}` : "طلب تذكرة طيران",
        clientName: f.name,
        reference: f.reference,
        status: f.status,
        date: f.created_at,
        href: `/admin/requests?request=${f.id}`,
        actionLabel: "فتح الطلب",
      });
    });

  // E. Bookings with pending payment or new
  bookings
    .filter((b) => b.status === "new")
    .slice(0, 3)
    .forEach((b) => {
      actionCenter.push({
        id: `booking-new-${b.id}`,
        kind: "booking",
        severity: "attention",
        title: "حجز جديد في الانتظار",
        subtitle: b.package_title ?? "حجز رحلة",
        clientName: b.name,
        status: b.status,
        date: b.created_at,
        href: `/admin/requests?request=${b.id}`,
        actionLabel: "عرض الحجز",
      });
    });

  bookings
    .filter(
      (b) =>
        ACTIVE_BOOKING.includes(b.status) &&
        b.status !== "new" &&
        (b.payment_status === "unpaid" || b.payment_status === "partially_paid"),
    )
    .slice(0, 4)
    .forEach((b) => {
      const remaining = Math.max(Number(b.total_price ?? 0) - Number(b.paid_amount ?? 0), 0);
      actionCenter.push({
        id: `booking-payment-${b.id}`,
        kind: "payment",
        severity: "attention",
        title: "دفعة معلقة لحجز نشط",
        subtitle: `${b.package_title ?? "رحلة"} · المتبقي: ${remaining.toLocaleString("en-US")} ${b.currency ?? currency}`,
        clientName: b.name,
        status: b.payment_status,
        date: b.created_at,
        href: `/admin/requests?request=${b.id}`,
        actionLabel: "تسجيل الدفعة",
      });
    });

  // F. Unread messages
  messages
    .filter((m) => m.status === "unread" && !m.handled)
    .slice(0, 3)
    .forEach((m) => {
      actionCenter.push({
        id: `msg-${m.id}`,
        kind: "message",
        severity: "info",
        title: "رسالة تواصل غير مقروءة",
        subtitle: m.subject || m.email,
        clientName: m.name,
        status: m.status,
        date: m.created_at,
        href: "/admin/messages",
        actionLabel: "عرض الرسالة",
      });
    });

  // Sort action items by severity and then date
  const severityOrder: Record<Severity, number> = {
    critical: 0,
    attention: 1,
    opportunity: 2,
    info: 3,
  };
  actionCenter.sort((a, b) => {
    const diff = severityOrder[a.severity] - severityOrder[b.severity];
    if (diff !== 0) return diff;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  /* ------------------------------- Pipeline --------------------------------- */
  const pipeline: PipelineStage[] = [
    {
      key: "new",
      count:
        customNew.length +
        flights.filter((f) => f.status === "new").length +
        bookings.filter((b) => b.status === "new").length +
        messages.filter((m) => m.status === "unread" && !m.handled).length,
      labelKey: "shell.dashboard.pipeline.new",
      href: "/admin/requests",
    },
    {
      key: "in_progress",
      count:
        customRequests.filter((r) => r.status === "reviewing" || r.status === "contacted").length +
        flights.filter((f) => f.status === "contacted" || f.status === "waiting").length +
        bookings.filter((b) => b.status === "pending" || b.status === "contacted").length,
      labelKey: "shell.dashboard.pipeline.inProgress",
      href: "/admin/requests",
    },
    {
      key: "awaiting_offer_payment",
      count:
        customRequests.filter((r) => r.status === "offer_preparing").length +
        flights.filter((f) => f.status === "quoted").length +
        bookings.filter(
          (b) =>
            ACTIVE_BOOKING.includes(b.status) &&
            (b.payment_status === "unpaid" || b.payment_status === "partially_paid"),
        ).length,
      labelKey: "shell.dashboard.pipeline.awaitingOfferPayment",
      href: "/admin/requests",
    },
    {
      key: "confirmed",
      count:
        customRequests.filter((r) => r.status === "confirmed").length +
        flights.filter((f) => f.status === "confirmed").length +
        bookings.filter((b) => b.status === "confirmed").length,
      labelKey: "shell.dashboard.pipeline.confirmed",
      href: "/admin/requests",
    },
    {
      key: "completed",
      count:
        bookings.filter((b) => b.status === "completed").length +
        messages.filter((m) => m.handled || m.status === "resolved").length,
      labelKey: "shell.dashboard.pipeline.completed",
      href: "/admin/requests",
    },
  ];

  /* ------------------------------ Recent Activity ---------------------------- */
  const activityItems: ActivityFeedItem[] = auditLogs.map((row) => {
    const actor = actorLabel(row);
    let description = row.action;
    let status: string | null = null;
    let href = "/admin";

    const meta = row.metadata as Record<string, unknown> | null;
    if (row.action === "request_status_changed" && meta) {
      const from = String(meta.from ?? "");
      const to = String(meta.to ?? "");
      status = to;
      description = `تغيير الحالة: ${from} \u2190 ${to}`;
    } else if (row.action === "request.delete") {
      description = `حذف طلب ${meta?.kind ?? ""}`;
    } else if (row.action === "insert") {
      description = `إضافة سجل جديد في ${row.entity}`;
    } else if (row.action === "update") {
      description = `تحديث بيانات ${row.entity}`;
    }

    if (
      row.entity === "custom_package_requests" ||
      row.entity === "flight_requests" ||
      row.entity === "bookings"
    ) {
      href = `/admin/requests?request=${row.entity_id}`;
    } else if (row.entity === "packages") {
      href = "/admin/packages";
    }

    return {
      id: row.id,
      action: row.action,
      actorLabel: actor.label,
      entity: row.entity,
      entityId: row.entity_id,
      description,
      status,
      createdAt: row.created_at,
      href,
    };
  });

  // Synthesize recent request submissions
  customRequests.slice(0, 5).forEach((r) => {
    activityItems.push({
      id: `custom-created-${r.id}`,
      action: "request_created",
      actorLabel: r.customer_name,
      entity: "custom_package_requests",
      entityId: r.id,
      description: `طلب عمرة جديد (${r.reference})`,
      status: r.status,
      createdAt: r.created_at,
      href: `/admin/requests?request=${r.id}`,
    });
  });

  const recentActivity = activityItems
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return {
    kpis,
    periodKpis,
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
    actionCenter: actionCenter.slice(0, 8),
    pipeline,
    recentActivity,
  };
}

export async function loadReports() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY).toISOString();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    bookingsRes,
    packagesRes,
    flightsRes,
    messagesRes,
    customRes,
    installmentsRes,
    branchesRes,
    profilesRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select(
        "id, name, phone, email, package_id, package_title, package_category, status, payment_status, paid_amount, total_price, currency, adults, children, infants, people, created_at, branch_id, notes",
      ),
    supabaseAdmin
      .from("packages")
      .select(
        "id, title, destination, category, total_seats, seats, departure_date, return_date, status",
      ),
    supabaseAdmin.from("flight_requests").select("id, status, created_at"),
    supabaseAdmin.from("contact_messages").select("id, status, handled, created_at"),
    supabaseAdmin
      .from("custom_package_requests")
      .select(
        "id, reference, status, branch_id, offer_amount, created_at, customer_key, adults, children, infants, phone, email",
      ),
    supabaseAdmin.from("installments").select("*").order("due_date", { ascending: true }),
    supabaseAdmin.from("branches").select("id, name, city, is_main_branch, is_active"),
    supabaseAdmin
      .from("customer_profiles")
      .select("customer_key, full_name, city, status, branch_id, created_at"),
  ]);

  const bookings = bookingsRes.data ?? [];
  const packages = packagesRes.data ?? [];
  const flights = flightsRes.data ?? [];
  const messages = messagesRes.data ?? [];
  const customRequests = customRes.data ?? [];
  const installments = installmentsRes.data ?? [];
  const branches = branchesRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const currency = bookings[0]?.currency ?? "TND";

  // Deduplicate between bookings and custom_package_requests if a custom request converted into a booking
  const bookedCustomRequestRefs = new Set<string>();
  bookings.forEach((b) => {
    if (b.notes) {
      customRequests.forEach((r) => {
        if (r.reference && b.notes?.includes(r.reference)) {
          bookedCustomRequestRefs.add(r.reference);
        }
      });
    }
  });

  const activeBookings = bookings.filter((b) => b.status !== "cancelled");
  const confirmedCustomRequests = customRequests.filter(
    (r) =>
      r.status === "confirmed" &&
      r.offer_amount != null &&
      !bookedCustomRequestRefs.has(r.reference),
  );

  // Track bookings with at least one paid installment to avoid double counting legacy paid_amount
  const bookingsWithPaidInstallments = new Set<string>();
  installments.forEach((inst) => {
    if (inst.booking_id && inst.status === "paid") {
      bookingsWithPaidInstallments.add(inst.booking_id);
    }
  });

  // Authoritative Cash Collected (from installments table with status === 'paid')
  const paidFromInstallments = installments
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount ?? 0), 0);

  // Legacy bookings without installment records
  const legacyPaidFromBookings = activeBookings
    .filter((b) => !bookingsWithPaidInstallments.has(b.id))
    .reduce((sum, b) => sum + Number(b.paid_amount ?? 0), 0);

  const bookingsRevenue = activeBookings.reduce((sum, b) => sum + Number(b.total_price ?? 0), 0);
  const customRevenue = confirmedCustomRequests.reduce(
    (sum, r) => sum + Number(r.offer_amount ?? 0),
    0,
  );
  const totalRevenue = bookingsRevenue + customRevenue;
  const totalPaid = paidFromInstallments + legacyPaidFromBookings;
  const totalOutstanding = Math.max(0, totalRevenue - totalPaid);
  const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

  // Unify customer keys for total customer count
  const customerKeys = new Set<string>();
  const newCustomersThisMonthKeys = new Set<string>();

  profiles.forEach((p) => {
    customerKeys.add(p.customer_key);
    if (p.created_at && p.created_at >= startOfThisMonth) {
      newCustomersThisMonthKeys.add(p.customer_key);
    }
  });

  bookings.forEach((b) => {
    const key = (b.phone ?? b.email ?? b.id).toLowerCase();
    customerKeys.add(key);
    if (b.created_at >= startOfThisMonth) {
      newCustomersThisMonthKeys.add(key);
    }
  });

  const totalCustomers = customerKeys.size;
  const newCustomersCount = newCustomersThisMonthKeys.size;

  const pendingRequests =
    flights.filter((f) => f.status === "new" || f.status === "pending").length +
    messages.filter((m) => m.status === "new" || !m.handled).length +
    customRequests.filter((r) => r.status === "new" || r.status === "submitted").length;

  const activeTripsCount =
    bookings.filter((b) => ["confirmed", "contacted", "pending", "new"].includes(b.status)).length +
    confirmedCustomRequests.length;
  const totalBookings = activeBookings.length + confirmedCustomRequests.length;

  // 2. Date-based Period KPIs & Monthly Revenue/Collections Trend
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  ).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY).toISOString();
  const endOfThisMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ).toISOString();
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfPrevMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999,
  ).toISOString();
  const startOfThisYear = new Date(now.getFullYear(), 0, 1).toISOString();

  const periodDefinitions = [
    { key: "all", label: "كامل الفترة (All Time)", start: "1970-01-01", end: "2099-12-31" },
    { key: "today", label: "اليوم (Today)", start: startOfToday, end: endOfToday },
    { key: "week", label: "هذا الأسبوع (This Week)", start: sevenDaysAgo, end: endOfToday },
    { key: "month", label: "هذا الشهر (This Month)", start: startOfThisMonth, end: endOfThisMonth },
    {
      key: "prev_month",
      label: "الشهر السابق (Previous Month)",
      start: startOfPrevMonth,
      end: endOfPrevMonth,
    },
    { key: "year", label: "هذا العام (This Year)", start: startOfThisYear, end: endOfToday },
  ] as const;

  const periodKpis: Record<
    string,
    {
      key: string;
      label: string;
      revenue: number;
      paid: number;
      outstanding: number;
      collectionRate: number;
      bookingsCount: number;
      paymentsCount: number;
      payments: {
        totalInstallmentsCount: number;
        paidInstallmentsCount: number;
        pendingInstallmentsCount: number;
        overdueInstallmentsCount: number;
        totalCollectedInstallments: number;
        totalPendingInstallments: number;
        totalOverdueInstallments: number;
        unscheduledOutstanding: number;
      };
      insights: Array<{
        id: string;
        severity: Severity;
        title: string;
        body: string;
        actionLabel?: string;
        href?: string;
      }>;
    }
  > = {};

  periodDefinitions.forEach((p) => {
    const inPeriodBookings = activeBookings.filter(
      (b) => b.created_at >= p.start && b.created_at <= p.end,
    );
    const inPeriodCustom = confirmedCustomRequests.filter(
      (r) => r.created_at >= p.start && r.created_at <= p.end,
    );

    const rev =
      inPeriodBookings.reduce((sum, b) => sum + Number(b.total_price ?? 0), 0) +
      inPeriodCustom.reduce((sum, r) => sum + Number(r.offer_amount ?? 0), 0);

    const inPeriodPaidInstallments = installments.filter((inst) => {
      if (inst.status !== "paid") return false;
      const effectiveDate = inst.paid_at || inst.created_at;
      return effectiveDate >= p.start && effectiveDate <= p.end;
    });

    const paidFromInst = inPeriodPaidInstallments.reduce(
      (sum, i) => sum + Number(i.amount ?? 0),
      0,
    );

    // Legacy bookings without installment records whose creation falls in period
    const legacyPaid = inPeriodBookings
      .filter((b) => !bookingsWithPaidInstallments.has(b.id))
      .reduce((sum, b) => sum + Number(b.paid_amount ?? 0), 0);

    const periodPaid = paidFromInst + legacyPaid;
    // Current outstanding balance across active contracts (Stock metric):
    // A period filter must never mathematically hide an old unpaid balance!
    const out = totalOutstanding;
    const rate = rev > 0 ? (periodPaid / rev) * 100 : 0;

    // Period-filtered pending & overdue installments (strictly active unpaid states only)
    const inPeriodPendingInstallments = installments.filter((i) => {
      if (i.status !== "pending" && i.status !== "overdue") return false;
      if (p.key === "all") return true;
      if (!i.due_date) return false;
      return i.due_date >= p.start && i.due_date <= p.end;
    });

    const inPeriodOverdueInstallments = installments.filter((i) => {
      if (i.status !== "pending" && i.status !== "overdue") return false;
      if (!i.due_date || new Date(i.due_date) >= now) return false;
      if (p.key === "all") return true;
      return i.due_date >= p.start && i.due_date <= p.end;
    });

    const pendingAmountInPeriod = inPeriodPendingInstallments.reduce(
      (sum, i) => sum + Number(i.amount ?? 0),
      0,
    );
    const overdueAmountInPeriod = inPeriodOverdueInstallments.reduce(
      (sum, i) => sum + Number(i.amount ?? 0),
      0,
    );

    // Build period-specific smart insights (explicitly distinguishing period flow from operational state)
    const pInsights: Array<{
      id: string;
      severity: Severity;
      title: string;
      body: string;
      actionLabel?: string;
      href?: string;
    }> = [];

    // 1. Current operational state: overdue alert
    if (inPeriodOverdueInstallments.length > 0) {
      pInsights.push({
        id: `overdue_${p.key}`,
        severity: "critical",
        title: `${inPeriodOverdueInstallments.length} أقساط متأخرة عن موعد استحقاقها (${p.label})`,
        body: `إجمالي المبالغ المتأخرة ${overdueAmountInPeriod.toLocaleString("fr-FR")} د.ت وتتطلب المتابعة مع العملاء.`,
        actionLabel: "عرض الأقساط المتأخرة",
        href: "/admin/customers?filter=overdue",
      });
    }

    // 2. Current operational state: unscheduled balance across active contracts
    if (totalOutstanding > 0 && pendingAmountInPeriod === 0) {
      pInsights.push({
        id: `unscheduled_${p.key}`,
        severity: "attention",
        title: `رصيد مستحق حالياً غير مجدول بقيمة ${totalOutstanding.toLocaleString("fr-FR")} د.ت`,
        body: `يوجد رصيد مستحق حالياً على حجوزات مؤكدة لم يُنشأ له جدول أقساط بعد. يمكنك جدولة مواعيد استحقاق واضحة للعملاء.`,
        actionLabel: "متابعة الحسابات",
        href: "/admin/customers?filter=unpaid",
      });
    }

    // 3. Period activity: cash collected flow
    if (periodPaid > 0) {
      pInsights.push({
        id: `collected_${p.key}`,
        severity: "opportunity",
        title: `تحصيل نقدي بقيمة ${periodPaid.toLocaleString("fr-FR")} د.ت (${p.label})`,
        body:
          rev > 0
            ? `تم تسجيل دفعات محصلة فعلياً خلال هذه الفترة بنسبة تحصيل بلغت ${Math.round(rate)}% من تعاقدات الفترة.`
            : `تم تسجيل دفعات نقدية محصلة فعلياً خلال ${p.label} على حسابات سابقة.`,
        actionLabel: "سجل المدفوعات",
        href: "/admin/customers",
      });
    }

    // 4. Period activity: new contracts flow
    if (inPeriodBookings.length + inPeriodCustom.length > 0) {
      pInsights.push({
        id: `sales_${p.key}`,
        severity: "info",
        title: `${inPeriodBookings.length + inPeriodCustom.length} تعاقدات مؤكدة بقيمة ${rev.toLocaleString("fr-FR")} د.ت (${p.label})`,
        body: `إجمالي قيمة المبيعات والتعاقدات المؤكدة المسجلة خلال ${p.label}.`,
        actionLabel: "عرض الحجوزات",
        href: "/admin/customers",
      });
    }

    periodKpis[p.key] = {
      key: p.key,
      label: p.label,
      revenue: rev,
      paid: periodPaid,
      outstanding: totalOutstanding,
      collectionRate: rate,
      bookingsCount: inPeriodBookings.length + inPeriodCustom.length,
      paymentsCount: inPeriodPaidInstallments.length,
      payments: {
        totalInstallmentsCount:
          inPeriodPaidInstallments.length + inPeriodPendingInstallments.length,
        paidInstallmentsCount: inPeriodPaidInstallments.length,
        pendingInstallmentsCount: inPeriodPendingInstallments.length,
        overdueInstallmentsCount: inPeriodOverdueInstallments.length,
        totalCollectedInstallments: paidFromInst,
        totalPendingInstallments: pendingAmountInPeriod,
        totalOverdueInstallments: overdueAmountInPeriod,
        unscheduledOutstanding: Math.max(0, totalOutstanding - pendingAmountInPeriod),
      },
      insights: pInsights,
    };
  });

  // 3. Monthly Revenue & Booking Trend (last 12 months)
  // Contracted sales placed in booking month; actual cash collected placed in payment month (paid_at)
  const monthlyMap = new Map<
    string,
    { revenue: number; paid: number; outstanding: number; bookings: number; travellers: number }
  >();

  // A. Contracted Bookings (Sales)
  bookings.forEach((b) => {
    const key = monthKey(new Date(b.created_at));
    const cur = monthlyMap.get(key) ?? {
      revenue: 0,
      paid: 0,
      outstanding: 0,
      bookings: 0,
      travellers: 0,
    };
    cur.bookings += 1;
    if (b.status !== "cancelled") {
      const price = Number(b.total_price ?? 0);
      cur.revenue += price;
      cur.travellers += travellers(b);

      // Only count legacy booking paid amount here if no installment records exist for it
      if (!bookingsWithPaidInstallments.has(b.id)) {
        cur.paid += Number(b.paid_amount ?? 0);
      }
    }
    monthlyMap.set(key, cur);
  });

  // A.2 Confirmed Custom Requests (Sales)
  confirmedCustomRequests.forEach((r) => {
    const key = monthKey(new Date(r.created_at));
    const cur = monthlyMap.get(key) ?? {
      revenue: 0,
      paid: 0,
      outstanding: 0,
      bookings: 0,
      travellers: 0,
    };
    cur.bookings += 1;
    const price = Number(r.offer_amount ?? 0);
    cur.revenue += price;
    const rTravellers = (r.adults ?? 0) + (r.children ?? 0) + (r.infants ?? 0);
    cur.travellers += rTravellers > 0 ? rTravellers : 1;
    monthlyMap.set(key, cur);
  });

  // B. Real Received Payments by Actual Payment Date (paid_at)
  installments.forEach((inst) => {
    if (inst.status === "paid") {
      const paymentDate = inst.paid_at ? new Date(inst.paid_at) : new Date(inst.created_at);
      const key = monthKey(paymentDate);
      const cur = monthlyMap.get(key) ?? {
        revenue: 0,
        paid: 0,
        outstanding: 0,
        bookings: 0,
        travellers: 0,
      };
      cur.paid += Number(inst.amount ?? 0);
      monthlyMap.set(key, cur);
    }
  });

  // C. Calculate monthly outstanding = Math.max(0, revenue - paid)
  for (const cur of monthlyMap.values()) {
    cur.outstanding = Math.max(0, cur.revenue - cur.paid);
  }

  const trend: Array<{
    month: string;
    revenue: number;
    paid: number;
    outstanding: number;
    bookings: number;
    travellers: number;
  }> = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const v = monthlyMap.get(key) ?? {
      revenue: 0,
      paid: 0,
      outstanding: 0,
      bookings: 0,
      travellers: 0,
    };
    trend.push({
      month: d.toLocaleDateString("ar-TN", { month: "short", year: "2-digit" }),
      ...v,
    });
  }

  // 3. Installments Analytics
  // Exact schema state machine: ('pending', 'paid', 'overdue', 'cancelled')
  // Terminal state 'cancelled' must NOT contribute to paid, pending, or overdue balances.
  const activeInstallments = installments.filter((i) => i.status !== "cancelled");
  const paidInstallments = installments.filter((i) => i.status === "paid");
  const overdueInstallments = installments.filter(
    (i) =>
      i.status === "overdue" ||
      (i.status === "pending" && i.due_date && new Date(i.due_date) < now),
  );
  // Unpaid scheduled installments that are not overdue
  const pendingInstallments = installments.filter(
    (i) => i.status === "pending" && (!i.due_date || new Date(i.due_date) >= now),
  );
  // All active unpaid scheduled installments (pending + overdue)
  const allUnpaidScheduledInstallments = installments.filter(
    (i) => i.status === "pending" || i.status === "overdue",
  );

  const totalInstallmentsCount = activeInstallments.length;
  const totalCollectedInstallments = paidInstallments.reduce(
    (sum, i) => sum + Number(i.amount ?? 0),
    0,
  );
  const totalPendingInstallments = allUnpaidScheduledInstallments.reduce(
    (sum, i) => sum + Number(i.amount ?? 0),
    0,
  );
  const totalOverdueInstallments = overdueInstallments.reduce(
    (sum, i) => sum + Number(i.amount ?? 0),
    0,
  );
  const totalUnscheduledOutstanding = Math.max(0, totalOutstanding - totalPendingInstallments);

  // 4. Packages Performance
  const byPackage = new Map<
    string,
    {
      id: string;
      title: string;
      category: string;
      bookings: number;
      travellers: number;
      revenue: number;
      paid: number;
      outstanding: number;
      capacity: number;
      seatsBooked: number;
    }
  >();

  activeBookings.forEach((b) => {
    const pkgId = b.package_id || "general";
    const pkg = packages.find((p) => p.id === pkgId);
    const title = b.package_title || pkg?.title || "حجز رحلة عامة";
    const category = b.package_category || pkg?.category || "أخرى";

    const cur = byPackage.get(pkgId) ?? {
      id: pkgId,
      title,
      category,
      bookings: 0,
      travellers: 0,
      revenue: 0,
      paid: 0,
      outstanding: 0,
      capacity: pkg?.total_seats ?? 0,
      seatsBooked: 0,
    };

    const price = Number(b.total_price ?? 0);
    const paid = Number(b.paid_amount ?? 0);
    cur.bookings += 1;
    cur.travellers += travellers(b);
    cur.revenue += price;
    cur.paid += paid;
    cur.outstanding += Math.max(0, price - paid);
    cur.seatsBooked += travellers(b);
    byPackage.set(pkgId, cur);
  });

  confirmedCustomRequests.forEach((r) => {
    const pkgId = "custom_umrah";
    const title = "عمرة مخصصة حسب الطلب";
    const category = "umrah";

    const cur = byPackage.get(pkgId) ?? {
      id: pkgId,
      title,
      category,
      bookings: 0,
      travellers: 0,
      revenue: 0,
      paid: 0,
      outstanding: 0,
      capacity: 0,
      seatsBooked: 0,
    };

    const price = Number(r.offer_amount ?? 0);
    const rTravellers = (r.adults ?? 0) + (r.children ?? 0) + (r.infants ?? 0);
    const trav = rTravellers > 0 ? rTravellers : 1;

    cur.bookings += 1;
    cur.travellers += trav;
    cur.revenue += price;
    cur.seatsBooked += trav;
    byPackage.set(pkgId, cur);
  });

  const packagesPerformance = Array.from(byPackage.values()).sort((a, b) => b.revenue - a.revenue);

  // 5. Customers Analytics & Retention
  const bookingCountPerCustomer = new Map<string, number>();
  bookings.forEach((b) => {
    const key = (b.phone ?? b.email ?? b.id).toLowerCase();
    bookingCountPerCustomer.set(key, (bookingCountPerCustomer.get(key) ?? 0) + 1);
  });

  let returningCustomersCount = 0;
  bookingCountPerCustomer.forEach((count) => {
    if (count > 1) returningCustomersCount += 1;
  });

  let customersWithUnpaidBalance = 0;
  customerKeys.forEach((key) => {
    const custBookings = activeBookings.filter(
      (b) => (b.phone ?? b.email ?? b.id).toLowerCase() === key,
    );
    const custCustom = confirmedCustomRequests.filter(
      (r) =>
        ((r.customer_key as string | null) || (r.phone ?? r.email ?? r.id)).toLowerCase() === key,
    );
    const custSpent =
      custBookings.reduce((sum, b) => sum + Number(b.total_price ?? 0), 0) +
      custCustom.reduce((sum, r) => sum + Number(r.offer_amount ?? 0), 0);

    const custPaidInst = installments
      .filter((i) => i.customer_key === key && i.status === "paid")
      .reduce((sum, i) => sum + Number(i.amount ?? 0), 0);

    const custLegacyPaid = custBookings
      .filter((b) => !bookingsWithPaidInstallments.has(b.id))
      .reduce((sum, b) => sum + Number(b.paid_amount ?? 0), 0);

    const custPaid = custPaidInst + custLegacyPaid;
    if (custSpent > custPaid) {
      customersWithUnpaidBalance += 1;
    }
  });

  const cityCounts = new Map<string, number>();
  profiles.forEach((p) => {
    if (p.city?.trim()) {
      const city = p.city.trim();
      cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
    }
  });
  const customersByCity = Array.from(cityCounts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // 6. Branch Performance
  const branchPerf = branches.map((br) => {
    const brBookings = activeBookings.filter((b) => b.branch_id === br.id);
    const brCustom = confirmedCustomRequests.filter((r) => r.branch_id === br.id);
    const brRequests = customRequests.filter((r) => r.branch_id === br.id);
    const brProfiles = profiles.filter((p) => p.branch_id === br.id);

    const rev =
      brBookings.reduce((sum, b) => sum + Number(b.total_price ?? 0), 0) +
      brCustom.reduce((sum, r) => sum + Number(r.offer_amount ?? 0), 0);
    const paid = brBookings.reduce((sum, b) => sum + Number(b.paid_amount ?? 0), 0);

    return {
      id: br.id,
      name: br.name,
      city: br.city,
      isMain: br.is_main_branch,
      isActive: br.is_active,
      bookingsCount: brBookings.length + brCustom.length,
      requestsCount: brRequests.length,
      customersCount: brProfiles.length,
      revenue: rev,
      paid,
      outstanding: Math.max(0, rev - paid),
    };
  });

  const unassignedBookings =
    activeBookings.filter((b) => !b.branch_id).length +
    confirmedCustomRequests.filter((r) => !r.branch_id).length;
  const unassignedRevenue =
    activeBookings
      .filter((b) => !b.branch_id)
      .reduce((sum, b) => sum + Number(b.total_price ?? 0), 0) +
    confirmedCustomRequests
      .filter((r) => !r.branch_id)
      .reduce((sum, r) => sum + Number(r.offer_amount ?? 0), 0);

  // 7. Deterministic Actionable Smart Insights
  const insights: Array<{
    id: string;
    severity: Severity;
    title: string;
    body: string;
    actionLabel?: string;
    href?: string;
  }> = [];

  if (overdueInstallments.length > 0) {
    insights.push({
      id: "overdue_installments",
      severity: "critical",
      title: `${overdueInstallments.length} أقساط متأخرة عن موعد سدادها`,
      body: `إجمالي المبالغ المتأخرة ${totalOverdueInstallments.toLocaleString("fr-FR")} د.ت وتتطلب المتابعة مع العملاء.`,
      actionLabel: "عرض الأقساط المتأخرة",
      href: "/admin/customers?filter=overdue",
    });
  }

  if (pendingRequests > 0) {
    insights.push({
      id: "pending_requests",
      severity: "attention",
      title: `${pendingRequests} طلبات جديدة لم تتم معالجتها بعد`,
      body: "يوجد طلبات عمرة مخصصة أو طيران أو رسائل تحتاج للتواصل والمتابعة السريعة.",
      actionLabel: "عرض الطلبات",
      href: "/admin/requests",
    });
  }

  if (packagesPerformance.length > 0) {
    const top = packagesPerformance[0];
    insights.push({
      id: "top_trip",
      severity: "opportunity",
      title: `الباقة الأكثر طلباً: ${top.title}`,
      body: `حققت ${top.bookings} حجوزات بإجمالي إيرادات ${top.revenue.toLocaleString("fr-FR")} د.ت.`,
      actionLabel: "تفاصيل الباقات",
      href: "/admin/packages",
    });
  }

  if (customersByCity.length > 0) {
    const topCity = customersByCity[0];
    insights.push({
      id: "top_city",
      severity: "info",
      title: `أكبر تواجد للعملاء في مدينة ${topCity.city}`,
      body: `تم تسجيل ${topCity.count} عميلاً رسمياً من ${topCity.city} كأعلى تركيز جغرافي.`,
    });
  }

  if (unassignedBookings > 0) {
    insights.push({
      id: "unassigned_bookings",
      severity: "info",
      title: `${unassignedBookings} حجوزات واردة عبر الموقع غير مسندة لفرع`,
      body: `إجمالي قيمة هذه الحجوزات ${unassignedRevenue.toLocaleString("fr-FR")} د.ت ويمكن إسنادها للفروع لتوزيع المتابعة.`,
      actionLabel: "عرض الحجوزات",
      href: "/admin/customers",
    });
  }

  if (totalUnscheduledOutstanding > 0) {
    insights.push({
      id: "unscheduled_balance",
      severity: "attention",
      title: `رصيد متبقي غير مجدول بقيمة ${totalUnscheduledOutstanding.toLocaleString("fr-FR")} د.ت`,
      body: `يوجد مبالغ متبقية على حجوزات مؤكدة لم يُدرج لها جدول أقساط بعد. يمكنك جدولة خطة سداد للعميل لتسهيل التحصيل.`,
      actionLabel: "متابعة الحسابات",
      href: "/admin/customers?filter=unpaid",
    });
  }

  if (totalPaid > 0 && collectionRate >= 50) {
    insights.push({
      id: "collection_performance",
      severity: "opportunity",
      title: `معدل تحصيل إيجابي بنسبة ${Math.round(collectionRate)}%`,
      body: `تم تحصيل ${totalPaid.toLocaleString("fr-FR")} د.ت فعلياً من إجمالي قيمة التعاقدات (${totalRevenue.toLocaleString("fr-FR")} د.ت).`,
      actionLabel: "سجل المدفوعات",
      href: "/admin/customers",
    });
  }

  return {
    currency,
    kpis: {
      totalCustomers,
      newCustomersCount,
      totalBookings,
      activeTripsCount,
      totalRevenue,
      totalPaid,
      totalOutstanding,
      collectionRate,
      pendingRequests,
    },
    periodKpis,
    trend,
    payments: {
      totalInstallmentsCount,
      paidInstallmentsCount: paidInstallments.length,
      pendingInstallmentsCount: pendingInstallments.length,
      overdueInstallmentsCount: overdueInstallments.length,
      totalCollectedInstallments,
      totalPendingInstallments,
      totalOverdueInstallments,
      unscheduledOutstanding: totalUnscheduledOutstanding,
    },
    packagesPerformance,
    customersAnalytics: {
      totalCustomers,
      returningCustomersCount,
      customersWithActiveTrips: activeTripsCount,
      customersWithUnpaidBalance,
      customersByCity,
    },
    branchPerformance: {
      branches: branchPerf,
      unassignedBookings,
      unassignedRevenue,
    },
    insights,
  };
}
