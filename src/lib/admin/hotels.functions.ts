import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Hotel catalogue administration.
 *
 * Every operation is gated by `requireAdmin` from ./authorize.server — the one
 * authoritative policy established in Phase 1. No client-side role check, no
 * service-role bypass, no per-file notion of "admin".
 *
 * Only the fields the product actually uses are writable: name, city, area,
 * location and active state. The table also carries `stars`, `images`,
 * `distance_to_*` and `amenities`; those are deliberately NOT exposed, because
 * nothing curates them and the Builder does not display them. Exposing a field
 * just because the column exists is how unverified data becomes "agency data".
 */

/** Real areas per city. `suggest` is a Builder fallback, never a hotel's area. */
export const HOTEL_AREAS: Record<string, readonly string[]> = {
  makkah: ["haram_close", "central", "ibrahim_khalil", "ajyad"],
  madinah: ["very_close", "close", "value"],
};

export const HotelInput = z.object({
  name: z.string().trim().min(2).max(160),
  city: z.string().trim().min(1).max(100),
  area: z.string().trim().max(60).optional().nullable(),
  location: z.string().trim().max(500).optional().nullable(),
  stars: z.number().int().min(1).max(5).optional().nullable(),
  description: z.string().trim().max(1500).optional().nullable(),
  images: z.array(z.string().trim()).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  distance_to_haram: z.number().optional().nullable(),
  distance_to_masjid_nabawi: z.number().optional().nullable(),
  active: z.boolean().default(true),
});

export function isMakkahCity(city: string): boolean {
  const c = city.trim().toLowerCase();
  return c === "makkah" || c === "mecca" || c === "مكة" || c === "مكة المكرمة";
}

export function isMadinahCity(city: string): boolean {
  const c = city.trim().toLowerCase();
  return c === "madinah" || c === "medina" || c === "المدينة" || c === "المدينة المنورة";
}

/** The area, when given, is cleaned. */
function normalizeArea(city: string, area: string | null | undefined): string | null {
  const value = (area ?? "").trim();
  if (!value) return null;
  return value;
}

async function writeAudit(
  action: string,
  entityId: string,
  actorId: string,
  actorEmail: string | null,
  metadata: Record<string, unknown>,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId,
    actor_email: actorEmail,
    action,
    entity: "hotels",
    entity_id: entityId,
    metadata: metadata as never,
  });
}

/** Full catalogue including inactive rows — admin view. */
export const listHotels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "hotels.view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("hotels")
      .select(
        "id, name, city, area, location, stars, images, description, latitude, longitude, distance_to_haram, distance_to_masjid_nabawi, active, sort_order, created_at",
      )
      .order("city")
      .order("sort_order")
      .order("name");
    if (error) throw error;

    // How many stored requests point at each hotel — drives delete safety in the UI.
    const { data: refs } = await supabaseAdmin
      .from("custom_package_requests")
      .select("makkah_hotel_id, madinah_hotel_id");

    const usage = new Map<string, number>();
    (refs ?? []).forEach((r) => {
      for (const id of [r.makkah_hotel_id, r.madinah_hotel_id]) {
        if (id) usage.set(id, (usage.get(id) ?? 0) + 1);
      }
    });

    return (data ?? []).map((h) => ({
      ...h,
      images: Array.isArray(h.images) ? (h.images as string[]) : [],
      requestCount: usage.get(h.id) ?? 0,
    }));
  });

export const createHotel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => HotelInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "hotels.create");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const name = data.name.trim();

    // Same name twice in one city is almost always a mistake, not two hotels.
    const { data: clash } = await supabaseAdmin
      .from("hotels")
      .select("id")
      .eq("city", data.city)
      .ilike("name", name)
      .limit(1);
    if (clash && clash.length > 0) throw new Error("HOTEL_DUPLICATE");

    const { data: row, error } = await supabaseAdmin
      .from("hotels")
      .insert({
        name,
        city: data.city,
        area: normalizeArea(data.city, data.area),
        location: data.location?.trim() || null,
        stars: data.stars ?? null,
        description: data.description?.trim() || null,
        images: Array.isArray(data.images) ? data.images.filter(Boolean) : [],
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        distance_to_haram: isMakkahCity(data.city) ? (data.distance_to_haram ?? null) : null,
        distance_to_masjid_nabawi: isMadinahCity(data.city)
          ? (data.distance_to_masjid_nabawi ?? null)
          : null,
        active: data.active,
        source: "agency",
      } as never)
      .select("id")
      .single();
    if (error || !row) throw error ?? new Error("Failed to create hotel");

    await writeAudit(
      "hotel_created",
      row.id,
      context.userId,
      (context.claims?.email as string) ?? null,
      {
        name,
        city: data.city,
      },
    );
    return { id: row.id };
  });

export const updateHotel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => HotelInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "hotels.edit");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const name = data.name.trim();
    const { data: clash } = await supabaseAdmin
      .from("hotels")
      .select("id")
      .eq("city", data.city)
      .ilike("name", name)
      .neq("id", data.id)
      .limit(1);
    if (clash && clash.length > 0) throw new Error("HOTEL_DUPLICATE");

    const { error } = await supabaseAdmin
      .from("hotels")
      .update({
        name,
        city: data.city,
        area: normalizeArea(data.city, data.area),
        location: data.location?.trim() || null,
        stars: data.stars ?? null,
        description: data.description?.trim() || null,
        images: Array.isArray(data.images) ? data.images.filter(Boolean) : [],
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        distance_to_haram: isMakkahCity(data.city) ? (data.distance_to_haram ?? null) : null,
        distance_to_masjid_nabawi: isMadinahCity(data.city)
          ? (data.distance_to_masjid_nabawi ?? null)
          : null,
        active: data.active,
      } as never)
      .eq("id", data.id);
    if (error) throw error;

    // Historical requests keep the hotel name captured at submission time, so
    // renaming here never rewrites what a customer actually asked for.
    await writeAudit(
      "hotel_updated",
      data.id,
      context.userId,
      (context.claims?.email as string) ?? null,
      {
        name,
        city: data.city,
        active: data.active,
      },
    );
    return { ok: true };
  });

export const setHotelActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "hotels.edit");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("hotels")
      .update({ active: data.active } as never)
      .eq("id", data.id);
    if (error) throw error;

    await writeAudit(
      data.active ? "hotel_activated" : "hotel_deactivated",
      data.id,
      context.userId,
      (context.claims?.email as string) ?? null,
      {},
    );
    return { ok: true };
  });

/**
 * Hard delete, refused when the hotel is referenced.
 *
 * The FK is ON DELETE SET NULL, so deleting would blank `makkah_hotel_id` on
 * historical requests. The captured `makkah_hotel_name` text survives, but the
 * link back to the catalogue would be lost silently. Referenced hotels must be
 * deactivated instead — they then disappear from the Builder while every stored
 * request keeps its full history.
 */
export const deleteHotel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "hotels.delete");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countError } = await supabaseAdmin
      .from("custom_package_requests")
      .select("id", { count: "exact", head: true })
      .or(`makkah_hotel_id.eq.${data.id},madinah_hotel_id.eq.${data.id}`);
    if (countError) throw countError;
    if ((count ?? 0) > 0) throw new Error("HOTEL_IN_USE");

    const { error } = await supabaseAdmin.from("hotels").delete().eq("id", data.id);
    if (error) throw error;

    await writeAudit(
      "hotel_deleted",
      data.id,
      context.userId,
      (context.claims?.email as string) ?? null,
      {},
    );
    return { ok: true };
  });
