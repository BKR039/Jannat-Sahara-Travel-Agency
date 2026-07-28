import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type AppRole = "super_admin" | "admin" | "staff";

async function requireSuperAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error) throw new Error("Failed to verify permissions");
  if (!data) throw new Error("Forbidden: super admin required");
}

async function requireAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["super_admin", "admin"]);
  if (error) throw new Error("Failed to verify permissions");
  if (!data || data.length === 0) throw new Error("Forbidden: admin required");
}

/**
 * List admin/staff users with their roles.
 */
export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roleRows, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;

    const userIds = Array.from(new Set((roleRows ?? []).map((r) => r.user_id)));
    const users: Array<{
      id: string;
      email: string | null;
      created_at: string;
      last_sign_in_at: string | null;
      roles: AppRole[];
    }> = [];

    for (const id of userIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
      if (u?.user) {
        users.push({
          id: u.user.id,
          email: u.user.email ?? null,
          created_at: u.user.created_at,
          last_sign_in_at: u.user.last_sign_in_at ?? null,
          roles: (roleRows ?? [])
            .filter((r) => r.user_id === id)
            .map((r) => r.role as AppRole),
        });
      }
    }
    return users;
  });

const InviteInput = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["admin", "staff"]),
});

/**
 * Invite a new admin/staff. Creates the auth user (email invite) and grants role.
 * Only super_admin can call.
 */
export const inviteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InviteInput.parse(d))
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Try to invite via email
    const { data: invited, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
    let userId: string | undefined = invited?.user?.id;

    if (invErr) {
      // User likely already exists — look them up
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
      if (!existing) throw new Error(`Failed to invite user: ${invErr.message}`);
      userId = existing.id;
    }

    if (!userId) throw new Error("Failed to resolve user id");

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: data.role }, { onConflict: "user_id,role" });
    if (roleErr) throw roleErr;

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: (context.claims?.email as string) ?? null,
      action: "invite_admin",
      entity: "user_roles",
      entity_id: userId,
      metadata: { email: data.email, role: data.role },
    });

    return { userId };
  });

const RemoveRoleInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(["super_admin", "admin", "staff"]),
});

export const removeUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RemoveRoleInput.parse(d))
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context.userId);
    if (data.userId === context.userId && data.role === "super_admin") {
      throw new Error("You cannot remove your own super_admin role");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw error;
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: (context.claims?.email as string) ?? null,
      action: "remove_role",
      entity: "user_roles",
      entity_id: data.userId,
      metadata: { role: data.role },
    });
    return { ok: true };
  });

/**
 * Generate a short-lived signed URL for a passport file.
 */
export const getPassportSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("passports")
      .createSignedUrl(data.path, 60 * 30);
    if (error || !signed?.signedUrl) throw new Error("Failed to generate signed URL");
    return { url: signed.signedUrl };
  });

/**
 * Aggregated dashboard KPIs. Runs as admin (RLS is fine, but we use admin for a single roundtrip).
 */
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    async function count(table: string, filters: Array<[string, string, unknown]> = []) {
      let q = supabaseAdmin.from(table as never).select("id", { count: "exact", head: true });
      for (const [col, op, val] of filters) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        q = (q as any)[op](col, val);
      }
      const { count: c } = await q;
      return c ?? 0;
    }

    const [
      packages,
      packagesUmrah,
      packagesTrip,
      packagesFlight,
      packagesVisa,
      bookings,
      bookingsNew,
      bookingsPending,
      bookingsConfirmed,
      bookingsCancelled,
      branches,
      testimonials,
      articles,
      galleryItems,
      contactMessages,
    ] = await Promise.all([
      count("packages", [["status", "eq", "published"]]),
      count("packages", [["status", "eq", "published"], ["category", "eq", "umrah"]]),
      count("packages", [["status", "eq", "published"], ["category", "eq", "trip"]]),
      count("packages", [["status", "eq", "published"], ["category", "eq", "flight"]]),
      count("packages", [["status", "eq", "published"], ["category", "eq", "visa"]]),
      count("bookings"),
      count("bookings", [["status", "eq", "new"]]),
      count("bookings", [["status", "eq", "pending"]]),
      count("bookings", [["status", "eq", "confirmed"]]),
      count("bookings", [["status", "eq", "cancelled"]]),
      count("branches", [["is_active", "eq", true]]),
      count("testimonials", [["active", "eq", true]]),
      count("articles", [["published", "eq", true]]),
      count("gallery_items", [["active", "eq", true]]),
      count("contact_messages", [["handled", "eq", false]]),
    ]);

    // Bookings over the last 12 months
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - 11);
    sinceDate.setDate(1);
    const since = sinceDate.toISOString().slice(0, 10);

    const { data: monthly } = await supabaseAdmin
      .from("bookings")
      .select("created_at, package_category, status")
      .gte("created_at", since);

    const monthlyMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    (monthly ?? []).forEach((row) => {
      const d = new Date(row.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + 1);
      const cat = row.package_category ?? "other";
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
    });

    const monthlySeries: Array<{ month: string; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlySeries.push({ month: key, count: monthlyMap.get(key) ?? 0 });
    }
    const bookingsByCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    return {
      counts: {
        packages,
        packagesUmrah,
        packagesTrip,
        packagesFlight,
        packagesVisa,
        bookings,
        bookingsNew,
        bookingsPending,
        bookingsConfirmed,
        bookingsCancelled,
        branches,
        testimonials,
        articles,
        galleryItems,
        contactMessages,
      },
      monthlySeries,
      bookingsByCategory,
    };
  });
