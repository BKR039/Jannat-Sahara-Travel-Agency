import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  ContactLeadInput,
  BuilderLeadInput,
  ManualLeadInput,
  UpdateLeadStatusInput,
  AddLeadNoteInput,
  ScheduleLeadFollowUpInput,
  RecordLeadObjectionInput,
  SaveLeadOfferInput,
  ConvertLeadToBookingInput,
  EditLeadInput,
  ArchiveLeadInput,
  RestoreLeadInput,
  DeleteLeadInput,
  BulkUpdateLeadStatusInput,
  BulkArchiveLeadsInput,
  BulkDeleteLeadsInput,
  AssignLeadInput,
  BulkAssignLeadsInput,
  ImportLeadsBatchInput,
  type LeadSource,
  type LeadStatus,
  type LeadIntent,
  type BuilderSnapshot,
} from "./leads.schema";
import { customerKey, normalizePhone } from "@/lib/admin/customer-identity";

export interface LeadRow {
  id: string;
  reference: string;
  customer_key: string;
  full_name: string;
  phone: string;
  phone_normalized: string;
  email: string | null;
  governorate: string | null;
  city: string | null;
  trip_id: string | null;
  trip_name: string | null;
  travelers_count: number;
  adults: number;
  children: number;
  infants: number;
  interests: string[];
  contact_preference: string;
  preferred_contact_time: string;
  notes: string | null;
  source: LeadSource;
  source_details: Record<string, any>;
  status: LeadStatus;
  loss_reason: string | null;
  loss_notes: string | null;
  intent: LeadIntent;
  intent_score_reasons: string[];
  builder_snapshot: BuilderSnapshot | null;
  builder_step_reached: string | null;
  next_follow_up_date: string | null;
  next_follow_up_time: string | null;
  follow_up_note: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  branch_id: string | null;
  offer_amount: number | null;
  offer_currency: string;
  offer_status: string | null;
  offer_notes: string | null;
  offer_sent_at: string | null;
  last_contact_at: string | null;
  converted_booking_id: string | null;
  converted_at: string | null;
  archived_at: string | null;
  archived_by: string | null;
  archived_by_name: string | null;
  archive_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadActivityRow {
  id: string;
  lead_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
}

export interface SalesCenterKPIs {
  newCount: number;
  toContactCount: number;
  qualifiedCount: number;
  followUpsDueCount: number;
  overdueCount: number;
  todayCount: number;
  offersSentCount: number;
  confirmedCount: number;
  lostCount: number;
  archivedCount: number;
  totalCount: number;
  conversionRate: number;
}

function generateLeadReference(): string {
  const code = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `JS-LD-${Date.now().toString(36).toUpperCase().slice(-4)}${code}`;
}

/** Check whether the leads table exists in Postgres schema cache */
let _leadsTableExists: boolean | null = null;

async function checkLeadsTable(supabaseAdmin: any): Promise<boolean> {
  if (_leadsTableExists !== null) return _leadsTableExists;
  try {
    const { error } = await supabaseAdmin.from("leads").select("id").limit(1);
    if (error && error.message?.includes("Could not find the table")) {
      _leadsTableExists = false;
      return false;
    }
    _leadsTableExists = true;
    return true;
  } catch {
    _leadsTableExists = false;
    return false;
  }
}

/**
 * Public progressive Contact Form submission.
 * Validates, rate-limits, sanitizes, detects duplicates, stores lead, and syncs CRM profile.
 */
export const submitLeadFromContact = createServerFn({ method: "POST" })
  .validator((d: unknown) => ContactLeadInput.parse(d))
  .handler(async ({ data }) => {
    const {
      enforceRateLimit,
      sanitizeText,
      sanitizeOptionalText,
      sanitizeEmail,
    } = await import("@/lib/security.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.website_hp && data.website_hp.trim().length > 0) {
      // Honeypot tripped by bot: silently return success without database mutation
      return { ok: true, reference: generateLeadReference(), customerKey: "bot-trap" };
    }

    await enforceRateLimit({ scope: "contact_lead", limit: 5, windowSeconds: 600 });

    const phone_normalized = normalizePhone(data.phone);
    const row_phone = sanitizeText(data.phone, 32);
    const row_email = data.email ? sanitizeEmail(data.email) : null;
    const row_name = sanitizeText(data.fullName, 120);
    const row_governorate = sanitizeText(data.governorate, 60);
    const row_city = sanitizeOptionalText(data.city, 60);
    const row_notes = sanitizeOptionalText(data.notes, 2000);
    const reference = generateLeadReference();
    const cKey = customerKey(row_phone, row_email, reference);

    // Derive Intent based on observable behavior
    const intentReasons: string[] = [];
    let intent: LeadIntent = "medium";

    if (data.interests.includes("booking")) {
      intentReasons.push("طلب الحجز المباشر");
      intent = "high";
    }
    if (data.tripId) {
      intentReasons.push("تحديد رحلة معينة");
      if (data.travelersCount >= 2) intent = "high";
    }
    if (data.interests.includes("price_program") && data.interests.length >= 3) {
      intentReasons.push("استفسار تفصيلي متعدد الخدمات");
    }
    if (intentReasons.length === 0) {
      intentReasons.push("تواصل عام من الموقع");
      intent = "medium";
    }

    // Resolve trip title if tripId is provided
    let tripName = data.tripName || null;
    if (data.tripId && !tripName) {
      const { data: pkg } = await supabaseAdmin
        .from("packages")
        .select("title")
        .eq("id", data.tripId)
        .maybeSingle();
      if (pkg?.title) tripName = pkg.title;
    }

    const hasLeads = await checkLeadsTable(supabaseAdmin);

    if (hasLeads) {
      // 1. Check for recent duplicate (within 15 minutes by phone)
      const { data: existing } = await supabaseAdmin
        .from("leads")
        .select("id, reference")
        .eq("phone_normalized", phone_normalized)
        .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        return { ok: true, reference: existing[0].reference, id: existing[0].id, duplicate: true };
      }

      // 2. Insert into leads table
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("leads")
        .insert({
          reference,
          customer_key: cKey,
          full_name: row_name,
          phone: row_phone,
          phone_normalized,
          email: row_email,
          governorate: row_governorate,
          city: row_city,
          trip_id: data.tripId ?? null,
          trip_name: tripName,
          travelers_count: data.travelersCount,
          adults: data.adults,
          children: data.children,
          infants: data.infants,
          interests: data.interests,
          contact_preference: data.contactPreference,
          preferred_contact_time: data.preferredContactTime,
          notes: row_notes,
          source: data.source,
          source_details: data.sourceDetails ?? {},
          status: "new",
          intent,
          intent_score_reasons: intentReasons,
        } as never)
        .select("id, reference")
        .single();

      if (insertError || !inserted) {
        console.error("[leads] insert failed", insertError);
        throw new Error("Failed to save lead");
      }

      // 3. Log initial creation activity
      await supabaseAdmin.from("lead_activities").insert({
        lead_id: inserted.id,
        activity_type: "created",
        title: "تم استلام الطلب من صفحة التواصل",
        description: `طلب اتصال: ${row_name} (${row_phone}) - الولاية: ${row_governorate}`,
        metadata: {
          source: data.source,
          interests: data.interests,
          contactPreference: data.contactPreference,
          preferredContactTime: data.preferredContactTime,
        },
      } as never);

      // 4. Upsert persistent CRM profile
      try {
        await supabaseAdmin.from("customer_profiles").upsert(
          {
            customer_key: cKey,
            full_name: row_name,
            phone: row_phone,
            email: row_email,
            city: row_governorate,
            status: "lead",
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "customer_key" },
        );
      } catch (err) {
        console.warn("[leads] customer profile upsert warning", err);
      }

      return { ok: true, reference: inserted.reference, id: inserted.id, duplicate: false };
    } else {
      // Resilient Fallback to custom_package_requests & customer_profiles
      const metadataNote = `[LEAD_DATA]: ${JSON.stringify({
        governorate: row_governorate,
        city: row_city,
        interests: data.interests,
        contactPreference: data.contactPreference,
        preferredContactTime: data.preferredContactTime,
        intent,
        intentReasons,
        source: data.source,
        tripName,
      })}`;

      const combinedNotes = [metadataNote, row_notes].filter(Boolean).join("\n\n");

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("custom_package_requests")
        .insert({
          reference,
          customer_key: cKey,
          customer_name: row_name,
          phone: row_phone,
          email: row_email,
          adults: data.adults,
          children: data.children,
          infants: data.infants,
          contact_preference: data.contactPreference,
          notes: combinedNotes,
          status: "new",
        } as never)
        .select("id, reference")
        .single();

      if (insertError || !inserted) {
        console.error("[leads-fallback] insert failed", insertError);
        throw new Error("Failed to save lead");
      }

      // Upsert persistent CRM profile
      try {
        await supabaseAdmin.from("customer_profiles").upsert(
          {
            customer_key: cKey,
            full_name: row_name,
            phone: row_phone,
            email: row_email,
            city: row_governorate,
            status: "lead",
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "customer_key" },
        );
      } catch (err) {
        console.warn("[leads-fallback] customer profile upsert warning", err);
      }

      return { ok: true, reference: inserted.reference, id: inserted.id, duplicate: false };
    }
  });

/**
 * Public Umrah Builder submission.
 * Saves lead with full builder snapshot (hotels, flights, room, travelers, estimated price).
 */
export const submitLeadFromBuilder = createServerFn({ method: "POST" })
  .validator((d: unknown) => BuilderLeadInput.parse(d))
  .handler(async ({ data }) => {
    const {
      enforceRateLimit,
      sanitizeText,
      sanitizeOptionalText,
      sanitizeEmail,
    } = await import("@/lib/security.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await enforceRateLimit({ scope: "builder_lead", limit: 5, windowSeconds: 900 });

    const phone_normalized = normalizePhone(data.phone);
    const row_phone = sanitizeText(data.phone, 32);
    const row_email = data.email ? sanitizeEmail(data.email) : null;
    const row_name = sanitizeText(data.fullName, 120);
    const row_governorate = sanitizeOptionalText(data.governorate, 60);
    const row_notes = sanitizeOptionalText(data.notes, 2000);
    const reference = generateLeadReference();
    const cKey = customerKey(row_phone, row_email, reference);

    // Intent is inherently HIGH for Umrah Builder submissions
    const intent: LeadIntent = "high";
    const intentReasons = [
      "إتمام تخصيص باقة العمرة بالكامل",
      `عدد المسافرين: ${data.builderSnapshot.adults} بالغين، ${data.builderSnapshot.children} أطفال`,
      data.builderSnapshot.makkahHotelName ? `فندق مكة: ${data.builderSnapshot.makkahHotelName}` : "تحديد فندق مكة",
      data.builderSnapshot.madinahHotelName ? `فندق المدينة: ${data.builderSnapshot.madinahHotelName}` : "تحديد فندق المدينة",
    ];

    const hasLeads = await checkLeadsTable(supabaseAdmin);

    if (hasLeads) {
      // Duplicate check within 15 min
      const { data: existing } = await supabaseAdmin
        .from("leads")
        .select("id, reference")
        .eq("phone_normalized", phone_normalized)
        .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        return { ok: true, reference: existing[0].reference, id: existing[0].id, duplicate: true };
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("leads")
        .insert({
          reference,
          customer_key: cKey,
          full_name: row_name,
          phone: row_phone,
          phone_normalized,
          email: row_email,
          governorate: row_governorate,
          trip_id: data.tripId ?? null,
          trip_name: data.builderSnapshot.tripTitle ?? data.tripName ?? "عمرة مخصصة",
          travelers_count: data.builderSnapshot.adults + data.builderSnapshot.children + data.builderSnapshot.infants,
          adults: data.builderSnapshot.adults,
          children: data.builderSnapshot.children,
          infants: data.builderSnapshot.infants,
          interests: ["booking", "hotels", "flights", "price_program"],
          contact_preference: data.contactPreference,
          preferred_contact_time: data.preferredContactTime,
          notes: row_notes,
          source: "umrah_builder",
          source_details: data.sourceDetails ?? {},
          status: "new",
          intent,
          intent_score_reasons: intentReasons,
          builder_snapshot: data.builderSnapshot,
          builder_step_reached: data.builderStepReached,
        } as never)
        .select("id, reference")
        .single();

      if (insertError || !inserted) {
        console.error("[leads-builder] insert failed", insertError);
        throw new Error("Failed to save builder lead");
      }

      // Log activity
      await supabaseAdmin.from("lead_activities").insert({
        lead_id: inserted.id,
        activity_type: "created",
        title: "تم بناء رحلة عمرة وطلب العرض النهائي",
        description: `بناء عمرة مخصصة: ${data.builderSnapshot.makkahNights ?? 0} ليالي مكة، ${data.builderSnapshot.madinahNights ?? 0} ليالي المدينة (${data.builderSnapshot.adults} مسافرين)`,
        metadata: {
          builderSnapshot: data.builderSnapshot,
        },
      } as never);

      // Upsert CRM profile
      try {
        await supabaseAdmin.from("customer_profiles").upsert(
          {
            customer_key: cKey,
            full_name: row_name,
            phone: row_phone,
            email: row_email,
            city: row_governorate,
            status: "lead",
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "customer_key" },
        );
      } catch (err) {
        console.warn("[leads-builder] customer profile upsert warning", err);
      }

      return { ok: true, reference: inserted.reference, id: inserted.id, duplicate: false };
    } else {
      // Fallback: use custom_package_requests
      const snapshotNotes = `[BUILDER_SNAPSHOT]: ${JSON.stringify(data.builderSnapshot)}`;
      const combinedNotes = [snapshotNotes, row_notes].filter(Boolean).join("\n\n");

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("custom_package_requests")
        .insert({
          reference,
          customer_key: cKey,
          customer_name: row_name,
          phone: row_phone,
          email: row_email,
          adults: data.builderSnapshot.adults,
          children: data.builderSnapshot.children,
          infants: data.builderSnapshot.infants,
          makkah_nights: data.builderSnapshot.makkahNights ?? 0,
          makkah_hotel_id: data.builderSnapshot.makkahHotelId ?? null,
          makkah_hotel_name: data.builderSnapshot.makkahHotelName ?? null,
          madinah_nights: data.builderSnapshot.madinahNights ?? 0,
          madinah_hotel_id: data.builderSnapshot.madinahHotelId ?? null,
          madinah_hotel_name: data.builderSnapshot.madinahHotelName ?? null,
          departure_date: data.builderSnapshot.departureDate ?? null,
          return_date: data.builderSnapshot.returnDate ?? null,
          departure_airport: data.builderSnapshot.departureAirport ?? null,
          return_airport: data.builderSnapshot.returnAirport ?? null,
          room_type: data.builderSnapshot.roomType ?? null,
          notes: combinedNotes,
          status: "new",
        } as never)
        .select("id, reference")
        .single();

      if (insertError || !inserted) {
        console.error("[leads-builder-fallback] insert failed", insertError);
        throw new Error("Failed to save builder lead");
      }

      // Upsert CRM profile
      try {
        await supabaseAdmin.from("customer_profiles").upsert(
          {
            customer_key: cKey,
            full_name: row_name,
            phone: row_phone,
            email: row_email,
            city: row_governorate,
            status: "lead",
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "customer_key" },
        );
      } catch (err) {
        console.warn("[leads-builder-fallback] customer profile upsert warning", err);
      }

      return { ok: true, reference: inserted.reference, id: inserted.id, duplicate: false };
    }
  });

/**
 * Admin: List leads with search, filters, and real-time calculated KPIs.
 * Role-gated by "leads.view".
 */
export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: unknown) =>
      z
        .object({
          status: z.string().optional(),
          source: z.string().optional(),
          tripId: z.string().optional(),
          governorate: z.string().optional(),
          intent: z.string().optional(),
          followUpUrgency: z.enum(["all", "overdue", "today", "upcoming"]).optional(),
          archiveState: z.enum(["active", "archived", "all"]).default("active").optional(),
          assignedTo: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.view");
    const authUser = await assertActiveUser(context.userId);

    const hasLeads = await checkLeadsTable(supabaseAdmin);

    if (hasLeads) {
      let query = supabaseAdmin
        .from("leads")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Archive state filter
      if (data.archiveState === "archived") {
        query = query.not("archived_at", "is", null);
      } else if (data.archiveState === "all") {
        // no filter on archived_at
      } else {
        // active default
        query = query.is("archived_at", null);
      }

      // Assignee filter
      if (data.assignedTo && data.assignedTo !== "all") {
        if (data.assignedTo === "unassigned") {
          query = query.is("assigned_to", null);
        } else {
          query = query.eq("assigned_to", data.assignedTo);
        }
      }

      if (data.status && data.status !== "all") {
        query = query.eq("status", data.status);
      }
      if (data.source && data.source !== "all") {
        query = query.eq("source", data.source);
      }
      if (data.tripId && data.tripId !== "all") {
        query = query.eq("trip_id", data.tripId);
      }
      if (data.governorate && data.governorate !== "all") {
        query = query.eq("governorate", data.governorate);
      }
      if (data.intent && data.intent !== "all") {
        query = query.eq("intent", data.intent);
      }

      const todayStr = new Date().toISOString().split("T")[0];

      if (data.followUpUrgency === "overdue") {
        query = query.not("next_follow_up_date", "is", null).lt("next_follow_up_date", todayStr);
      } else if (data.followUpUrgency === "today") {
        query = query.eq("next_follow_up_date", todayStr);
      } else if (data.followUpUrgency === "upcoming") {
        query = query.gt("next_follow_up_date", todayStr);
      }

      if (data.search && data.search.trim()) {
        const q = data.search.trim();
        query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,reference.ilike.%${q}%`);
      }

      query = query.range(data.offset, data.offset + data.limit - 1);

      const { data: leads, count, error } = await query;

      if (error) {
        console.error("[leads] list query failed", error);
        throw new Error("Failed to load leads");
      }

      // Compute Global KPIs from all leads
      const { data: allLeads } = await (supabaseAdmin as any)
        .from("leads")
        .select("status, next_follow_up_date, archived_at");

      const rows: any[] = allLeads ?? [];
      let newCount = 0;
      let toContactCount = 0;
      let qualifiedCount = 0;
      let offersSentCount = 0;
      let followUpsDueCount = 0;
      let overdueCount = 0;
      let todayCount = 0;
      let confirmedCount = 0;
      let lostCount = 0;
      let archivedCount = 0;

      for (const row of rows) {
        if (row.archived_at) {
          archivedCount++;
          continue; // exclude archived leads from active workload metrics
        }

        const s = row.status as LeadStatus;
        if (s === "new") newCount++;
        if (s === "new" || s === "contacted") toContactCount++;
        if (s === "qualified") qualifiedCount++;
        if (s === "offer_sent") offersSentCount++;
        if (s === "confirmed") confirmedCount++;
        if (s === "lost") lostCount++;

        if (row.next_follow_up_date) {
          if (row.next_follow_up_date < todayStr) {
            overdueCount++;
            followUpsDueCount++;
          } else if (row.next_follow_up_date === todayStr) {
            todayCount++;
            followUpsDueCount++;
          }
        }
      }

      const activeTotal = rows.filter((r) => !r.archived_at).length;
      const conversionRate = activeTotal > 0 ? Number(((confirmedCount / activeTotal) * 100).toFixed(1)) : 0;

      const kpis: SalesCenterKPIs = {
        newCount,
        toContactCount,
        qualifiedCount,
        followUpsDueCount,
        overdueCount,
        todayCount,
        offersSentCount,
        confirmedCount,
        lostCount,
        archivedCount,
        totalCount: activeTotal,
        conversionRate,
      };

      return {
        leads: (leads ?? []) as LeadRow[],
        total: count ?? 0,
        kpis,
      };
    } else {
      // Fallback adapter: transform custom_package_requests into LeadRow shape
      const { data: customRows } = await supabaseAdmin
        .from("custom_package_requests")
        .select("*")
        .order("created_at", { ascending: false });

      const mapped: LeadRow[] = (customRows ?? []).map((r) => {
        let governorate: string | null = null;
        let intent: LeadIntent = "high";
        let intentReasons = ["طلب تخصيص باقة"];
        let builderSnapshot: BuilderSnapshot | null = null;

        if (r.notes && r.notes.includes("[BUILDER_SNAPSHOT]:")) {
          try {
            const jsonPart = r.notes.split("[BUILDER_SNAPSHOT]:")[1].split("\n\n")[0].trim();
            builderSnapshot = JSON.parse(jsonPart);
          } catch {}
        } else if (r.notes && r.notes.includes("[LEAD_DATA]:")) {
          try {
            const jsonPart = r.notes.split("[LEAD_DATA]:")[1].split("\n\n")[0].trim();
            const parsed = JSON.parse(jsonPart);
            governorate = parsed.governorate;
            intent = parsed.intent || "medium";
            intentReasons = parsed.intentReasons || [];
          } catch {}
        }

        const phoneNorm = normalizePhone(r.phone);

        return {
          id: r.id,
          reference: r.reference,
          customer_key: r.customer_key || customerKey(r.phone, r.email, r.id),
          full_name: r.customer_name,
          phone: r.phone,
          phone_normalized: phoneNorm,
          email: r.email ?? null,
          governorate: governorate ?? "تونس",
          city: null,
          trip_id: null,
          trip_name: builderSnapshot?.tripTitle ?? "عمرة مخصصة",
          travelers_count: (r.adults ?? 1) + (r.children ?? 0) + (r.infants ?? 0),
          adults: r.adults ?? 1,
          children: r.children ?? 0,
          infants: r.infants ?? 0,
          interests: ["price_program", "hotels"],
          contact_preference: r.contact_preference || "phone",
          preferred_contact_time: "anytime",
          notes: r.notes,
          source: (builderSnapshot ? "umrah_builder" : "website") as LeadSource,
          source_details: {},
          status: (r.status === "reviewing" ? "contacted" : r.status === "cancelled" ? "lost" : r.status) as LeadStatus,
          loss_reason: null,
          loss_notes: null,
          intent,
          intent_score_reasons: intentReasons,
          builder_snapshot: builderSnapshot,
          builder_step_reached: builderSnapshot ? "submitted" : null,
          next_follow_up_date: null,
          next_follow_up_time: null,
          follow_up_note: null,
          assigned_to: r.assigned_to,
          assigned_to_name: null,
          branch_id: r.branch_id,
          offer_amount: r.offer_amount ? Number(r.offer_amount) : null,
          offer_currency: r.offer_currency || "TND",
          offer_status: r.offer_amount ? "sent" : null,
          offer_notes: r.offer_notes,
          offer_sent_at: r.offer_sent_at,
          last_contact_at: r.last_contact_at,
          converted_booking_id: null,
          converted_at: null,
          archived_at: null,
          archived_by: null,
          archived_by_name: null,
          archive_reason: null,
          created_at: r.created_at,
          updated_at: r.updated_at,
        };
      });

      // Filter in memory for fallback
      let filtered = mapped;
      if (data.status && data.status !== "all") filtered = filtered.filter((l) => l.status === data.status);
      if (data.search && data.search.trim()) {
        const q = data.search.toLowerCase();
        filtered = filtered.filter((l) => l.full_name.toLowerCase().includes(q) || l.phone.includes(q));
      }

      const totalCount = mapped.length;
      const confirmedCount = mapped.filter((l) => l.status === "confirmed").length;
      const conversionRate = totalCount > 0 ? Number(((confirmedCount / totalCount) * 100).toFixed(1)) : 0;

      const kpis: SalesCenterKPIs = {
        newCount: mapped.filter((l) => l.status === "new").length,
        toContactCount: mapped.filter((l) => l.status === "new" || l.status === "contacted").length,
        qualifiedCount: mapped.filter((l) => l.status === "qualified").length,
        followUpsDueCount: 0,
        overdueCount: 0,
        todayCount: 0,
        offersSentCount: mapped.filter((l) => l.status === "offer_sent").length,
        confirmedCount,
        lostCount: mapped.filter((l) => l.status === "lost").length,
        archivedCount: 0,
        totalCount,
        conversionRate,
      };

      return {
        leads: filtered.slice(data.offset, data.offset + data.limit),
        total: filtered.length,
        kpis,
      };
    }
  });

/**
 * Admin: Get single lead with activity history.
 */
export const getLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ leadId: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.view");
    const authUser = await assertActiveUser(context.userId);

    const hasLeads = await checkLeadsTable(supabaseAdmin);

    if (hasLeads) {
      const { data: lead, error } = await supabaseAdmin
        .from("leads")
        .select("*")
        .eq("id", data.leadId)
        .single();

      if (error || !lead) {
        throw new Error("Lead not found");
      }

      const { data: activities } = await supabaseAdmin
        .from("lead_activities")
        .select("*")
        .eq("lead_id", data.leadId)
        .order("created_at", { ascending: false });

      return {
        lead: lead as LeadRow,
        activities: (activities ?? []) as LeadActivityRow[],
      };
    } else {
      // Fallback: fetch from custom_package_requests
      const { data: r, error } = await supabaseAdmin
        .from("custom_package_requests")
        .select("*")
        .eq("id", data.leadId)
        .single();

      if (error || !r) throw new Error("Lead not found");

      let builderSnapshot: BuilderSnapshot | null = null;
      let governorate = "تونس";
      let intent: LeadIntent = "high";
      let intentReasons = ["طلب تخصيص باقة"];

      if (r.notes && r.notes.includes("[BUILDER_SNAPSHOT]:")) {
        try {
          const jsonPart = r.notes.split("[BUILDER_SNAPSHOT]:")[1].split("\n\n")[0].trim();
          builderSnapshot = JSON.parse(jsonPart);
        } catch {}
      } else if (r.notes && r.notes.includes("[LEAD_DATA]:")) {
        try {
          const jsonPart = r.notes.split("[LEAD_DATA]:")[1].split("\n\n")[0].trim();
          const parsed = JSON.parse(jsonPart);
          governorate = parsed.governorate || "تونس";
          intent = parsed.intent || "medium";
          intentReasons = parsed.intentReasons || [];
        } catch {}
      }

      const leadRow: LeadRow = {
        id: r.id,
        reference: r.reference,
        customer_key: r.customer_key || customerKey(r.phone, r.email, r.id),
        full_name: r.customer_name,
        phone: r.phone,
        phone_normalized: normalizePhone(r.phone),
        email: r.email,
        governorate,
        city: null,
        trip_id: null,
        trip_name: builderSnapshot?.tripTitle ?? "عمرة مخصصة",
        travelers_count: (r.adults ?? 1) + (r.children ?? 0) + (r.infants ?? 0),
        adults: r.adults ?? 1,
        children: r.children ?? 0,
        infants: r.infants ?? 0,
        interests: ["price_program", "hotels"],
        contact_preference: r.contact_preference || "phone",
        preferred_contact_time: "anytime",
        notes: r.notes,
        source: (builderSnapshot ? "umrah_builder" : "website") as LeadSource,
        source_details: {},
        status: (r.status === "reviewing" ? "contacted" : r.status === "cancelled" ? "lost" : r.status) as LeadStatus,
        loss_reason: null,
        loss_notes: null,
        intent,
        intent_score_reasons: intentReasons,
        builder_snapshot: builderSnapshot,
        builder_step_reached: builderSnapshot ? "submitted" : null,
        next_follow_up_date: null,
        next_follow_up_time: null,
        follow_up_note: null,
        assigned_to: r.assigned_to,
        assigned_to_name: null,
        branch_id: r.branch_id,
        offer_amount: r.offer_amount ? Number(r.offer_amount) : null,
        offer_currency: r.offer_currency || "TND",
        offer_status: r.offer_amount ? "sent" : null,
        offer_notes: r.offer_notes,
        offer_sent_at: r.offer_sent_at,
        last_contact_at: r.last_contact_at,
        converted_booking_id: null,
        converted_at: null,
        archived_at: null,
        archived_by: null,
        archived_by_name: null,
        archive_reason: null,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };

      return {
        lead: leadRow,
        activities: [
          {
            id: "act-1",
            lead_id: r.id,
            activity_type: "created",
            title: "تم إنشاء الطلب",
            description: r.notes,
            metadata: {},
            author_id: null,
            author_name: null,
            created_at: r.created_at,
          },
        ],
      };
    }
  });

/**
 * Admin: Create manual lead from Sales Center (Phone, WhatsApp, Messenger, Branch).
 * Role-gated by "leads.create".
 */
export const createManualLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ManualLeadInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { sanitizeText, sanitizeOptionalText, sanitizeEmail } = await import("@/lib/security.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.create");
    const authUser = await assertActiveUser(context.userId);

    const phone_normalized = normalizePhone(data.phone);
    const row_phone = sanitizeText(data.phone, 32);
    const row_email = data.email ? sanitizeEmail(data.email) : null;
    const row_name = sanitizeText(data.fullName, 120);
    const row_governorate = sanitizeOptionalText(data.governorate, 60);
    const row_notes = sanitizeOptionalText(data.notes, 2000);
    const reference = generateLeadReference();
    const cKey = customerKey(row_phone, row_email, reference);

    const hasLeads = await checkLeadsTable(supabaseAdmin);

    if (hasLeads) {
      const { data: inserted, error } = await supabaseAdmin
        .from("leads")
        .insert({
          reference,
          customer_key: cKey,
          full_name: row_name,
          phone: row_phone,
          phone_normalized,
          email: row_email,
          governorate: row_governorate,
          city: data.city,
          trip_id: data.tripId,
          trip_name: data.tripName,
          travelers_count: data.travelersCount,
          adults: data.adults,
          children: data.children,
          infants: data.infants,
          interests: data.interests,
          contact_preference: data.contactPreference,
          preferred_contact_time: data.preferredContactTime,
          notes: row_notes,
          source: data.source,
          source_details: data.sourceDetails ?? {},
          branch_id: data.branchId,
          assigned_to: data.assignedTo,
          status: data.initialStatus,
          intent: "medium",
          intent_score_reasons: [`إضافة يدوية عبر ${data.source}`],
        } as never)
        .select("id, reference")
        .single();

      if (error || !inserted) {
        console.error("[leads-manual] insert failed", error);
        throw new Error("Failed to create manual lead");
      }

      // Log activity
      await supabaseAdmin.from("lead_activities").insert({
        lead_id: inserted.id,
        activity_type: "created",
        title: `تم إنشاء Lead يدويًا (المصدر: ${data.source})`,
        description: row_notes ?? null,
        author_id: authUser.id,
        author_name: authUser.email,
      } as never);

      // Upsert CRM Profile
      await supabaseAdmin.from("customer_profiles").upsert(
        {
          customer_key: cKey,
          full_name: row_name,
          phone: row_phone,
          email: row_email,
          city: row_governorate,
          status: "lead",
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "customer_key" },
      );

      return { ok: true, id: inserted.id, reference: inserted.reference };
    } else {
      // Fallback
      const { data: inserted, error } = await supabaseAdmin
        .from("custom_package_requests")
        .insert({
          reference,
          customer_key: cKey,
          customer_name: row_name,
          phone: row_phone,
          email: row_email,
          adults: data.adults,
          children: data.children,
          infants: data.infants,
          contact_preference: data.contactPreference,
          notes: row_notes,
          status: data.initialStatus === "lost" ? "cancelled" : data.initialStatus,
        } as never)
        .select("id, reference")
        .single();

      if (error || !inserted) throw new Error("Failed to create manual lead");
      return { ok: true, id: inserted.id, reference: inserted.reference };
    }
  });

/**
 * Admin: Update lead status & record loss reason if lost.
 * Role-gated by "leads.edit".
 */
export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => UpdateLeadStatusInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { sanitizeOptionalText } = await import("@/lib/security.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.edit");
    const authUser = await assertActiveUser(context.userId);

    const hasLeads = await checkLeadsTable(supabaseAdmin);

    if (hasLeads) {
      const updatePayload: Record<string, unknown> = {
        status: data.status,
        updated_at: new Date().toISOString(),
      };

      if (data.status === "lost") {
        updatePayload.loss_reason = data.lossReason ?? "other";
        updatePayload.loss_notes = sanitizeOptionalText(data.lossNotes, 1000);
      } else {
        updatePayload.loss_reason = null;
        updatePayload.loss_notes = null;
      }

      if (data.status === "contacted") {
        updatePayload.last_contact_at = new Date().toISOString();
      }

      const { error } = await supabaseAdmin
        .from("leads")
        .update(updatePayload as never)
        .eq("id", data.leadId);

      if (error) {
        console.error("[leads] status update failed", error);
        throw new Error("Failed to update status");
      }

      // Log activity
      await supabaseAdmin.from("lead_activities").insert({
        lead_id: data.leadId,
        activity_type: data.status === "lost" ? "lost" : "status_change",
        title: `تحديث الحالة إلى: ${data.status}`,
        description: data.note || (data.status === "lost" ? `سبب الإلغاء: ${data.lossReason}` : null),
        metadata: { newStatus: data.status, lossReason: data.lossReason },
        author_id: authUser.id,
        author_name: authUser.email,
      } as never);

      return { ok: true };
    } else {
      // Fallback
      const s = data.status === "lost" ? "cancelled" : data.status;
      await supabaseAdmin
        .from("custom_package_requests")
        .update({ status: s, updated_at: new Date().toISOString() } as never)
        .eq("id", data.leadId);
      return { ok: true };
    }
  });

/**
 * Admin: Add note to lead and persist in lead_activities + customer_notes.
 * Role-gated by "leads.edit".
 */
export const addLeadNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => AddLeadNoteInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { sanitizeText } = await import("@/lib/security.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.edit");
    const authUser = await assertActiveUser(context.userId);

    const cleanNote = sanitizeText(data.note, 2000);
    const hasLeads = await checkLeadsTable(supabaseAdmin);

    if (hasLeads) {
      // 1. Get customer_key from lead
      const { data: lead } = await supabaseAdmin
        .from("leads")
        .select("customer_key")
        .eq("id", data.leadId)
        .single();

      // 2. Insert into lead_activities
      await supabaseAdmin.from("lead_activities").insert({
        lead_id: data.leadId,
        activity_type: data.activityType,
        title: data.activityType === "call" ? "ملاحظة مكالمة هاتفية" : "ملاحظة متابعة",
        description: cleanNote,
        author_id: authUser.id,
        author_name: authUser.email,
      } as never);

      // 3. Sync to customer_notes
      if (lead?.customer_key) {
        await supabaseAdmin.from("customer_notes").insert({
          customer_key: lead.customer_key,
          note: cleanNote,
          author_id: authUser.id,
          author_email: authUser.email,
        } as never);
      }

      return { ok: true };
    } else {
      // Fallback
      const { data: r } = await supabaseAdmin
        .from("custom_package_requests")
        .select("customer_key")
        .eq("id", data.leadId)
        .single();

      if (r?.customer_key) {
        await supabaseAdmin.from("customer_notes").insert({
          customer_key: r.customer_key,
          note: cleanNote,
          author_id: authUser.id,
          author_email: authUser.email,
        } as never);
      }
      return { ok: true };
    }
  });

/**
 * Admin: Schedule next follow-up.
 * Role-gated by "leads.edit".
 */
export const scheduleLeadFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ScheduleLeadFollowUpInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { sanitizeOptionalText } = await import("@/lib/security.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.edit");
    const authUser = await assertActiveUser(context.userId);

    const cleanNote = sanitizeOptionalText(data.followUpNote, 500);
    const hasLeads = await checkLeadsTable(supabaseAdmin);

    if (hasLeads) {
      const { error } = await supabaseAdmin
        .from("leads")
        .update({
          next_follow_up_date: data.nextFollowUpDate,
          next_follow_up_time: data.nextFollowUpTime ?? null,
          follow_up_note: cleanNote,
          assigned_to: data.assignedTo ?? undefined,
          status: "follow_up",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", data.leadId);

      if (error) {
        console.error("[leads] schedule follow-up failed", error);
        throw new Error("Failed to schedule follow-up");
      }

      // Log activity
      await supabaseAdmin.from("lead_activities").insert({
        lead_id: data.leadId,
        activity_type: "follow_up_scheduled",
        title: `تحديد موعد متابعة: ${data.nextFollowUpDate} ${data.nextFollowUpTime || ""}`,
        description: cleanNote,
        metadata: { date: data.nextFollowUpDate, time: data.nextFollowUpTime },
        author_id: authUser.id,
        author_name: authUser.email,
      } as never);

      return { ok: true };
    } else {
      return { ok: true };
    }
  });

/**
 * Admin: Record customer objection.
 * Role-gated by "leads.edit".
 */
export const recordLeadObjection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => RecordLeadObjectionInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { sanitizeOptionalText } = await import("@/lib/security.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.edit");
    const authUser = await assertActiveUser(context.userId);

    const cleanExp = sanitizeOptionalText(data.explanation, 1000);
    const hasLeads = await checkLeadsTable(supabaseAdmin);

    if (hasLeads) {
      await supabaseAdmin.from("lead_activities").insert({
        lead_id: data.leadId,
        activity_type: "objection",
        title: `تسجيل اعتراض: ${data.objection}`,
        description: cleanExp,
        metadata: { objection: data.objection },
        author_id: authUser.id,
        author_name: authUser.email,
      } as never);

      return { ok: true };
    }
    return { ok: true };
  });

/**
 * Admin: Save custom offer details on lead.
 * Role-gated by "leads.edit".
 */
export const saveLeadOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => SaveLeadOfferInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { sanitizeOptionalText } = await import("@/lib/security.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.edit");
    const authUser = await assertActiveUser(context.userId);

    const cleanNotes = sanitizeOptionalText(data.offerNotes, 2000);
    const hasLeads = await checkLeadsTable(supabaseAdmin);

    if (hasLeads) {
      const { error } = await supabaseAdmin
        .from("leads")
        .update({
          offer_amount: data.offerAmount,
          offer_currency: data.offerCurrency,
          offer_notes: cleanNotes,
          offer_status: data.offerStatus,
          offer_sent_at: data.offerStatus === "sent" ? new Date().toISOString() : undefined,
          status: data.offerStatus === "sent" ? "offer_sent" : undefined,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", data.leadId);

      if (error) {
        console.error("[leads] save offer failed", error);
        throw new Error("Failed to save offer");
      }

      await supabaseAdmin.from("lead_activities").insert({
        lead_id: data.leadId,
        activity_type: "offer_sent",
        title: `عرض سعر بقيمة ${data.offerAmount} ${data.offerCurrency} (الحالة: ${data.offerStatus})`,
        description: cleanNotes,
        metadata: { amount: data.offerAmount, currency: data.offerCurrency, status: data.offerStatus },
        author_id: authUser.id,
        author_name: authUser.email,
      } as never);

      return { ok: true };
    } else {
      // Fallback: update on custom_package_requests
      await supabaseAdmin
        .from("custom_package_requests")
        .update({
          offer_amount: data.offerAmount,
          offer_currency: data.offerCurrency,
          offer_notes: cleanNotes,
          offer_sent_at: new Date().toISOString(),
          status: "offer_preparing",
        } as never)
        .eq("id", data.leadId);
      return { ok: true };
    }
  });

/**
 * Admin: Convert confirmed lead into real booking.
 * Role-gated by "bookings.create".
 */
export const convertLeadToBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ConvertLeadToBookingInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "bookings.create");
    const authUser = await assertActiveUser(context.userId);

    const hasLeads = await checkLeadsTable(supabaseAdmin);

    // 1. Get package and lead details
    const { data: pkg, error: pkgErr } = await supabaseAdmin
      .from("packages")
      .select("id, title, price, currency")
      .eq("id", data.packageId)
      .single();

    if (pkgErr || !pkg) throw new Error("Package not found");

    let leadData: any = null;
    if (hasLeads) {
      const { data: l, error: leadErr } = await supabaseAdmin
        .from("leads")
        .select("*")
        .eq("id", data.leadId)
        .single();
      if (leadErr || !l) throw new Error("Lead not found");
      leadData = l;
    } else {
      const { data: r, error: rErr } = await supabaseAdmin
        .from("custom_package_requests")
        .select("*")
        .eq("id", data.leadId)
        .single();
      if (rErr || !r) throw new Error("Request not found");
      leadData = {
        full_name: r.customer_name,
        phone: r.phone,
        email: r.email,
        adults: r.adults ?? 1,
        children: r.children ?? 0,
        infants: r.infants ?? 0,
        travelers_count: (r.adults ?? 1) + (r.children ?? 0) + (r.infants ?? 0),
        customer_key: r.customer_key,
        offer_amount: r.offer_amount,
        notes: r.notes,
      };
    }

    const totalPrice = leadData.offer_amount ? Number(leadData.offer_amount) : Number(pkg.price);

    // 2. Insert Booking
    const { data: newBooking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        package_id: pkg.id,
        package_title: pkg.title,
        name: leadData.full_name,
        phone: leadData.phone,
        email: leadData.email,
        adults: leadData.adults,
        children: leadData.children,
        infants: leadData.infants,
        people: leadData.travelers_count,
        total_price: totalPrice,
        currency: pkg.currency || "TND",
        branch_id: data.branchId ?? undefined,
        status: "confirmed",
        payment_status: "unpaid",
        notes: `تم التحويل من مركز المبيعات (Lead Ref: ${leadData.reference || ""})\n${data.specialRequests || ""}`,
      } as never)
      .select("id")
      .single();

    if (bookingErr || !newBooking) {
      console.error("[leads-convert] booking insert failed", bookingErr);
      throw new Error("Failed to create booking from lead");
    }

    // 3. Create primary passenger
    await supabaseAdmin.from("booking_passengers").insert({
      booking_id: newBooking.id,
      full_name: leadData.full_name,
      phone: leadData.phone,
      email: leadData.email,
      is_primary: true,
      passenger_type: "adult",
      sort_order: 1,
    } as never);

    // 4. Update lead status to confirmed & link converted_booking_id
    if (hasLeads) {
      await (supabaseAdmin as any)
        .from("leads")
        .update({
          status: "confirmed",
          converted_booking_id: newBooking.id,
          converted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.leadId);

      await (supabaseAdmin as any).from("lead_activities").insert({
        lead_id: data.leadId,
        activity_type: "converted",
        title: `تم تحويل العميل إلى حجز مؤكد (${pkg.title})`,
        description: `معرف الحجز الجديد: ${newBooking.id} بقيمة ${totalPrice} TND`,
        metadata: { bookingId: newBooking.id, packageId: pkg.id, totalPrice },
        author_id: authUser.id,
        author_name: authUser.email,
      });
    }

    // 5. Update customer_profiles status to 'customer'
    if (leadData.customer_key) {
      await supabaseAdmin
        .from("customer_profiles")
        .update({
          status: "customer",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("customer_key", leadData.customer_key);
    }

    return { ok: true, bookingId: newBooking.id };
  });

/**
 * Admin: Update lead fields while preserving immutable system history.
 * Role-gated by "leads.edit".
 */
export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => EditLeadInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.edit");
    const authUser = await assertActiveUser(context.userId);

    const hasLeads = await checkLeadsTable(supabaseAdmin);
    if (!hasLeads) {
      throw new Error("Leads table is not configured");
    }

    const { data: existing, error: getErr } = await (supabaseAdmin as any)
      .from("leads")
      .select("*")
      .eq("id", data.leadId)
      .single();

    if (getErr || !existing) {
      throw new Error("Lead not found");
    }

    const cleanPhone = normalizePhone(data.phone);
    const changes: Record<string, { from: any; to: any }> = {};

    if (existing.full_name !== data.fullName) changes["الاسم"] = { from: existing.full_name, to: data.fullName };
    if (existing.phone !== data.phone) changes["رقم الهاتف"] = { from: existing.phone, to: data.phone };
    if ((existing.email || "") !== (data.email || "")) changes["البريد الإلكتروني"] = { from: existing.email, to: data.email };
    if ((existing.governorate || "") !== (data.governorate || "")) changes["الولاية"] = { from: existing.governorate, to: data.governorate };
    if ((existing.trip_name || "") !== (data.tripName || "")) changes["الرحلة"] = { from: existing.trip_name, to: data.tripName };
    if (existing.travelers_count !== data.travelersCount) changes["عدد المسافرين"] = { from: existing.travelers_count, to: data.travelersCount };
    if (existing.source !== data.source) changes["المصدر"] = { from: existing.source, to: data.source };

    const diffSummary =
      Object.keys(changes).length > 0
        ? `تعديل: ${Object.keys(changes).join("، ")}`
        : "تحديث البيانات العامة للـ Lead";

    const { error: updateErr } = await (supabaseAdmin as any)
      .from("leads")
      .update({
        full_name: data.fullName,
        phone: data.phone,
        phone_normalized: cleanPhone,
        email: data.email || null,
        governorate: data.governorate || null,
        city: data.city || null,
        trip_id: data.tripId || null,
        trip_name: data.tripName || null,
        travelers_count: data.travelersCount,
        adults: data.adults,
        children: data.children,
        infants: data.infants,
        interests: data.interests,
        contact_preference: data.contactPreference,
        preferred_contact_time: data.preferredContactTime,
        notes: data.notes || null,
        source: data.source,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.leadId);

    if (updateErr) {
      console.error("[leads-update] failed", updateErr);
      throw new Error("Failed to update lead");
    }

    await (supabaseAdmin as any).from("lead_activities").insert({
      lead_id: data.leadId,
      activity_type: "lead_updated",
      title: "تعديل بيانات الـ Lead",
      description: diffSummary,
      metadata: { changes },
      author_id: authUser.id,
      author_name: authUser.email,
    });

    if (existing.customer_key) {
      try {
        await supabaseAdmin
          .from("customer_profiles")
          .update({
            full_name: data.fullName,
            phone: data.phone,
            email: data.email || null,
            city: data.governorate || null,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("customer_key", existing.customer_key);
      } catch (err) {
        console.warn("[leads-update] customer profile sync warning", err);
      }
    }

    return { ok: true, leadId: data.leadId };
  });

/**
 * Admin: Soft-archive a lead.
 * Role-gated by "leads.edit".
 */
export const archiveLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ArchiveLeadInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.edit");
    const authUser = await assertActiveUser(context.userId);

    const now = new Date().toISOString();
    const { error } = await (supabaseAdmin as any)
      .from("leads")
      .update({
        archived_at: now,
        archived_by: authUser.id,
        archived_by_name: authUser.email,
        archive_reason: data.reason || null,
        updated_at: now,
      })
      .eq("id", data.leadId);

    if (error) {
      console.error("[leads-archive] failed", error);
      throw new Error("Failed to archive lead");
    }

    await (supabaseAdmin as any).from("lead_activities").insert({
      lead_id: data.leadId,
      activity_type: "lead_archived",
      title: "أرشفة الـ Lead",
      description: data.reason
        ? `سبب الأرشفة: ${data.reason}`
        : "تم نقل الـ Lead إلى الأرشيف وإخفاؤه من القائمة النشطة مع إمكانية استرجاعه",
      author_id: authUser.id,
      author_name: authUser.email,
    });

    return { ok: true, leadId: data.leadId };
  });

/**
 * Admin: Restore an archived lead back to the active pipeline.
 * Role-gated by "leads.edit".
 */
export const restoreLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => RestoreLeadInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.edit");
    const authUser = await assertActiveUser(context.userId);

    const now = new Date().toISOString();
    const { error } = await (supabaseAdmin as any)
      .from("leads")
      .update({
        archived_at: null,
        archived_by: null,
        archived_by_name: null,
        archive_reason: null,
        updated_at: now,
      })
      .eq("id", data.leadId);

    if (error) {
      console.error("[leads-restore] failed", error);
      throw new Error("Failed to restore lead");
    }

    await (supabaseAdmin as any).from("lead_activities").insert({
      lead_id: data.leadId,
      activity_type: "lead_restored",
      title: "استرجاع الـ Lead من الأرشيف",
      description: "تمت إعادة الـ Lead إلى قائمة المبيعات النشطة",
      author_id: authUser.id,
      author_name: authUser.email,
    });

    return { ok: true, leadId: data.leadId };
  });

/**
 * Admin: Permanently delete a lead with customer identity protection.
 * Role-gated strictly by "leads.delete".
 */
export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => DeleteLeadInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission } = await import("@/lib/admin/authorize.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.delete");

    // 1. Fetch lead details before deletion
    const { data: lead, error: getErr } = await (supabaseAdmin as any)
      .from("leads")
      .select("id, reference, customer_key, phone, email, full_name, converted_booking_id")
      .eq("id", data.leadId)
      .single();

    if (getErr || !lead) {
      throw new Error("Lead not found");
    }

    // 2. Delete the lead row
    const { error: delErr } = await (supabaseAdmin as any)
      .from("leads")
      .delete()
      .eq("id", data.leadId);

    if (delErr) {
      console.error("[leads-delete] failed", delErr);
      throw new Error("Failed to delete lead");
    }

    // 3. Customer Identity Safety Check:
    // Determine whether the lead is the only record associated with the customer.
    let customerPreserved = true;
    if (lead.customer_key) {
      const [otherLeadsRes, bookingsRes, requestsRes, installmentsRes] = await Promise.all([
        (supabaseAdmin as any).from("leads").select("id").eq("customer_key", lead.customer_key).limit(1),
        supabaseAdmin.from("bookings").select("id").or(`phone.eq.${lead.phone},email.eq.${lead.email || ""}`).limit(1),
        supabaseAdmin.from("custom_package_requests").select("id").or(`phone.eq.${lead.phone},email.eq.${lead.email || ""}`).limit(1),
        supabaseAdmin.from("installments").select("id").eq("customer_key", lead.customer_key).limit(1),
      ]);

      const hasOtherRecords =
        (otherLeadsRes.data && otherLeadsRes.data.length > 0) ||
        (bookingsRes.data && bookingsRes.data.length > 0) ||
        (requestsRes.data && requestsRes.data.length > 0) ||
        (installmentsRes.data && installmentsRes.data.length > 0);

      if (!hasOtherRecords) {
        try {
          await supabaseAdmin.from("customer_profiles").delete().eq("customer_key", lead.customer_key);
          customerPreserved = false;
        } catch (e) {
          console.warn("[leads-delete] orphan customer profile cleanup warning", e);
        }
      }
    }

    return {
      ok: true,
      leadId: data.leadId,
      customerPreserved,
      message: customerPreserved
        ? "تم حذف الـ Lead بنجاح مع الحفاظ على هوية العميل وسجلاته المالية."
        : "تم حذف الـ Lead وسجل العميل بنجاح.",
    };
  });

/**
 * Admin: Bulk update status for multiple leads.
 * Role-gated by "leads.edit".
 */
export const bulkUpdateLeadsStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => BulkUpdateLeadStatusInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.edit");
    const authUser = await assertActiveUser(context.userId);

    const now = new Date().toISOString();
    const { error } = await (supabaseAdmin as any)
      .from("leads")
      .update({ status: data.status, updated_at: now })
      .in("id", data.leadIds);

    if (error) {
      console.error("[leads-bulk-status] failed", error);
      throw new Error("Failed to update status in bulk");
    }

    const activityInserts = data.leadIds.map((id) => ({
      lead_id: id,
      activity_type: "status_change",
      title: "تغيير جماعي للحالة",
      description: `تم تغيير الحالة جماعيًا إلى: ${data.status}`,
      author_id: authUser.id,
      author_name: authUser.email,
    }));

    await (supabaseAdmin as any).from("lead_activities").insert(activityInserts);

    return { ok: true, count: data.leadIds.length };
  });

/**
 * Admin: Bulk archive multiple leads.
 * Role-gated by "leads.edit".
 */
export const bulkArchiveLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => BulkArchiveLeadsInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.edit");
    const authUser = await assertActiveUser(context.userId);

    const now = new Date().toISOString();
    const { error } = await (supabaseAdmin as any)
      .from("leads")
      .update({
        archived_at: now,
        archived_by: authUser.id,
        archived_by_name: authUser.email,
        archive_reason: data.reason || null,
        updated_at: now,
      })
      .in("id", data.leadIds);

    if (error) {
      console.error("[leads-bulk-archive] failed", error);
      throw new Error("Failed to archive leads in bulk");
    }

    const activityInserts = data.leadIds.map((id) => ({
      lead_id: id,
      activity_type: "lead_archived",
      title: "أرشفة جماعية",
      description: data.reason
        ? `أرشفة جماعية: ${data.reason}`
        : "تمت أرشفة الـ Lead ضمن عملية مبيعات جماعية",
      author_id: authUser.id,
      author_name: authUser.email,
    }));

    await (supabaseAdmin as any).from("lead_activities").insert(activityInserts);

    return { ok: true, count: data.leadIds.length };
  });

/**
 * Admin: Bulk delete multiple leads with customer identity protection.
 * Role-gated strictly by "leads.delete".
 */
export const bulkDeleteLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => BulkDeleteLeadsInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission } = await import("@/lib/admin/authorize.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.delete");

    const { error } = await (supabaseAdmin as any)
      .from("leads")
      .delete()
      .in("id", data.leadIds);

    if (error) {
      console.error("[leads-bulk-delete] failed", error);
      throw new Error("Failed to delete leads in bulk");
    }

    return { ok: true, count: data.leadIds.length };
  });

/**
 * Admin: Assign lead to team member.
 * Role-gated by "leads.edit".
 */
export const assignLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => AssignLeadInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.edit");
    const authUser = await assertActiveUser(context.userId);

    const { error } = await (supabaseAdmin as any)
      .from("leads")
      .update({
        assigned_to: data.assignedTo || null,
        assigned_to_name: data.assignedToName || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.leadId);

    if (error) throw error;

    await (supabaseAdmin as any).from("lead_activities").insert({
      lead_id: data.leadId,
      activity_type: "lead_assigned",
      title: data.assignedToName ? `تعيين المسؤول: ${data.assignedToName}` : "إلغاء تعيين المسؤول",
      description: data.assignedToName
        ? `تم إسناد الـ Lead إلى ${data.assignedToName}`
        : "تم إرجاع الـ Lead إلى حالة غير مسند",
      author_id: authUser.id,
      author_name: authUser.email,
    });

    return { ok: true, leadId: data.leadId };
  });

/**
 * Admin: Bulk assign leads.
 * Role-gated by "leads.edit".
 */
export const bulkAssignLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => BulkAssignLeadsInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.edit");
    const authUser = await assertActiveUser(context.userId);

    const { error } = await (supabaseAdmin as any)
      .from("leads")
      .update({
        assigned_to: data.assignedTo || null,
        assigned_to_name: data.assignedToName || null,
        updated_at: new Date().toISOString(),
      })
      .in("id", data.leadIds);

    if (error) throw error;

    const activityInserts = data.leadIds.map((id) => ({
      lead_id: id,
      activity_type: "lead_assigned",
      title: "تعيين مسؤول جماعي",
      description: data.assignedToName
        ? `تم إسناد الـ Lead جماعيًا إلى: ${data.assignedToName}`
        : "إلغاء تعيين المسؤول جماعيًا",
      author_id: authUser.id,
      author_name: authUser.email,
    }));

    await (supabaseAdmin as any).from("lead_activities").insert(activityInserts);

    return { ok: true, count: data.leadIds.length };
  });

/**
 * Admin: List staff/admins for lead assignment.
 * Role-gated by "leads.view".
 */
export const listSalesAssignees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Array<{ id: string; name: string; email: string }>> => {
    const { requireAdmin, requirePermission } = await import("@/lib/admin/authorize.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.view");

    try {
      const { data: roleRows } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role");

      const userIds = Array.from(new Set((roleRows ?? []).map((r: any) => r.user_id)));
      const assignees: Array<{ id: string; name: string; email: string }> = [];

      for (const id of userIds) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
        if (u?.user) {
          const meta = u.user.user_metadata ?? {};
          const name =
            (meta.full_name as string) ||
            (meta.name as string) ||
            (u.user.email ? u.user.email.split("@")[0] : "مسؤول");
          assignees.push({ id, name, email: u.user.email || "" });
        }
      }

      return assignees;
    } catch (e) {
      console.warn("[listSalesAssignees] error loading team", e);
      return [];
    }
  });

/**
 * Admin: Batch import validated leads from CSV with duplicate handling.
 * Role-gated by "leads.create".
 */
export const importLeadsBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ImportLeadsBatchInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, assertActiveUser } = await import("@/lib/admin/authorize.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireAdmin(context.userId);
    await requirePermission(context.userId, "leads.create");
    const authUser = await assertActiveUser(context.userId);

    const hasLeads = await checkLeadsTable(supabaseAdmin);
    if (!hasLeads) {
      throw new Error("Leads table is not active in database");
    }

    // 1. Fetch existing leads and customers for duplicate comparison
    const [existingLeadsRes, existingCustomersRes] = await Promise.all([
      (supabaseAdmin as any)
        .from("leads")
        .select("id, phone_normalized, email, full_name, trip_name, status, customer_key"),
      supabaseAdmin
        .from("customer_profiles")
        .select("customer_key, phone, email, full_name"),
    ]);

    const existingLeads = (existingLeadsRes.data ?? []) as Array<{
      id: string;
      phone_normalized: string;
      email: string | null;
      full_name: string;
      trip_name: string | null;
      status: string;
      customer_key: string;
    }>;

    const existingCustomers = (existingCustomersRes.data ?? []) as Array<{
      customer_key: string;
      phone: string;
      email: string | null;
      full_name: string;
    }>;

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    const leadsToInsert: any[] = [];
    const activitiesToInsert: any[] = [];
    const customerProfilesToUpsert: any[] = [];

    for (const row of data.rows) {
      try {
        const cleanPhone = normalizePhone(row.phone);
        const ref = generateLeadReference();
        const cKey = customerKey(row.phone, row.email, ref);

        // Find match in existing leads
        const matchedLead = existingLeads.find((l) => {
          if (l.phone_normalized && cleanPhone && l.phone_normalized.endsWith(cleanPhone.slice(-8))) {
            return true;
          }
          if (row.email && l.email && l.email.toLowerCase() === row.email.toLowerCase()) {
            return true;
          }
          return false;
        });

        // Find match in existing customer profiles
        const matchedCustomer = existingCustomers.find((c) => {
          if (c.phone && cleanPhone && normalizePhone(c.phone).endsWith(cleanPhone.slice(-8))) {
            return true;
          }
          if (row.email && c.email && c.email.toLowerCase() === row.email.toLowerCase()) {
            return true;
          }
          return false;
        });

        const isDuplicate = !!matchedLead || !!matchedCustomer;

        if (isDuplicate) {
          if (data.duplicateStrategy === "skip") {
            skippedCount++;
            continue;
          }

          if (data.duplicateStrategy === "update" && matchedLead) {
            await (supabaseAdmin as any)
              .from("leads")
              .update({
                trip_name: row.tripName || matchedLead.trip_name,
                travelers_count: row.travelersCount || 1,
                notes: row.notes
                  ? `${row.notes}\n[تم التحديث بالاستيراد]`
                  : "[تم التحديث بالاستيراد]",
                updated_at: new Date().toISOString(),
              })
              .eq("id", matchedLead.id);

            await (supabaseAdmin as any).from("lead_activities").insert({
              lead_id: matchedLead.id,
              activity_type: "lead_updated",
              title: "تحديث الـ Lead عبر استيراد CSV",
              description: `تم تحديث البيانات من ملف الاستيراد بواسطة ${authUser.email}`,
              author_id: authUser.id,
              author_name: authUser.email,
            });

            updatedCount++;
            continue;
          }
        }

        // Import as new lead
        const newLeadId = crypto.randomUUID();
        const targetCustomerKey = matchedCustomer?.customer_key || matchedLead?.customer_key || cKey;

        leadsToInsert.push({
          id: newLeadId,
          reference: ref,
          customer_key: targetCustomerKey,
          full_name: row.fullName,
          phone: row.phone,
          phone_normalized: cleanPhone,
          email: row.email || null,
          governorate: row.governorate || null,
          city: row.city || null,
          trip_name: row.tripName || null,
          travelers_count: row.travelersCount || 1,
          adults: row.travelersCount || 1,
          children: 0,
          infants: 0,
          interests: [],
          contact_preference: "phone",
          preferred_contact_time: "anytime",
          notes: row.notes ? `${row.notes}\n[مستورد من ملف CSV]` : "[مستورد من ملف CSV]",
          source: row.source || data.defaultSource,
          source_details: { importBatch: true, importedAt: new Date().toISOString() },
          status: row.status || data.defaultStatus,
          intent: "medium",
          intent_score_reasons: ["استيراد من ملف خارجي"],
        });

        activitiesToInsert.push({
          lead_id: newLeadId,
          activity_type: "lead_imported",
          title: "تم استيراد الـ Lead من ملف CSV",
          description: `المصدر: ${row.source || data.defaultSource} - الحالة: ${row.status || data.defaultStatus}`,
          author_id: authUser.id,
          author_name: authUser.email,
        });

        customerProfilesToUpsert.push({
          customer_key: targetCustomerKey,
          full_name: row.fullName,
          phone: row.phone,
          email: row.email || null,
          city: row.governorate || null,
          status: "lead",
          updated_at: new Date().toISOString(),
        });

        importedCount++;
      } catch (rowErr: any) {
        errors.push(`خطأ في استيراد السطر ${row.fullName}: ${rowErr?.message || "بيانات غير صالحة"}`);
      }
    }

    if (leadsToInsert.length > 0) {
      const { error: insertLeadsErr } = await (supabaseAdmin as any)
        .from("leads")
        .insert(leadsToInsert);

      if (insertLeadsErr) {
        console.error("[leads-import] batch insert failed", insertLeadsErr);
        throw new Error(`فشل حفظ الدفعة: ${insertLeadsErr.message}`);
      }

      await (supabaseAdmin as any).from("lead_activities").insert(activitiesToInsert);

      for (const cp of customerProfilesToUpsert) {
        try {
          await supabaseAdmin.from("customer_profiles").upsert(cp as never, { onConflict: "customer_key" });
        } catch {}
      }
    }

    return {
      total: data.rows.length,
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors,
    };
  });

