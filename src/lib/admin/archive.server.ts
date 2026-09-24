import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ArchiveEntityType = "client" | "request" | "trip";

export type ArchiveSubType =
  | "customer_profile"
  | "booking"
  | "custom_package_request"
  | "flight_request"
  | "contact_message"
  | "package";

export interface ArchivedRecordMetadata {
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  amount?: number | null;
  price?: number | null;
  currency?: string | null;
  status?: string | null;
  category?: string | null;
  travellers?: number | null;
  departureDate?: string | null;
  destination?: string | null;
  dependenciesCount?: number | null;
  packageId?: string | null;
  customerKey?: string | null;
  handled?: boolean | null;
}

export interface ArchivedRecord {
  id: string;
  entityType: ArchiveEntityType;
  subType: ArchiveSubType;
  identifier: string;
  title: string;
  subtitle?: string | null;
  archivedAt: string;
  archivedBy: string | null;
  archivedByName: string | null;
  archiveReason: string | null;
  metadata: ArchivedRecordMetadata;
}

export interface ArchiveSummaryCounts {
  total: number;
  clients: number;
  requests: number;
  trips: number;
}

export interface ArchiveFilterOptions {
  entityType?: ArchiveEntityType | "all";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * Returns exact summary counts of all archived records directly from the database.
 */
export async function getArchiveSummaryCounts(): Promise<ArchiveSummaryCounts> {
  const [
    clientsRes,
    bookingsRes,
    customReqRes,
    flightReqRes,
    contactRes,
    tripsRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("customer_profiles")
      .select("customer_key", { count: "exact", head: true })
      .not("archived_at", "is", null),
    supabaseAdmin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .not("archived_at", "is", null),
    supabaseAdmin
      .from("custom_package_requests")
      .select("id", { count: "exact", head: true })
      .not("archived_at", "is", null),
    supabaseAdmin
      .from("flight_requests")
      .select("id", { count: "exact", head: true })
      .not("archived_at", "is", null),
    supabaseAdmin
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .not("archived_at", "is", null),
    supabaseAdmin
      .from("packages")
      .select("id", { count: "exact", head: true })
      .not("archived_at", "is", null),
  ]);

  const clients = clientsRes.count ?? 0;
  const requests =
    (bookingsRes.count ?? 0) +
    (customReqRes.count ?? 0) +
    (flightReqRes.count ?? 0) +
    (contactRes.count ?? 0);
  const trips = tripsRes.count ?? 0;

  return {
    total: clients + requests + trips,
    clients,
    requests,
    trips,
  };
}

/**
 * Lists archived records across clients, requests, and trips with unified sorting and filtering.
 */
export async function listArchivedRecords(
  filters: ArchiveFilterOptions = {},
): Promise<{ records: ArchivedRecord[]; counts: ArchiveSummaryCounts; totalFiltered: number }> {
  const counts = await getArchiveSummaryCounts();
  const records: ArchivedRecord[] = [];

  const shouldFetchClients = !filters.entityType || filters.entityType === "all" || filters.entityType === "client";
  const shouldFetchRequests = !filters.entityType || filters.entityType === "all" || filters.entityType === "request";
  const shouldFetchTrips = !filters.entityType || filters.entityType === "all" || filters.entityType === "trip";

  const promises: Promise<void>[] = [];

  if (shouldFetchClients) {
    promises.push(
      (async () => {
        let q = supabaseAdmin
          .from("customer_profiles")
          .select("*")
          .not("archived_at", "is", null)
          .order("archived_at", { ascending: false });

        if (filters.dateFrom) q = q.gte("archived_at", filters.dateFrom);
        if (filters.dateTo) q = q.lte("archived_at", filters.dateTo);

        const { data, error } = await q;
        if (error) {
          console.error("[archive.server] error fetching archived customers:", error.message);
          return;
        }

        (data ?? []).forEach((c) => {
          records.push({
            id: c.customer_key,
            entityType: "client",
            subType: "customer_profile",
            identifier: c.customer_key,
            title: c.full_name || "عميل بدون اسم",
            subtitle: c.city ? `المدينة: ${c.city}` : undefined,
            archivedAt: c.archived_at!,
            archivedBy: c.archived_by,
            archivedByName: c.archived_by_name,
            archiveReason: c.archive_reason,
            metadata: {
              phone: c.phone,
              email: c.email,
              city: c.city,
              customerKey: c.customer_key,
            },
          });
        });
      })(),
    );
  }

  if (shouldFetchRequests) {
    // 1. Bookings
    promises.push(
      (async () => {
        let q = supabaseAdmin
          .from("bookings")
          .select("*")
          .not("archived_at", "is", null)
          .order("archived_at", { ascending: false });

        if (filters.dateFrom) q = q.gte("archived_at", filters.dateFrom);
        if (filters.dateTo) q = q.lte("archived_at", filters.dateTo);

        const { data, error } = await q;
        if (error) {
          console.error("[archive.server] error fetching archived bookings:", error.message);
          return;
        }

        (data ?? []).forEach((b) => {
          records.push({
            id: b.id,
            entityType: "request",
            subType: "booking",
            identifier: `حجز #${b.id.slice(0, 8)}`,
            title: b.package_title || `حجز رحلة لـ ${b.name || "عميل"}`,
            subtitle: b.name ? `العميل: ${b.name} (${b.phone || b.email || ""})` : undefined,
            archivedAt: b.archived_at!,
            archivedBy: b.archived_by,
            archivedByName: b.archived_by_name,
            archiveReason: b.archive_reason,
            metadata: {
              phone: b.phone,
              email: b.email,
              amount: b.total_price ? Number(b.total_price) : null,
              currency: b.currency || "TND",
              status: b.status,
              category: b.package_category,
              travellers: b.people || (b.adults ?? 0) + (b.children ?? 0) + (b.infants ?? 0),
              packageId: b.package_id,
            },
          });
        });
      })(),
    );

    // 2. Custom package requests
    promises.push(
      (async () => {
        let q = supabaseAdmin
          .from("custom_package_requests")
          .select("*")
          .not("archived_at", "is", null)
          .order("archived_at", { ascending: false });

        if (filters.dateFrom) q = q.gte("archived_at", filters.dateFrom);
        if (filters.dateTo) q = q.lte("archived_at", filters.dateTo);

        const { data, error } = await q;
        if (error) {
          console.error("[archive.server] error fetching archived custom requests:", error.message);
          return;
        }

        (data ?? []).forEach((r) => {
          records.push({
            id: r.id,
            entityType: "request",
            subType: "custom_package_request",
            identifier: r.reference || `طلب #${r.id.slice(0, 8)}`,
            title: `عمرة مخصصة: ${r.customer_name || "طلب عميل"}`,
            subtitle: `مكة: ${r.makkah_nights || 0} ليالٍ · المدينة: ${r.madinah_nights || 0} ليالٍ`,
            archivedAt: r.archived_at!,
            archivedBy: r.archived_by,
            archivedByName: r.archived_by_name,
            archiveReason: r.archive_reason,
            metadata: {
              phone: r.phone,
              email: r.email,
              status: r.status,
              departureDate: r.departure_date,
              travellers: (r.adults ?? 0) + (r.children ?? 0) + (r.infants ?? 0),
              amount: r.offer_amount ? Number(r.offer_amount) : null,
            },
          });
        });
      })(),
    );

    // 3. Flight requests
    promises.push(
      (async () => {
        let q = supabaseAdmin
          .from("flight_requests")
          .select("*")
          .not("archived_at", "is", null)
          .order("archived_at", { ascending: false });

        if (filters.dateFrom) q = q.gte("archived_at", filters.dateFrom);
        if (filters.dateTo) q = q.lte("archived_at", filters.dateTo);

        const { data, error } = await q;
        if (error) {
          console.error("[archive.server] error fetching archived flight requests:", error.message);
          return;
        }

        (data ?? []).forEach((f) => {
          records.push({
            id: f.id,
            entityType: "request",
            subType: "flight_request",
            identifier: f.reference || `طيران #${f.id.slice(0, 8)}`,
            title: `طلب طيران: ${f.from_airport} → ${f.to_airport}`,
            subtitle: `المسافر: ${f.name} · ${f.trip_type} · ${f.cabin_class}`,
            archivedAt: f.archived_at!,
            archivedBy: f.archived_by,
            archivedByName: f.archived_by_name,
            archiveReason: f.archive_reason,
            metadata: {
              phone: f.phone,
              email: f.email,
              status: f.status,
              departureDate: f.departure_date,
              travellers: (f.adults ?? 0) + (f.children ?? 0) + (f.infants ?? 0),
            },
          });
        });
      })(),
    );

    // 4. Contact messages
    promises.push(
      (async () => {
        let q = supabaseAdmin
          .from("contact_messages")
          .select("*")
          .not("archived_at", "is", null)
          .order("archived_at", { ascending: false });

        if (filters.dateFrom) q = q.gte("archived_at", filters.dateFrom);
        if (filters.dateTo) q = q.lte("archived_at", filters.dateTo);

        const { data, error } = await q;
        if (error) {
          console.error("[archive.server] error fetching archived contact messages:", error.message);
          return;
        }

        (data ?? []).forEach((m) => {
          records.push({
            id: m.id,
            entityType: "request",
            subType: "contact_message",
            identifier: `رسالة #${m.id.slice(0, 8)}`,
            title: m.subject || "رسالة اتصال جديدة",
            subtitle: `المرسل: ${m.name} (${m.email || m.phone || ""})`,
            archivedAt: m.archived_at!,
            archivedBy: m.archived_by,
            archivedByName: m.archived_by_name,
            archiveReason: m.archive_reason,
            metadata: {
              phone: m.phone,
              email: m.email,
              status: m.status,
              handled: m.handled,
            },
          });
        });
      })(),
    );
  }

  if (shouldFetchTrips) {
    promises.push(
      (async () => {
        let q = supabaseAdmin
          .from("packages")
          .select("*")
          .not("archived_at", "is", null)
          .order("archived_at", { ascending: false });

        if (filters.dateFrom) q = q.gte("archived_at", filters.dateFrom);
        if (filters.dateTo) q = q.lte("archived_at", filters.dateTo);

        const { data, error } = await q;
        if (error) {
          console.error("[archive.server] error fetching archived packages:", error.message);
          return;
        }

        (data ?? []).forEach((p) => {
          records.push({
            id: p.id,
            entityType: "trip",
            subType: "package",
            identifier: p.slug || p.id.slice(0, 8),
            title: p.title,
            subtitle: p.destination || p.country ? `${p.destination || ""} - ${p.country || ""}` : undefined,
            archivedAt: p.archived_at!,
            archivedBy: p.archived_by,
            archivedByName: p.archived_by_name,
            archiveReason: p.archive_reason,
            metadata: {
              category: p.category,
              status: p.status,
              price: p.price,
              currency: p.currency,
              destination: p.destination,
              departureDate: p.departure_date,
              packageId: p.id,
            },
          });
        });
      })(),
    );
  }

  await Promise.all(promises);

  // Apply in-memory search across title, identifier, subtitle, reason, phone, email
  let filtered = records;
  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim().toLowerCase();
    filtered = filtered.filter((r) => {
      const matchTitle = r.title.toLowerCase().includes(s);
      const matchId = r.identifier.toLowerCase().includes(s);
      const matchSubtitle = r.subtitle?.toLowerCase().includes(s);
      const matchReason = r.archiveReason?.toLowerCase().includes(s);
      const matchPhone = r.metadata.phone?.toLowerCase().includes(s);
      const matchEmail = r.metadata.email?.toLowerCase().includes(s);
      return matchTitle || matchId || matchSubtitle || matchReason || matchPhone || matchEmail;
    });
  }

  // Sort descending by archivedAt
  filtered.sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime());

  const totalFiltered = filtered.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 100;
  const pagedRecords = filtered.slice(offset, offset + limit);

  return {
    records: pagedRecords,
    counts,
    totalFiltered,
  };
}

/**
 * Checks dependencies before permanent deletion.
 * Blocks deletion if referential integrity or financial history would be compromised.
 */
export async function checkEntityDependencies(params: {
  entityType: ArchiveEntityType;
  subType: ArchiveSubType;
  id: string;
}): Promise<{ canDelete: boolean; reason?: string; dependencies: Record<string, number> }> {
  const { entityType, subType, id } = params;

  if (entityType === "client") {
    // 1. Fetch customer profile to get customer_key, phone, and email
    const { data: profile } = await supabaseAdmin
      .from("customer_profiles")
      .select("customer_key, phone, email")
      .eq("customer_key", id)
      .maybeSingle();

    const customerKey = profile?.customer_key || id;
    const phone = profile?.phone;
    const email = profile?.email;

    // Check bookings
    let bookingsCount = 0;
    if (phone || email) {
      const orClauses: string[] = [];
      if (phone) orClauses.push(`phone.eq.${phone}`);
      if (email) orClauses.push(`email.eq.${email}`);
      const { count } = await supabaseAdmin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .or(orClauses.join(","));
      bookingsCount = count ?? 0;
    }

    // Check installments
    const { count: instCount } = await supabaseAdmin
      .from("installments")
      .select("id", { count: "exact", head: true })
      .eq("customer_key", customerKey);
    const installmentsCount = instCount ?? 0;

    // Check custom requests
    let customCount = 0;
    if (customerKey || phone || email) {
      const orClauses: string[] = [];
      if (customerKey) orClauses.push(`customer_key.eq.${customerKey}`);
      if (phone) orClauses.push(`phone.eq.${phone}`);
      if (email) orClauses.push(`email.eq.${email}`);
      const { count } = await supabaseAdmin
        .from("custom_package_requests")
        .select("id", { count: "exact", head: true })
        .or(orClauses.join(","));
      customCount = count ?? 0;
    }

    const dependencies = {
      bookings: bookingsCount,
      installments: installmentsCount,
      customRequests: customCount,
    };

    if (bookingsCount > 0 || installmentsCount > 0) {
      return {
        canDelete: false,
        reason: `لا يمكن حذف ملف العميل نهائياً لوجود ${bookingsCount > 0 ? `${bookingsCount} حجز/حجوزات مسجلة` : ""} ${installmentsCount > 0 ? `و ${installmentsCount} قسط/أقساط مالية مسجلة` : ""} في النظام. احتفظ به في الأرشيف لحفظ النزاهة المحاسبية والتاريخية.`,
        dependencies,
      };
    }

    return {
      canDelete: true,
      dependencies,
    };
  }

  if (entityType === "request") {
    if (subType === "booking") {
      // Check passengers and installments for this booking
      const [passengersRes, installmentsRes, bookingRes] = await Promise.all([
        supabaseAdmin
          .from("booking_passengers")
          .select("id", { count: "exact", head: true })
          .eq("booking_id", id),
        supabaseAdmin
          .from("installments")
          .select("id", { count: "exact", head: true })
          .eq("booking_id", id),
        supabaseAdmin
          .from("bookings")
          .select("paid_amount, payment_status")
          .eq("id", id)
          .single(),
      ]);

      const passengers = passengersRes.count ?? 0;
      const installments = installmentsRes.count ?? 0;
      const paidAmount = Number(bookingRes.data?.paid_amount ?? 0);

      const dependencies = {
        passengers,
        installments,
        paidAmount,
      };

      if (installments > 0 || paidAmount > 0) {
        return {
          canDelete: false,
          reason: `لا يمكن حذف هذا الحجز نهائياً لوجود دفعات مالية مسجلة (${paidAmount > 0 ? `مبلغ مدفوع: ${paidAmount} د.ت` : ""} ${installments > 0 ? `وعدد الأقساط: ${installments}` : ""}). احتفظ به في الأرشيف للحفاظ على السجلات المالية القانونية.`,
          dependencies,
        };
      }

      return {
        canDelete: true,
        dependencies,
      };
    }

    // Custom requests, flight requests, contact messages
    return {
      canDelete: true,
      dependencies: {},
    };
  }

  if (entityType === "trip") {
    // Check if bookings exist for this package
    const { count: bookingsCount, error } = await supabaseAdmin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("package_id", id);

    if (error) {
      console.error("[archive.server] error checking package dependencies:", error.message);
    }

    const bookings = bookingsCount ?? 0;
    const dependencies = { bookings };

    if (bookings > 0) {
      return {
        canDelete: false,
        reason: `لا يمكن حذف هذه الرحلة نهائياً لوجود ${bookings} حجز مسجل عليها من قبل العملاء. احتفظ بها في الأرشيف كمرجع تاريخي وتشغيلي.`,
        dependencies,
      };
    }

    return {
      canDelete: true,
      dependencies,
    };
  }

  return { canDelete: true, dependencies: {} };
}

/**
 * Archives an entity (Client, Request, or Trip).
 */
export async function archiveEntity(params: {
  entityType: ArchiveEntityType;
  subType?: ArchiveSubType;
  id: string;
  reason?: string;
  actorId: string;
  actorEmail: string | null;
  actorName?: string;
}): Promise<{ ok: boolean; message: string }> {
  const { entityType, subType, id, reason, actorId, actorEmail, actorName } = params;
  const now = new Date().toISOString();

  if (entityType === "client") {
    // Check if customer_profiles row exists by customer_key
    const { data: existing } = await supabaseAdmin
      .from("customer_profiles")
      .select("customer_key, full_name")
      .eq("customer_key", id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("customer_profiles")
        .update({
          archived_at: now,
          archived_by: actorId,
          archived_by_name: actorName ?? actorEmail,
          archive_reason: reason ?? null,
        })
        .eq("customer_key", existing.customer_key);
      if (error) throw error;
    } else {
      // Create new profile row for this key so it is cleanly marked as archived
      const { error } = await supabaseAdmin.from("customer_profiles").insert({
        customer_key: id,
        full_name: "عميل مؤرشف",
        archived_at: now,
        archived_by: actorId,
        archived_by_name: actorName ?? actorEmail,
        archive_reason: reason ?? null,
      });
      if (error) throw error;
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: actorId,
      actor_email: actorEmail,
      action: "archive",
      entity: "customer_profile",
      entity_id: existing?.customer_key || id,
      metadata: { reason, actor_name: actorName, customer_key: existing?.customer_key || id },
    });

    return { ok: true, message: "تم نقل العميل إلى الأرشيف بنجاح" };
  }

  if (entityType === "request") {
    let table: "bookings" | "custom_package_requests" | "flight_requests" | "contact_messages" = "bookings";
    if (subType === "custom_package_request") table = "custom_package_requests";
    else if (subType === "flight_request") table = "flight_requests";
    else if (subType === "contact_message") table = "contact_messages";

    const { error } = await supabaseAdmin
      .from(table)
      .update({
        archived_at: now,
        archived_by: actorId,
        archived_by_name: actorName ?? actorEmail,
        archive_reason: reason ?? null,
      } as any)
      .eq("id", id);

    if (error) throw error;

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: actorId,
      actor_email: actorEmail,
      action: "archive",
      entity: table,
      entity_id: id,
      metadata: { reason, actor_name: actorName, sub_type: subType },
    });

    return { ok: true, message: "تم نقل الطلب إلى الأرشيف بنجاح" };
  }

  if (entityType === "trip") {
    const { error } = await supabaseAdmin
      .from("packages")
      .update({
        archived_at: now,
        archived_by: actorId,
        archived_by_name: actorName ?? actorEmail,
        archive_reason: reason ?? null,
        status: "archived",
      })
      .eq("id", id);

    if (error) throw error;

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: actorId,
      actor_email: actorEmail,
      action: "archive",
      entity: "package",
      entity_id: id,
      metadata: { reason, actor_name: actorName },
    });

    return { ok: true, message: "تم نقل البرنامج السياحي / الرحلة إلى الأرشيف بنجاح" };
  }

  throw new Error("Invalid entity type");
}

/**
 * Restores an archived entity back to active status.
 */
export async function restoreEntity(params: {
  entityType: ArchiveEntityType;
  subType?: ArchiveSubType;
  id: string;
  actorId: string;
  actorEmail: string | null;
  actorName?: string;
}): Promise<{ ok: boolean; message: string }> {
  const { entityType, subType, id, actorId, actorEmail, actorName } = params;

  if (entityType === "client") {
    const { error } = await supabaseAdmin
      .from("customer_profiles")
      .update({
        archived_at: null,
        archived_by: null,
        archived_by_name: null,
        archive_reason: null,
      })
      .eq("customer_key", id);

    if (error) throw error;

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: actorId,
      actor_email: actorEmail,
      action: "restore",
      entity: "customer_profile",
      entity_id: id,
      metadata: { actor_name: actorName },
    });

    return { ok: true, message: "تمت استعادة السجل بنجاح" };
  }

  if (entityType === "request") {
    let table: "bookings" | "custom_package_requests" | "flight_requests" | "contact_messages" = "bookings";
    if (subType === "custom_package_request") table = "custom_package_requests";
    else if (subType === "flight_request") table = "flight_requests";
    else if (subType === "contact_message") table = "contact_messages";

    const { error } = await supabaseAdmin
      .from(table)
      .update({
        archived_at: null,
        archived_by: null,
        archived_by_name: null,
        archive_reason: null,
      } as any)
      .eq("id", id);

    if (error) throw error;

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: actorId,
      actor_email: actorEmail,
      action: "restore",
      entity: table,
      entity_id: id,
      metadata: { actor_name: actorName, sub_type: subType },
    });

    return { ok: true, message: "تمت استعادة السجل بنجاح" };
  }

  if (entityType === "trip") {
    const { error } = await supabaseAdmin
      .from("packages")
      .update({
        archived_at: null,
        archived_by: null,
        archived_by_name: null,
        archive_reason: null,
        status: "draft",
      })
      .eq("id", id);

    if (error) throw error;

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: actorId,
      actor_email: actorEmail,
      action: "restore",
      entity: "package",
      entity_id: id,
      metadata: { actor_name: actorName },
    });

    return { ok: true, message: "تمت استعادة السجل بنجاح" };
  }

  throw new Error("Invalid entity type");
}

/**
 * Permanently deletes an archived record after verifying dependencies.
 */
export async function permanentlyDeleteEntity(params: {
  entityType: ArchiveEntityType;
  subType: ArchiveSubType;
  id: string;
  actorId: string;
  actorEmail: string | null;
  actorName?: string;
}): Promise<{ ok: boolean; message: string }> {
  const { entityType, subType, id, actorId, actorEmail, actorName } = params;

  // 1. Dependency check
  const verdict = await checkEntityDependencies({ entityType, subType, id });
  if (!verdict.canDelete) {
    throw new Error(verdict.reason || "لا يمكن حذف هذا السجل لوجود ارتباطات تشغيلية أو مالية في النظام");
  }

  // 2. Perform deletion
  if (entityType === "client") {
    const { error } = await supabaseAdmin
      .from("customer_profiles")
      .delete()
      .eq("customer_key", id);
    if (error) throw error;
  } else if (entityType === "request") {
    let table: "bookings" | "custom_package_requests" | "flight_requests" | "contact_messages" = "bookings";
    if (subType === "custom_package_request") table = "custom_package_requests";
    else if (subType === "flight_request") table = "flight_requests";
    else if (subType === "contact_message") table = "contact_messages";

    // Clean up dependent passengers if booking has no financial records
    if (subType === "booking") {
      await supabaseAdmin.from("booking_passengers").delete().eq("booking_id", id);
    }

    const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
    if (error) throw error;
  } else if (entityType === "trip") {
    const { error } = await supabaseAdmin.from("packages").delete().eq("id", id);
    if (error) throw error;
  }

  // 3. Single audit logging
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId,
    actor_email: actorEmail,
    action: "permanent_delete",
    entity: subType,
    entity_id: id,
    metadata: {
      actor_name: actorName,
      entity_type: entityType,
      deleted_at: new Date().toISOString(),
    },
  });

  return { ok: true, message: "تم حذف السجل نهائياً من النظام" };
}
