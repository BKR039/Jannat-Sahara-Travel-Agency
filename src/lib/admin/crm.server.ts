/**
 * Server-only customer (CRM) aggregation & operational methods.
 *
 * Customers are unified around the deterministic `customer_key` (phone/email hash)
 * and enriched with persistent CRM profiles (`customer_profiles`), installment schedules
 * (`installments`), branch assignments (`branches`), and all operational interactions.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { customerKey } from "./customer-identity";

export type CustomerLifecycleStatus = "lead" | "customer" | "vip" | "inactive" | "cancelled";

export interface CustomerSummary {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  bookings: number;
  requests: number;
  umrahRequests: number;
  lastTrip: string | null;
  lastActivity: string;
  totalSpent: number;
  totalPaid: number;
  totalRemaining: number;
  currency: string;
  status: CustomerLifecycleStatus;
  hasActiveTrip: boolean;
  hasUnpaidBalance: boolean;
  installmentsCount: number;
  overdueCount: number;
  branchId: string | null;
  branchName: string | null;
  profileNotes?: string | null;
}

export interface CustomerInstallment {
  id: string;
  customer_key: string;
  booking_id: string | null;
  request_id: string | null;
  installment_number: number;
  title: string;
  amount: number;
  currency: string;
  due_date: string | null;
  paid_at: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  payment_method: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerTimelineEvent {
  id: string;
  type:
    | "customer_created"
    | "booking_created"
    | "request_submitted"
    | "flight_request"
    | "message_received"
    | "payment_made"
    | "installment_paid"
    | "installment_due"
    | "status_changed"
    | "note_added"
    | "offer_sent";
  date: string;
  title: string;
  description: string;
  badge?: string;
  amount?: number;
  currency?: string;
  notes?: string | null;
  relatedId?: string;
  authorEmail?: string | null;
}

const ACTIVE_BOOKING = ["new", "pending", "contacted", "confirmed", "completed"];

export async function loadCustomers(options?: { includeArchived?: boolean }) {
    const [
      bookingsRes,
      flightsRes,
      messagesRes,
      customRes,
      profilesRes,
      installmentsRes,
      branchesRes,
      leadsRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select(
          "id, name, phone, email, package_id, package_title, status, payment_status, paid_amount, total_price, currency, adults, children, infants, people, created_at, branch_id, notes, archived_at",
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("flight_requests")
        .select(
          "id, reference, name, phone, email, status, from_airport, to_airport, trip_type, created_at, last_contact_at, archived_at",
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("contact_messages")
        .select("id, name, email, phone, subject, message, status, handled, created_at, archived_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("custom_package_requests")
        .select(
          "id, reference, customer_key, customer_name, phone, email, status, departure_date, return_date, makkah_nights, madinah_nights, adults, children, infants, created_at, last_contact_at, branch_id, offer_amount, offer_sent_at, archived_at",
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("customer_profiles").select("*"),
      supabaseAdmin.from("installments").select("*").order("installment_number", { ascending: true }),
      supabaseAdmin.from("branches").select("id, name, city"),
      (async () => {
        try {
          return await (supabaseAdmin as any).from("leads").select("*").order("created_at", { ascending: false });
        } catch {
          return { data: [] };
        }
      })(),
    ]);

    const bookings = bookingsRes.data ?? [];
    const flights = flightsRes.data ?? [];
    const messages = messagesRes.data ?? [];
    const customRequests = customRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const installments = (installmentsRes.data ?? []) as CustomerInstallment[];
    const branches = branchesRes.data ?? [];
    const leads = ((leadsRes as any)?.data ?? []) as any[];

  const branchesMap = new Map(branches.map((b) => [b.id, b.name]));
  const profileMap = new Map(profiles.map((p) => [p.customer_key, p]));
  const archivedProfileKeys = new Set(
    profiles.filter((p) => p.archived_at != null).map((p) => p.customer_key),
  );

  // Group installments by customer_key
  const installmentsByCustomer = new Map<string, CustomerInstallment[]>();
  for (const inst of installments) {
    const list = installmentsByCustomer.get(inst.customer_key) ?? [];
    list.push(inst);
    installmentsByCustomer.set(inst.customer_key, list);
  }

  const map = new Map<
    string,
    CustomerSummary & {
      bookingRows: typeof bookings;
      flightRows: typeof flights;
      messageRows: typeof messages;
      customRows: typeof customRequests;
      notes: string[];
    }
  >();

  function ensure(
    key: string,
    name: string | null,
    phone: string | null,
    email: string | null,
    createdAt: string,
    currency: string,
    fallbackCity?: string | null,
    fallbackBranchId?: string | null,
  ) {
    const existing = map.get(key);
    const profile = profileMap.get(key);

    if (existing) {
      if (profile?.full_name) existing.name = profile.full_name;
      else if (!existing.name || existing.name === "Unknown") existing.name = name || "Unknown";

      existing.phone = existing.phone ?? phone ?? null;
      existing.email = existing.email ?? email ?? null;
      if (profile?.city) existing.city = profile.city;
      else if (!existing.city && fallbackCity) existing.city = fallbackCity;

      if (profile?.branch_id) {
        existing.branchId = profile.branch_id;
        existing.branchName = branchesMap.get(profile.branch_id) ?? null;
      } else if (!existing.branchId && fallbackBranchId) {
        existing.branchId = fallbackBranchId;
        existing.branchName = branchesMap.get(fallbackBranchId) ?? null;
      }

      if (profile?.status) existing.status = profile.status as CustomerLifecycleStatus;
      if (profile?.notes !== undefined) {
        existing.profileNotes = typeof profile?.notes === "string" ? profile.notes : null;
      }

      if (new Date(createdAt) > new Date(existing.lastActivity)) {
        existing.lastActivity = createdAt;
      }
      return existing;
    }

    const assignedBranchId = profile?.branch_id || fallbackBranchId || null;
    const initialStatus: CustomerLifecycleStatus =
      (profile?.status as CustomerLifecycleStatus) || "lead";

    const created = {
      key,
      name: profile?.full_name || name || "عميل بدون اسم",
      phone: profile?.phone || phone || null,
      email: profile?.email || email || null,
      city: profile?.city || fallbackCity || null,
      bookings: 0,
      requests: 0,
      umrahRequests: 0,
      lastTrip: null as string | null,
      lastActivity: createdAt,
      totalSpent: 0,
      totalPaid: 0,
      totalRemaining: 0,
      currency,
      status: initialStatus,
      hasActiveTrip: false,
      hasUnpaidBalance: false,
      installmentsCount: 0,
      overdueCount: 0,
      branchId: assignedBranchId,
      branchName: assignedBranchId ? (branchesMap.get(assignedBranchId) ?? null) : null,
      archived_at: profile?.archived_at ?? null,
      profileNotes: typeof profile?.notes === "string" ? profile.notes : null,
      bookingRows: [] as typeof bookings,
      flightRows: [] as typeof flights,
      messageRows: [] as typeof messages,
      customRows: [] as typeof customRequests,
      notes: [] as string[],
    };

    map.set(key, created);
    return created;
  }

  // 1. Ingest Bookings
  bookings.forEach((b) => {
    const key = customerKey(b.phone, b.email, b.id);
    const c = ensure(
      key,
      b.name,
      b.phone,
      b.email,
      b.created_at,
      b.currency ?? "TND",
      null,
      b.branch_id,
    );
    c.bookingRows.push(b);
    c.bookings += 1;

    const isActive = ACTIVE_BOOKING.includes(b.status);
    if (isActive) {
      c.totalSpent += Number(b.total_price ?? 0);
      c.hasActiveTrip = true;
    }
    if (!c.lastTrip) c.lastTrip = b.package_title ?? null;
    const hasExplicitProfileStatus = profileMap.has(key) && !!profileMap.get(key)?.status;
    if (!hasExplicitProfileStatus && c.status !== "vip" && c.status !== "inactive") {
      c.status = isActive ? "customer" : c.status === "customer" ? "customer" : "lead";
    }
  });

  // 2. Ingest Custom Umrah Requests
  customRequests.forEach((r) => {
    const key = (r.customer_key as string | null) || customerKey(r.phone, r.email, r.id);
    const c = ensure(
      key,
      r.customer_name,
      r.phone,
      r.email,
      r.created_at,
      "TND",
      null,
      r.branch_id,
    );
    c.customRows.push(r);
    c.requests += 1;
    c.umrahRequests += 1;
    if (r.status === "confirmed" && r.offer_amount) {
      // Deduplicate if a booking for this customer already references this custom request
      const alreadyBooked = c.bookingRows.some(
        (b) => r.reference && b.notes && b.notes.includes(r.reference),
      );
      if (!alreadyBooked) {
        c.totalSpent += Number(r.offer_amount);
        c.hasActiveTrip = true;
      }
      const hasExplicitProfileStatus = profileMap.has(key) && !!profileMap.get(key)?.status;
      if (!hasExplicitProfileStatus && c.status !== "vip") c.status = "customer";
    }
  });

  // 3. Ingest Flight Requests
  flights.forEach((f) => {
    const key = customerKey(f.phone, f.email, f.id);
    const c = ensure(key, f.name, f.phone, f.email, f.created_at, "TND");
    c.flightRows.push(f);
    c.requests += 1;
  });

  // 4. Ingest Contact Messages
  messages.forEach((m) => {
    const key = customerKey(m.phone, m.email, m.id);
    const c = ensure(key, m.name, m.phone ?? null, m.email, m.created_at, "TND");
    c.messageRows.push(m);
    c.requests += 1;
  });

  // 4b. Ingest Sales Center Leads
  leads.forEach((l) => {
    const key = l.customer_key || customerKey(l.phone, l.email, l.id);
    const c = ensure(
      key,
      l.full_name,
      l.phone,
      l.email,
      l.created_at,
      "TND",
      l.city || l.governorate,
      l.branch_id,
    );
    c.requests += 1;
    if (!c.lastTrip && l.trip_name) {
      c.lastTrip = l.trip_name;
    }
  });

  // 5. Ingest Profiles that might not have current requests/bookings yet
  profiles.forEach((p) => {
    ensure(p.customer_key, p.full_name, p.phone, p.email, p.created_at, "TND", p.city, p.branch_id);
  });

  // 6. Compute exact payments, installments, and balances
  const now = new Date();
  map.forEach((c) => {
    const custInstallments = installmentsByCustomer.get(c.key) ?? [];
    c.installmentsCount = custInstallments.length;

    let paidFromInstallments = 0;
    let overdueCount = 0;

    custInstallments.forEach((inst) => {
      if (inst.status === "paid") {
        paidFromInstallments += Number(inst.amount ?? 0);
      } else if (
        inst.status === "overdue" ||
        (inst.status === "pending" && inst.due_date && new Date(inst.due_date) < now)
      ) {
        overdueCount += 1;
      }
    });

    c.overdueCount = overdueCount;

    // Paid amount from direct booking field as fallback if no installments defined
    const paidFromBookings = c.bookingRows.reduce((sum, b) => sum + Number(b.paid_amount ?? 0), 0);

    // If installments exist for this customer, use their recorded paid sum; otherwise use booking paid amounts
    c.totalPaid = custInstallments.length > 0 ? paidFromInstallments : paidFromBookings;
    c.totalRemaining = Math.max(0, c.totalSpent - c.totalPaid);
    c.hasUnpaidBalance = c.totalRemaining > 0;
  });

  const list = Array.from(map.values()).sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
  );

  if (options?.includeArchived) {
    return list;
  }

  return list.filter((c) => !archivedProfileKeys.has(c.key));
}

export async function loadCustomer(key: string) {
  const all = await loadCustomers({ includeArchived: true });
  const found = all.find((c) => c.key === key);
  if (!found) return null;

  const bookingIds = found.bookingRows.map((b) => b.id).filter(Boolean);

  const [notesRes, installmentsRes, passengersRes, auditRes] = await Promise.all([
    supabaseAdmin
      .from("customer_notes")
      .select("id, note, author_email, created_at")
      .eq("customer_key", key)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("installments")
      .select("*")
      .eq("customer_key", key)
      .order("installment_number", { ascending: true }),
    bookingIds.length > 0
      ? supabaseAdmin.from("booking_passengers").select("*").in("booking_id", bookingIds)
      : Promise.resolve({ data: [] as never[] }),
    supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const notes = notesRes.data ?? [];
  const installments = (installmentsRes.data ?? []) as CustomerInstallment[];
  const passengers = passengersRes.data ?? [];
  const auditLogs = auditRes.data ?? [];

  // Group passengers by booking
  const passengersByBooking = new Map<string, typeof passengers>();
  passengers.forEach((p) => {
    const list = passengersByBooking.get(p.booking_id) ?? [];
    list.push(p);
    passengersByBooking.set(p.booking_id, list);
  });

  // Enrich bookings with their passengers and installments
  const enrichedBookings = found.bookingRows.map((b) => ({
    ...b,
    passengers: passengersByBooking.get(b.id) ?? [],
    installments: installments.filter((inst) => inst.booking_id === b.id),
  }));

  // Build Comprehensive Chronological Timeline
  const timeline: CustomerTimelineEvent[] = [];

  // 1. Initial creation / first touch
  timeline.push({
    id: `creation-${found.key}`,
    type: "customer_created",
    date: found.bookingRows[found.bookingRows.length - 1]?.created_at || found.lastActivity,
    title: "إنشاء ملف العميل في النظام",
    description: `تم تسجيل العميل أول مرة بالمعرّف ${found.key}`,
    badge: found.status,
  });

  // 2. Bookings
  enrichedBookings.forEach((b) => {
    timeline.push({
      id: `booking-${b.id}`,
      type: "booking_created",
      date: b.created_at,
      title: `حجز رحلة: ${b.package_title || "برنامج سياحي"}`,
      description: `عدد المسافرين: ${b.people || 1} · حالة الحجز: ${b.status} · حالة الدفع: ${b.payment_status}`,
      amount: Number(b.total_price || 0),
      currency: b.currency || "TND",
      relatedId: b.id,
      badge: b.status,
    });
  });

  // 3. Custom Umrah Requests
  found.customRows.forEach((r) => {
    const nights = (r.makkah_nights ?? 0) + (r.madinah_nights ?? 0);
    timeline.push({
      id: `umrah-req-${r.id}`,
      type: "request_submitted",
      date: r.created_at,
      title: `طلب برنامج عمرة مخصصة (${r.reference})`,
      description: `${nights} ليالٍ · ${r.adults || 0} بالغين · حالة الطلب: ${r.status}`,
      relatedId: r.id,
      badge: r.status,
    });

    if (r.offer_sent_at && r.offer_amount) {
      timeline.push({
        id: `offer-${r.id}`,
        type: "offer_sent",
        date: r.offer_sent_at,
        title: `إرسال عرض سعر رسمي لطلب العمرة (${r.reference})`,
        description: `تم تسليم العرض بمبلغ ${r.offer_amount} TND`,
        amount: Number(r.offer_amount),
        currency: "TND",
        relatedId: r.id,
      });
    }
  });

  // 4. Flight Requests
  found.flightRows.forEach((f) => {
    timeline.push({
      id: `flight-req-${f.id}`,
      type: "flight_request",
      date: f.created_at,
      title: `طلب حجز طيران (${f.reference})`,
      description: `من ${f.from_airport} إلى ${f.to_airport} · ${f.trip_type}`,
      relatedId: f.id,
      badge: f.status,
    });
  });

  // 5. Contact Messages
  found.messageRows.forEach((m) => {
    timeline.push({
      id: `msg-${m.id}`,
      type: "message_received",
      date: m.created_at,
      title: `رسالة عبر الموقع العام: ${m.subject || "استفسار"}`,
      description: m.message ? m.message.slice(0, 120) : "استفسار وارد",
      relatedId: m.id,
    });
  });

  // 6. Installment payments
  installments.forEach((inst) => {
    if (inst.status === "paid" && inst.paid_at) {
      timeline.push({
        id: `inst-paid-${inst.id}`,
        type: "payment_made",
        date: inst.paid_at,
        title: `دفعة مستلمة: ${inst.title}`,
        description: `طريقة الدفع: ${inst.payment_method || "نقدي"} ${inst.note ? `· ${inst.note}` : ""}`,
        amount: Number(inst.amount),
        currency: inst.currency,
        badge: "تم الدفع",
      });
    } else if (inst.due_date) {
      const isOverdue = new Date(inst.due_date) < new Date();
      timeline.push({
        id: `inst-due-${inst.id}`,
        type: "installment_due",
        date: inst.due_date,
        title: `${isOverdue ? "قسط متأخر" : "استحقاق قسط"}: ${inst.title}`,
        description: `مبلغ الاستحقاق: ${inst.amount} ${inst.currency}`,
        amount: Number(inst.amount),
        currency: inst.currency,
        badge: isOverdue ? "متأخر" : "قيد الانتظار",
      });
    }
  });

  // 7. Internal Notes
  notes.forEach((n) => {
    timeline.push({
      id: `note-${n.id}`,
      type: "note_added",
      date: n.created_at,
      title: "ملاحظة إدارية داخلية",
      description: n.note,
      authorEmail: n.author_email,
    });
  });

  // 8. Relevant Audit Logs (status changes on customer's records)
  const customerRecordIds = new Set([
    ...found.bookingRows.map((b) => b.id),
    ...found.customRows.map((c) => c.id),
    ...found.flightRows.map((f) => f.id),
  ]);

  auditLogs.forEach((log) => {
    if (log.entity_id && customerRecordIds.has(log.entity_id)) {
      const meta = log.metadata as Record<string, unknown> | null;
      if (log.action === "request_status_changed" && meta) {
        timeline.push({
          id: `audit-${log.id}`,
          type: "status_changed",
          date: log.created_at,
          title: `تحديث الحالة التشغيلية`,
          description: `تم تغيير الحالة من ${meta.from || "—"} إلى ${meta.to || "—"}`,
          authorEmail: log.actor_email,
        });
      }
    }
  });

  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    ...found,
    bookings: found.bookings,
    bookingRows: enrichedBookings,
    installments,
    internalNotes: notes,
    notes,
    timeline,
    profileNotes: found.profileNotes ?? null,
  };
}

/**
 * Toggle an installment paid status, automatically recording paid_at,
 * recalculating the booking's paid_amount and payment_status, and logging the event.
 */
export async function toggleInstallmentPayment({
  installmentId,
  paid,
  paymentMethod,
  note,
  paidAt,
  actorId,
  actorEmail,
}: {
  installmentId: string;
  paid: boolean;
  paymentMethod?: string;
  note?: string;
  paidAt?: string;
  actorId?: string | null;
  actorEmail?: string | null;
}) {
  const { data: inst, error: readErr } = await supabaseAdmin
    .from("installments")
    .select("*")
    .eq("id", installmentId)
    .single();

  if (readErr || !inst) throw new Error("INSTALLMENT_NOT_FOUND");

  const nowIso = new Date().toISOString();
  const nextStatus = paid ? "paid" : "pending";
  const effectivePaidAt = paid ? paidAt || nowIso : null;

  const { error: updateErr } = await supabaseAdmin
    .from("installments")
    .update({
      status: nextStatus,
      paid_at: effectivePaidAt,
      payment_method: paid ? paymentMethod || inst.payment_method || "نقدي" : null,
      note: note !== undefined ? note : inst.note,
      updated_at: nowIso,
    })
    .eq("id", installmentId);

  if (updateErr) throw updateErr;

  // Recalculate booking paid amount if linked to a booking
  if (inst.booking_id) {
    const { data: allBookingInstallments } = await supabaseAdmin
      .from("installments")
      .select("amount, status")
      .eq("booking_id", inst.booking_id);

    const totalPaid = (allBookingInstallments ?? [])
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + Number(i.amount ?? 0), 0);

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("total_price")
      .eq("id", inst.booking_id)
      .single();

    const totalPrice = Number(booking?.total_price ?? 0);
    let paymentStatus = "unpaid";
    if (totalPaid >= totalPrice && totalPrice > 0) {
      paymentStatus = "paid";
    } else if (totalPaid > 0) {
      paymentStatus = "partially_paid";
    }

    await supabaseAdmin
      .from("bookings")
      .update({
        paid_amount: totalPaid,
        payment_status: paymentStatus,
        updated_at: nowIso,
      })
      .eq("id", inst.booking_id);
  }

  // Audit log entry for customer timeline
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId ?? null,
    actor_email: actorEmail ?? null,
    action: paid ? "installment_paid" : "installment_unmarked",
    entity: "installments",
    entity_id: installmentId,
    metadata: {
      customer_key: inst.customer_key,
      booking_id: inst.booking_id,
      amount: inst.amount,
      title: inst.title,
    },
  });

  return { ok: true, status: nextStatus, paid_at: effectivePaidAt };
}

/**
 * Create a new installment for a customer / booking.
 */
export async function addInstallmentRecord({
  customerKey,
  bookingId,
  requestId,
  title,
  amount,
  dueDate,
  note,
  installmentNumber,
}: {
  customerKey: string;
  bookingId?: string | null;
  requestId?: string | null;
  title: string;
  amount: number;
  dueDate?: string | null;
  note?: string | null;
  installmentNumber?: number;
}) {
  const { data: existing } = await supabaseAdmin
    .from("installments")
    .select("installment_number")
    .eq("customer_key", customerKey)
    .order("installment_number", { ascending: false })
    .limit(1);

  const num = installmentNumber ?? (existing?.[0]?.installment_number ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from("installments")
    .insert({
      customer_key: customerKey,
      booking_id: bookingId || null,
      request_id: requestId || null,
      installment_number: num,
      title: title.trim(),
      amount: Number(amount),
      currency: "TND",
      due_date: dueDate || null,
      status: "pending",
      note: note?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Record a direct payment for a customer / booking.
 * Supports both Full Payment and Partial / Installment Payment.
 * Enforces financial integrity: rejects non-positive amounts and overpayments.
 */
export async function recordDirectPayment({
  customerKey,
  bookingId,
  requestId,
  amount,
  paymentDate,
  paymentMethod,
  note,
  title,
  isFullPayment,
}: {
  customerKey: string;
  bookingId?: string | null;
  requestId?: string | null;
  amount: number;
  paymentDate?: string | null;
  paymentMethod?: string | null;
  note?: string | null;
  title?: string | null;
  isFullPayment?: boolean;
}) {
  const numAmount = Number(amount);
  if (Number.isNaN(numAmount) || numAmount <= 0) {
    throw new Error("يجب أن يكون مبلغ الدفعة أكبر من صفر.");
  }

  let booking: {
    id: string;
    total_price: number | null;
    paid_amount: number | null;
    currency: string | null;
  } | null = null;
  if (bookingId) {
    const { data: b, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id, total_price, paid_amount, currency")
      .eq("id", bookingId)
      .single();
    if (bErr || !b) throw new Error("BOOKING_NOT_FOUND");
    booking = b;

    // Calculate actual current paid from existing installments
    const { data: allInst } = await supabaseAdmin
      .from("installments")
      .select("amount, status")
      .eq("booking_id", bookingId);

    const existingPaidFromInst = (allInst ?? [])
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + Number(i.amount ?? 0), 0);

    const currentPaid =
      allInst && allInst.length > 0 ? existingPaidFromInst : Number(booking.paid_amount ?? 0);
    const totalPrice = Number(booking.total_price ?? 0);
    const remaining = Math.max(0, totalPrice - currentPaid);

    // Enforce financial validation: cannot exceed remaining balance (with small epsilon for float precision)
    if (numAmount > remaining + 0.01) {
      throw new Error("المبلغ يتجاوز المبلغ المتبقي.");
    }
  }

  // Determine next installment number
  const { data: existingInst } = await supabaseAdmin
    .from("installments")
    .select("installment_number")
    .eq("customer_key", customerKey)
    .order("installment_number", { ascending: false })
    .limit(1);

  const nextNum = (existingInst?.[0]?.installment_number ?? 0) + 1;
  const nowIso = new Date().toISOString();
  const effectivePaidAt = paymentDate ? new Date(paymentDate).toISOString() : nowIso;

  const defaultTitle = isFullPayment ? "سداد كامل للحجز" : `دفعة مالية ${nextNum}`;

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("installments")
    .insert({
      customer_key: customerKey,
      booking_id: bookingId || null,
      request_id: requestId || null,
      installment_number: nextNum,
      title: title?.trim() || defaultTitle,
      amount: numAmount,
      currency: booking?.currency || "TND",
      due_date: effectivePaidAt.split("T")[0],
      paid_at: effectivePaidAt,
      status: "paid",
      payment_method: paymentMethod || "cash",
      note: note?.trim() || null,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select()
    .single();

  if (insertErr) throw insertErr;

  // Recalculate booking paid amount and status
  if (bookingId && booking) {
    const { data: allInstAfter } = await supabaseAdmin
      .from("installments")
      .select("amount, status")
      .eq("booking_id", bookingId);

    const totalPaid = (allInstAfter ?? [])
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + Number(i.amount ?? 0), 0);

    const totalPrice = Number(booking.total_price ?? 0);
    const paymentStatus =
      totalPaid >= totalPrice && totalPrice > 0
        ? "paid"
        : totalPaid > 0
          ? "partially_paid"
          : "unpaid";

    await supabaseAdmin
      .from("bookings")
      .update({
        paid_amount: totalPaid,
        payment_status: paymentStatus,
        updated_at: nowIso,
      })
      .eq("id", bookingId);
  }

  return inserted;
}

/**
 * Edit an existing installment or payment record.
 * Recalculates booking balances, payment status, and validates bounds.
 */
export async function updateInstallmentRecord({
  installmentId,
  amount,
  dueDate,
  paidAt,
  paymentMethod,
  note,
  title,
  status,
}: {
  installmentId: string;
  amount?: number;
  dueDate?: string | null;
  paidAt?: string | null;
  paymentMethod?: string | null;
  note?: string | null;
  title?: string | null;
  status?: "pending" | "paid" | "overdue" | "cancelled";
}) {
  const { data: inst, error: readErr } = await supabaseAdmin
    .from("installments")
    .select("*")
    .eq("id", installmentId)
    .single();

  if (readErr || !inst) throw new Error("INSTALLMENT_NOT_FOUND");

  const nowIso = new Date().toISOString();
  const nextAmount = amount !== undefined ? Number(amount) : Number(inst.amount);
  if (Number.isNaN(nextAmount) || nextAmount <= 0) {
    throw new Error("يجب أن يكون مبلغ القسط أو الدفعة أكبر من صفر.");
  }

  const nextStatus = status || inst.status;

  // If linked to booking and status is paid, validate total does not exceed booking price
  if (inst.booking_id && nextStatus === "paid") {
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("total_price")
      .eq("id", inst.booking_id)
      .single();

    if (booking) {
      const { data: otherInst } = await supabaseAdmin
        .from("installments")
        .select("amount, status")
        .eq("booking_id", inst.booking_id)
        .neq("id", installmentId);

      const otherPaid = (otherInst ?? [])
        .filter((i) => i.status === "paid")
        .reduce((sum, i) => sum + Number(i.amount ?? 0), 0);

      const totalPrice = Number(booking.total_price ?? 0);
      if (otherPaid + nextAmount > totalPrice + 0.01) {
        throw new Error("المبلغ يتجاوز المبلغ المتبقي.");
      }
    }
  }

  const patch: {
    updated_at: string;
    amount: number;
    title?: string;
    due_date?: string | null;
    paid_at?: string | null;
    payment_method?: string | null;
    note?: string | null;
    status?: "pending" | "paid" | "overdue" | "cancelled";
  } = {
    updated_at: nowIso,
    amount: nextAmount,
  };

  if (title !== undefined && title !== null) patch.title = title.trim();
  if (dueDate !== undefined) patch.due_date = dueDate || null;
  if (paidAt !== undefined) patch.paid_at = paidAt ? new Date(paidAt).toISOString() : null;
  if (paymentMethod !== undefined) patch.payment_method = paymentMethod || null;
  if (note !== undefined) patch.note = note?.trim() || null;
  if (status !== undefined) patch.status = status;

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("installments")
    .update(patch as never)
    .eq("id", installmentId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Recalculate booking paid amount if linked to booking
  if (inst.booking_id) {
    const { data: allBookingInstallments } = await supabaseAdmin
      .from("installments")
      .select("amount, status")
      .eq("booking_id", inst.booking_id);

    const totalPaid = (allBookingInstallments ?? [])
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + Number(i.amount ?? 0), 0);

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("total_price")
      .eq("id", inst.booking_id)
      .single();

    const totalPrice = Number(booking?.total_price ?? 0);
    const paymentStatus =
      totalPaid >= totalPrice && totalPrice > 0
        ? "paid"
        : totalPaid > 0
          ? "partially_paid"
          : "unpaid";

    await supabaseAdmin
      .from("bookings")
      .update({
        paid_amount: totalPaid,
        payment_status: paymentStatus,
        updated_at: nowIso,
      })
      .eq("id", inst.booking_id);
  }

  return updated;
}

/**
 * Delete an installment and recalculate booking payment status.
 */
export async function deleteInstallmentRecord(installmentId: string) {
  const { data: inst } = await supabaseAdmin
    .from("installments")
    .select("booking_id")
    .eq("id", installmentId)
    .single();

  const { error } = await supabaseAdmin.from("installments").delete().eq("id", installmentId);
  if (error) throw error;

  if (inst?.booking_id) {
    const { data: allBookingInstallments } = await supabaseAdmin
      .from("installments")
      .select("amount, status")
      .eq("booking_id", inst.booking_id);

    const totalPaid = (allBookingInstallments ?? [])
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + Number(i.amount ?? 0), 0);

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("total_price")
      .eq("id", inst.booking_id)
      .single();

    const totalPrice = Number(booking?.total_price ?? 0);
    const paymentStatus =
      totalPaid >= totalPrice && totalPrice > 0
        ? "paid"
        : totalPaid > 0
          ? "partially_paid"
          : "unpaid";

    await supabaseAdmin
      .from("bookings")
      .update({
        paid_amount: totalPaid,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inst.booking_id);
  }

  return { ok: true };
}

/**
 * Upsert persistent customer CRM profile (city, status, branch, internal notes).
 */
export async function saveCustomerProfile({
  customerKey,
  fullName,
  phone,
  email,
  city,
  status,
  branchId,
  notes,
}: {
  customerKey: string;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  status?: CustomerLifecycleStatus;
  branchId?: string | null;
  notes?: string | null;
}) {
  const payload: Record<string, unknown> = {
    customer_key: customerKey,
    updated_at: new Date().toISOString(),
  };

  if (fullName !== undefined) payload.full_name = fullName?.trim() || null;
  if (phone !== undefined) payload.phone = phone?.trim() || null;
  if (email !== undefined) payload.email = email?.trim() || null;
  if (city !== undefined) payload.city = city?.trim() || null;
  if (status !== undefined) payload.status = status;
  if (branchId !== undefined) payload.branch_id = branchId || null;
  if (notes !== undefined) {
    if (typeof notes === "string") {
      payload.notes = notes.trim() || null;
    } else if (notes === null) {
      payload.notes = null;
    } else {
      payload.notes = null;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("customer_profiles")
    .upsert(payload as never, { onConflict: "customer_key" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Permanently delete an internal customer note.
 */
export async function deleteCustomerNoteRecord(noteId: string) {
  const { error } = await supabaseAdmin.from("customer_notes").delete().eq("id", noteId);
  if (error) throw error;
  return { ok: true };
}

export async function loadRequests() {
  const [flightsRes, bookingsRes, messagesRes, customRes] = await Promise.all([
    supabaseAdmin
      .from("flight_requests")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(300),
    supabaseAdmin
      .from("bookings")
      .select(
        "id, name, phone, email, package_title, package_category, status, payment_status, paid_amount, people, adults, children, infants, notes, total_price, currency, passport_path, created_at, branch_id",
      )
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(300),
    supabaseAdmin
      .from("contact_messages")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(300),
    supabaseAdmin
      .from("custom_package_requests")
      .select("*")
      .is("archived_at", null)
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
    customerKey: string;
    departureDate: string | null;
    travellers: number | null;
    lastContactAt: string | null;
    summary: string;
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
    const travellers = (b.people ?? (b.adults ?? 0) + (b.children ?? 0) + (b.infants ?? 0)) || 1;
    rows.push({
      id: b.id,
      kind: "booking",
      reference: null,
      name: b.name,
      phone: b.phone,
      email: b.email,
      customerKey: customerKey(b.phone, b.email, b.id),
      departureDate: null,
      travellers,
      lastContactAt: null,
      summary: `${b.package_title ?? "General enquiry"} · ${travellers} traveller(s)`,
      summaryParams: { kind: "booking", title: b.package_title ?? null, travellers },
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
