import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { type AppRole, type PermissionKey, computeEffectivePermissions } from "./permissions";

export type { AppRole, PermissionKey };
export type MemberStatus = "active" | "invited" | "disabled";

export interface AdminUserRecord {
  id: string;
  email: string | null;
  fullName: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: AppRole[];
  disabled: boolean;
  emailConfirmed: boolean;
  status: MemberStatus;
  customPermissions: { permission: string; granted: boolean }[];
  effectivePermissions: PermissionKey[];
}

/**
 * List admin/staff users with their enriched roles, permissions, and status.
 */
export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRecord[]> => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "team.view");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Fetch all roles and permissions
    const [roleRowsRes, permRowsRes] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("user_id, role, created_at")
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("user_permissions")
        .select("user_id, permission, granted")
        .order("created_at", { ascending: true }),
    ]);

    if (roleRowsRes.error) throw roleRowsRes.error;

    const roleRows = roleRowsRes.data ?? [];
    const permRows = permRowsRes.data ?? [];

    const userIds = Array.from(new Set(roleRows.map((r) => r.user_id)));
    const users: AdminUserRecord[] = [];

    for (const id of userIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
      if (u?.user) {
        const isBanned = !!(u.user.banned_until && new Date(u.user.banned_until) > new Date());
        const isDisabled = isBanned || u.user.app_metadata?.disabled === true;
        const meta = u.user.user_metadata ?? {};
        const fullName =
          (meta.full_name as string) ||
          (meta.name as string) ||
          (u.user.email ? u.user.email.split("@")[0] : "مسؤول");

        const userRoles = roleRows.filter((r) => r.user_id === id).map((r) => r.role as AppRole);

        const customPerms = permRows
          .filter((p) => p.user_id === id)
          .map((p) => ({ permission: p.permission, granted: p.granted }));

        const effectivePerms = Array.from(computeEffectivePermissions(userRoles, customPerms));

        const emailConfirmed = !!u.user.email_confirmed_at;
        const lastSignIn = u.user.last_sign_in_at ?? null;

        let status: MemberStatus = "active";
        if (isDisabled) {
          status = "disabled";
        } else if (!lastSignIn && !emailConfirmed) {
          status = "invited";
        }

        users.push({
          id: u.user.id,
          email: u.user.email ?? null,
          fullName,
          created_at: u.user.created_at,
          last_sign_in_at: lastSignIn,
          roles: userRoles,
          disabled: isDisabled,
          emailConfirmed,
          status,
          customPermissions: customPerms,
          effectivePermissions: effectivePerms,
        });
      }
    }
    return users;
  });

const InviteInput = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["super_admin", "admin", "staff"]),
  fullName: z.string().trim().max(100).optional(),
  customPermissions: z
    .array(
      z.object({
        permission: z.string(),
        granted: z.boolean(),
      }),
    )
    .optional(),
});

/**
 * Invite a new team member via secure email invitation.
 * Super Admin or authorized Admin can call.
 */
export const inviteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InviteInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission, getUserEffectivePermissions } =
      await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "team.invite");

    const callerPerms = await getUserEffectivePermissions(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check caller roles
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isCallerSuperAdmin = callerRoles?.some((r) => r.role === "super_admin");

    // Safeguard: Only super_admin can create another super_admin
    if (data.role === "super_admin" && !isCallerSuperAdmin) {
      throw new Error("لا يمكن إلا للمسؤول الرئيسي (Super Admin) إضافة مسؤول رئيسي آخر.");
    }

    let userId: string | undefined;

    // Send secure email invitation through Supabase Auth
    const { data: invited, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      { data: { full_name: data.fullName ?? "" } },
    );
    userId = invited?.user?.id;

    if (invErr) {
      // User likely already exists — look them up safely
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find(
        (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
      );
      if (!existing) throw new Error(`فشل إرسال الدعوة: ${invErr.message}`);
      userId = existing.id;

      // Protection: if existing user has super_admin role, non-super-admin cannot touch them
      const { data: existingRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", existing.id);
      const isExistingSuper = existingRoles?.some((r) => r.role === "super_admin");
      if (isExistingSuper && !isCallerSuperAdmin) {
        throw new Error("لا يمكن تعديل أو دعوة حساب مسؤول رئيسي.");
      }

      if (data.fullName) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { ...existing.user_metadata, full_name: data.fullName },
        });
      }
    }

    if (!userId) throw new Error("تعذر تحديد معرف المستخدم");

    // Assign Role
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: data.role }, { onConflict: "user_id,role" });
    if (roleErr) throw roleErr;

    // Optional initial custom permissions
    if (data.customPermissions && data.customPermissions.length > 0) {
      if (callerPerms.has("security.manage")) {
        for (const p of data.customPermissions) {
          await supabaseAdmin
            .from("user_permissions")
            .upsert(
              { user_id: userId, permission: p.permission, granted: p.granted },
              { onConflict: "user_id,permission" },
            );
        }
      }
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: (context.claims?.email as string) ?? null,
      action: "invite_admin",
      entity: "user_roles",
      entity_id: userId,
      metadata: { email: data.email, role: data.role, fullName: data.fullName },
    });

    return { userId };
  });

const UpdateAdminInput = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().max(100).optional(),
  role: z.enum(["super_admin", "admin", "staff"]),
  email: z.string().trim().email().max(254).optional(),
  disabled: z.boolean().optional(),
});

/**
 * Update member details, role, or active status with strict safeguards.
 */
export const updateAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateAdminInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "team.edit");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: u, error: uErr } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (uErr || !u?.user) throw new Error("المستخدم غير موجود");

    // Check caller roles
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isCallerSuperAdmin = callerRoles?.some((r) => r.role === "super_admin");

    // Check target roles
    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    const isTargetSuperAdmin = targetRoles?.some((r) => r.role === "super_admin");

    // Safeguard: Non-super_admin cannot touch or demote a super_admin
    if (isTargetSuperAdmin && !isCallerSuperAdmin) {
      throw new Error("لا يمكن تعديل حساب مسؤول رئيسي إلا من قبل مسؤول رئيسي آخر.");
    }

    // Safeguard: Non-super_admin cannot promote someone to super_admin
    if (data.role === "super_admin" && !isCallerSuperAdmin) {
      throw new Error("لا يمكن ترقية أي عضو إلى مسؤول رئيسي إلا من قبل مسؤول رئيسي.");
    }

    // Safeguard: Cannot demote the last super_admin
    if (isTargetSuperAdmin && data.role !== "super_admin") {
      const { count: superAdminCount } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin");
      if ((superAdminCount ?? 0) <= 1) {
        throw new Error("لا يمكن تعديل رتبة آخر مسؤول رئيسي (Super Admin) في النظام.");
      }
      if (data.userId === context.userId) {
        throw new Error("لا يمكنك تقليص رتبتك بنفسك.");
      }
    }

    // Safeguard: Cannot disable self or last super_admin
    if (data.disabled === true) {
      if (data.userId === context.userId) {
        throw new Error("لا يمكنك تعطيل حسابك الخاص.");
      }
      if (isTargetSuperAdmin) {
        const { count: superAdminCount } = await supabaseAdmin
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "super_admin");
        if ((superAdminCount ?? 0) <= 1) {
          throw new Error("لا يمكن تعطيل آخر مسؤول رئيسي في النظام.");
        }
      }
    }

    // Update Auth User
    const updatePayload: Parameters<typeof supabaseAdmin.auth.admin.updateUserById>[1] = {
      user_metadata: {
        ...u.user.user_metadata,
        full_name: data.fullName ?? u.user.user_metadata?.full_name ?? "",
      },
    };

    if (data.email && data.email.toLowerCase() !== u.user.email?.toLowerCase()) {
      await requirePermission(context.userId, "team.change_email");
      updatePayload.email = data.email;
      updatePayload.email_confirm = true;
    }

    if (typeof data.disabled === "boolean") {
      await requirePermission(context.userId, "team.deactivate");
      updatePayload.ban_duration = data.disabled ? "876000h" : "none";
      updatePayload.app_metadata = {
        ...u.user.app_metadata,
        disabled: data.disabled,
      };
    }

    const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(
      data.userId,
      updatePayload,
    );
    if (updateAuthErr) throw new Error(`فشل تحديث الحساب: ${updateAuthErr.message}`);

    // Update Role: Clear existing roles and insert target role
    await requirePermission(context.userId, "team.change_role");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error: insertRoleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (insertRoleErr) throw insertRoleErr;

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: (context.claims?.email as string) ?? null,
      action: "update_admin",
      entity: "user_roles",
      entity_id: data.userId,
      metadata: { role: data.role, fullName: data.fullName, disabled: data.disabled },
    });

    return { ok: true };
  });

const UpdatePermissionsInput = z.object({
  userId: z.string().uuid(),
  permissions: z.array(
    z.object({
      permission: z.string(),
      granted: z.boolean(),
    }),
  ),
});

/**
 * Manage custom per-user permissions.
 * Super Admin or security.manage only.
 */
export const updateUserPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdatePermissionsInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireSuperAdmin } = await import("./authorize.server");
    await requireSuperAdmin(context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Replace user permissions
    await supabaseAdmin.from("user_permissions").delete().eq("user_id", data.userId);

    if (data.permissions.length > 0) {
      const inserts = data.permissions.map((p) => ({
        user_id: data.userId,
        permission: p.permission,
        granted: p.granted,
      }));
      const { error: insErr } = await supabaseAdmin.from("user_permissions").insert(inserts);
      if (insErr) throw insErr;
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: (context.claims?.email as string) ?? null,
      action: "update_user_permissions",
      entity: "user_permissions",
      entity_id: data.userId,
      metadata: { permissionsCount: data.permissions.length },
    });

    return { ok: true };
  });

const ToggleStatusInput = z.object({
  userId: z.string().uuid(),
  disabled: z.boolean(),
});

/**
 * Toggle member active/disabled status.
 */
export const toggleAdminStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ToggleStatusInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "team.deactivate");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.userId === context.userId && data.disabled) {
      throw new Error("لا يمكنك تعطيل حسابك الخاص.");
    }

    const { data: u, error: uErr } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (uErr || !u?.user) throw new Error("المستخدم غير موجود");

    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isCallerSuperAdmin = callerRoles?.some((r) => r.role === "super_admin");

    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    const isTargetSuperAdmin = targetRoles?.some((r) => r.role === "super_admin");

    if (isTargetSuperAdmin && !isCallerSuperAdmin) {
      throw new Error("لا يمكن تعديل حالة مسؤول رئيسي إلا من قبل مسؤول رئيسي آخر.");
    }

    if (data.disabled && isTargetSuperAdmin) {
      const { count: superAdminCount } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin");
      if ((superAdminCount ?? 0) <= 1) {
        throw new Error("لا يمكن تعطيل آخر مسؤول رئيسي في النظام.");
      }
    }

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.disabled ? "876000h" : "none",
      app_metadata: {
        ...u.user.app_metadata,
        disabled: data.disabled,
      },
    });
    if (updErr) throw new Error(`فشل تغيير حالة الحساب: ${updErr.message}`);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: (context.claims?.email as string) ?? null,
      action: data.disabled ? "disable_admin" : "enable_admin",
      entity: "auth.users",
      entity_id: data.userId,
      metadata: { disabled: data.disabled },
    });

    return { ok: true, disabled: data.disabled };
  });

const ResetPasswordInput = z.object({
  userId: z.string().uuid(),
});

/**
 * Trigger secure password reset email for a team member.
 * Super Admin or admin with team.reset_password permission.
 * Non-Super-Admins cannot reset Super Admin credentials.
 * Recovery link is NEVER returned in the API response.
 */
export const resetAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResetPasswordInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "team.reset_password");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: u, error: uErr } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (uErr || !u?.user?.email) throw new Error("تعذر العثور على بريد المستخدم.");

    // Enforce role hierarchy: check if caller and target are super_admin
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isCallerSuperAdmin = callerRoles?.some((r) => r.role === "super_admin");

    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    const isTargetSuperAdmin = targetRoles?.some((r) => r.role === "super_admin");

    if (isTargetSuperAdmin && !isCallerSuperAdmin) {
      throw new Error("لا يمكن إعادة تعيين كلمة مرور مسؤول رئيسي إلا من قبل مسؤول رئيسي آخر.");
    }

    // Trigger standard recovery email — never return recovery credentials to the client
    const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(u.user.email);
    if (resetErr) {
      console.error("[admin] resetPasswordForEmail failed", resetErr.message);
      throw new Error("فشل إرسال بريد استعادة كلمة المرور");
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: (context.claims?.email as string) ?? null,
      action: "reset_password_request",
      entity: "auth.users",
      entity_id: data.userId,
      metadata: { target_user_id: data.userId },
    });

    return {
      ok: true,
    };
  });

const DeleteAdminInput = z.object({
  userId: z.string().uuid(),
});

/**
 * Permanently delete a team member and their roles.
 * Super Admin only.
 */
export const deleteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteAdminInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireSuperAdmin } = await import("./authorize.server");
    await requireSuperAdmin(context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.userId === context.userId) {
      throw new Error("لا يمكنك حذف حسابك الخاص.");
    }

    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);

    if (targetRoles?.some((r) => r.role === "super_admin")) {
      const { count: superAdminCount } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin");
      if ((superAdminCount ?? 0) <= 1) {
        throw new Error("لا يمكن حذف آخر مسؤول رئيسي (Super Admin) في النظام.");
      }
    }

    // Delete custom permissions
    await supabaseAdmin.from("user_permissions").delete().eq("user_id", data.userId);

    // Delete roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);

    // Delete auth account
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (delErr) throw new Error(`فشل حذف الحساب: ${delErr.message}`);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: (context.claims?.email as string) ?? null,
      action: "delete_admin",
      entity: "auth.users",
      entity_id: data.userId,
    });

    return { ok: true };
  });

const RemoveRoleInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(["super_admin", "admin", "staff"]),
});

export const removeUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RemoveRoleInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireSuperAdmin } = await import("./authorize.server");
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
 * SEC-12 Remediation: Validates strict path structure, checks bookings.view permission,
 * and verifies that the file exists in bookings/booking_passengers database records.
 */
export const getPassportSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        path: z
          .string()
          .min(1)
          .max(500)
          .refine(
            (p) => /^bookings\/[0-9a-f-]{36}\/passport\.(jpg|jpeg|png|webp|heic|pdf)$/i.test(p),
            "Invalid passport path format",
          ),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "bookings.view");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Anti-IDOR / Path Traversal: Verify the path belongs to an active booking or passenger record
    const [bookingMatch, passengerMatch] = await Promise.all([
      supabaseAdmin.from("bookings").select("id").eq("passport_path", data.path).limit(1),
      supabaseAdmin.from("booking_passengers").select("id").eq("passport_path", data.path).limit(1),
    ]);

    const existsInDb =
      (bookingMatch.data && bookingMatch.data.length > 0) ||
      (passengerMatch.data && passengerMatch.data.length > 0);

    if (!existsInDb) {
      throw new Error("Passport record not found or access denied");
    }

    const { data: signed, error } = await supabaseAdmin.storage
      .from("passports")
      .createSignedUrl(data.path, 60 * 30);
    if (error || !signed?.signedUrl) throw new Error("Failed to generate signed URL");
    return { url: signed.signedUrl };
  });

/**
 * Aggregated dashboard KPIs.
 */
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin, requirePermission } = await import("./authorize.server");
    await requireAdmin(context.userId);
    await requirePermission(context.userId, "dashboard.view");
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
      count("packages", [
        ["status", "eq", "published"],
        ["category", "eq", "umrah"],
      ]),
      count("packages", [
        ["status", "eq", "published"],
        ["category", "eq", "trip"],
      ]),
      count("packages", [
        ["status", "eq", "published"],
        ["category", "eq", "flight"],
      ]),
      count("packages", [
        ["status", "eq", "published"],
        ["category", "eq", "visa"],
      ]),
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
