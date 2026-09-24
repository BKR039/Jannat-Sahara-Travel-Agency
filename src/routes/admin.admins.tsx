import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  UserPlus,
  ShieldCheck,
  User,
  Users,
  CheckCircle2,
  Clock,
  Ban,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Page,
  Panel,
  SearchInput,
  FilterTabs,
  EmptyState,
  ErrorState,
  PermissionGate,
} from "@/components/admin/kit";
import {
  listAdmins,
  inviteAdmin,
  updateAdmin,
  updateUserPermissions,
  toggleAdminStatus,
  resetAdminPassword,
  deleteAdmin,
  type AdminUserRecord,
  type AppRole,
  type MemberStatus,
} from "@/lib/admin/admin.functions";
import { useAdmin } from "@/components/admin/context";
import { MemberManageDrawer } from "@/components/admin/team/MemberManageDrawer";
import { MemberInviteDrawer } from "@/components/admin/team/MemberInviteDrawer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/admins")({
  head: () => ({
    meta: [{ title: adminDocTitle("team") }],
  }),
  component: AdminsPage,
});

type RoleFilter = "all" | "super_admin" | "admin" | "staff";
type StatusFilter = "all" | MemberStatus;

function AdminsPage() {
  const { user: currentUser, isSuperAdmin, hasPermission } = useAdmin();
  const qc = useQueryClient();

  // Server functions
  const listFn = useServerFn(listAdmins);
  const inviteFn = useServerFn(inviteAdmin);
  const updateFn = useServerFn(updateAdmin);
  const updatePermsFn = useServerFn(updateUserPermissions);
  const toggleStatusFn = useServerFn(toggleAdminStatus);
  const resetPasswordFn = useServerFn(resetAdminPassword);
  const deleteFn = useServerFn(deleteAdmin);

  // Queries
  const {
    data: admins = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-admins"] as const,
    queryFn: () => listFn(),
  });

  // State
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Selected member for Manage Drawer
  const [selectedMember, setSelectedMember] = useState<AdminUserRecord | null>(null);

  // Invite Drawer State
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Mutations
  const inviteMut = useMutation({
    mutationFn: (data: { email: string; role: AppRole; fullName?: string }) => inviteFn({ data }),
    onSuccess: () => {
      toast.success("تم إرسال دعوة الانضمام الآمنة إلى بريد العضو");
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (data: {
      userId: string;
      fullName: string;
      email?: string;
      role: AppRole;
      disabled?: boolean;
    }) => updateFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePermsMut = useMutation({
    mutationFn: (data: {
      userId: string;
      permissions: { permission: string; granted: boolean }[];
    }) => updatePermsFn({ data }),
    onSuccess: () => {
      toast.success("تم تحديث الصلاحيات المخصصة للعضو بنجاح");
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatusMut = useMutation({
    mutationFn: ({ userId, disabled }: { userId: string; disabled: boolean }) =>
      toggleStatusFn({ data: { userId, disabled } }),
    onSuccess: (_, vars) => {
      toast.success(vars.disabled ? "تم تعطيل حساب العضو" : "تم تفعيل حساب العضو بنجاح");
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPasswordMut = useMutation({
    mutationFn: (userId: string) => resetPasswordFn({ data: { userId } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Calculate Counts
  const counts = useMemo(() => {
    let superAdmin = 0;
    let admin = 0;
    let staff = 0;
    let active = 0;
    let invited = 0;
    let disabled = 0;

    for (const a of admins) {
      if (a.roles.includes("super_admin")) superAdmin++;
      else if (a.roles.includes("admin")) admin++;
      else staff++;

      if (a.status === "disabled") disabled++;
      else if (a.status === "invited") invited++;
      else active++;
    }

    return {
      total: admins.length,
      superAdmin,
      admin,
      staff,
      active,
      invited,
      disabled,
    };
  }, [admins]);

  // Keep selectedMember in sync with updated list
  const activeMember = useMemo(() => {
    if (!selectedMember) return null;
    return admins.find((a) => a.id === selectedMember.id) ?? selectedMember;
  }, [admins, selectedMember]);

  // Filtered members list
  const filtered = useMemo(() => {
    return admins.filter((a) => {
      // Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = a.fullName.toLowerCase().includes(q);
        const matchEmail = a.email?.toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }

      // Role filter
      if (roleFilter !== "all") {
        if (!a.roles.includes(roleFilter)) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        if (a.status !== statusFilter) return false;
      }

      return true;
    });
  }, [admins, search, roleFilter, statusFilter]);

  const canInvite = isSuperAdmin || hasPermission("team.invite");

  return (
    <PermissionGate permission="team.view" asPage pageTitle="فريق العمل والمسؤولون">
      <Page
        title="فريق العمل والمسؤولون"
        description="إدارة حسابات الفريق وصلاحيات الوصول، دعوة الأعضاء، والتحكم الآمن في الأدوار."
        actions={
          canInvite && (
            <Button onClick={() => setIsInviteOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              <span>إضافة عضو جديد</span>
            </Button>
          )
        }
      >
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
            <div className="rounded-card border border-border-subtle bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-caption text-muted-foreground">إجمالي الفريق</span>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-h4 font-bold tabular-nums text-foreground">{counts.total}</p>
            </div>

            <div className="rounded-card border border-border-subtle bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-caption text-emerald-700">حسابات نشطة</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-h4 font-bold tabular-nums text-emerald-600">
                {counts.active}
              </p>
            </div>

            <div className="rounded-card border border-border-subtle bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-caption text-sky-700">في انتظار التفعيل</span>
                <Clock className="h-4 w-4 text-sky-600" />
              </div>
              <p className="mt-1 text-h4 font-bold tabular-nums text-sky-600">{counts.invited}</p>
            </div>

            <div className="rounded-card border border-border-subtle bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-caption text-destructive">حسابات معطلة</span>
                <Ban className="h-4 w-4 text-destructive" />
              </div>
              <p className="mt-1 text-h4 font-bold tabular-nums text-destructive">
                {counts.disabled}
              </p>
            </div>

            <div className="hidden xl:block rounded-card border border-border-subtle bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-caption text-primary">مسؤول رئيسي</span>
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-1 text-h4 font-bold tabular-nums text-primary">
                {counts.superAdmin}
              </p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="ابحث بالاسم أو البريد الإلكتروني…"
                className="w-full sm:w-72"
              />
              <FilterTabs
                value={roleFilter}
                onChange={setRoleFilter}
                tabs={[
                  { value: "all", label: "كافة الرتب", count: counts.total },
                  { value: "super_admin", label: "مسؤول رئيسي", count: counts.superAdmin },
                  { value: "admin", label: "مسؤول", count: counts.admin },
                  { value: "staff", label: "موظف", count: counts.staff },
                ]}
              />
            </div>
            <FilterTabs
              value={statusFilter}
              onChange={setStatusFilter}
              tabs={[
                { value: "all", label: "كافة الحالات" },
                { value: "active", label: "نشط", count: counts.active },
                { value: "invited", label: "مدعو", count: counts.invited },
                { value: "disabled", label: "معطل", count: counts.disabled },
              ]}
            />
          </div>

          {/* Members Table */}
          <Panel>
            {isLoading ? (
              <div className="space-y-4 py-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <ErrorState onRetry={() => refetch()} />
            ) : !admins.length ? (
              <EmptyState
                title="لا يوجد أعضاء في الفريق بعد"
                description="أضف أو ادعُ مسؤولين وموظفين لإدارة عمليات وكالة جنة الصحراء."
                icon={User}
                action={
                  canInvite && (
                    <Button onClick={() => setIsInviteOpen(true)}>
                      <UserPlus className="me-2 h-4 w-4" />
                      إضافة عضو جديد
                    </Button>
                  )
                }
              />
            ) : !filtered.length ? (
              <EmptyState
                title="لا توجد نتائج مطابقة"
                description="جرّب تعديل كلمة البحث أو إزالة عوامل التصفية."
                icon={User}
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setRoleFilter("all");
                      setStatusFilter("all");
                    }}
                  >
                    إعادة ضبط التصفية
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto -mx-4 sm:-mx-5">
                <table className="w-full text-small">
                  <thead>
                    <tr className="border-b border-border text-start text-caption font-semibold text-muted-foreground">
                      <th className="px-4 sm:px-5 py-3 text-start">العضو</th>
                      <th className="px-4 py-3 text-start">الدور</th>
                      <th className="px-4 py-3 text-start">حالة الحساب</th>
                      <th className="px-4 py-3 text-start">البريد الإلكتروني</th>
                      <th className="px-4 py-3 text-start">آخر تسجيل دخول</th>
                      <th className="px-4 sm:px-5 py-3 text-end">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filtered.map((member) => {
                      const isSelf = member.id === currentUser?.id;
                      const isSuper = member.roles.includes("super_admin");

                      return (
                        <tr
                          key={member.id}
                          className={cn(
                            "transition-colors hover:bg-muted/30",
                            member.status === "disabled" && "bg-muted/15 opacity-80",
                          )}
                        >
                          {/* Member Identity */}
                          <td className="px-4 sm:px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold uppercase",
                                  isSuper
                                    ? "bg-primary/15 text-primary ring-2 ring-primary/25"
                                    : member.roles.includes("admin")
                                      ? "bg-emerald-500/15 text-emerald-700"
                                      : "bg-muted text-muted-foreground",
                                )}
                              >
                                {member.fullName ? member.fullName.charAt(0) : "U"}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground truncate">
                                    {member.fullName}
                                  </span>
                                  {isSelf && (
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-caption font-medium text-primary">
                                      أنت
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="block text-caption text-muted-foreground truncate"
                                  dir="ltr"
                                >
                                  {member.email ?? member.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1.5">
                              {member.roles.map((r) => (
                                <span
                                  key={r}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-bold",
                                    r === "super_admin"
                                      ? "bg-primary/15 text-primary border border-primary/30"
                                      : r === "admin"
                                        ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                                        : "bg-muted text-muted-foreground border border-border",
                                  )}
                                >
                                  <ShieldCheck className="h-3 w-3" />
                                  {r === "super_admin"
                                    ? "مسؤول رئيسي"
                                    : r === "admin"
                                      ? "مسؤول"
                                      : "موظف"}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Account Status Badge */}
                          <td className="px-4 py-3.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-bold",
                                member.status === "active" &&
                                  "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30",
                                member.status === "invited" &&
                                  "bg-sky-500/15 text-sky-700 border border-sky-500/30",
                                member.status === "disabled" &&
                                  "bg-destructive/15 text-destructive border border-destructive/30",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  member.status === "active" && "bg-emerald-600",
                                  member.status === "invited" && "bg-sky-600",
                                  member.status === "disabled" && "bg-destructive",
                                )}
                              />
                              {member.status === "active"
                                ? "نشط"
                                : member.status === "invited"
                                  ? "مدعو"
                                  : "معطل"}
                            </span>
                          </td>

                          {/* Email Verification Status */}
                          <td className="px-4 py-3.5 text-caption">
                            {member.emailConfirmed ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                مؤكد
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                                <Clock className="h-3.5 w-3.5" />
                                غير مؤكد
                              </span>
                            )}
                          </td>

                          {/* Last Sign In */}
                          <td className="px-4 py-3.5 text-caption text-muted-foreground">
                            {member.last_sign_in_at ? (
                              <div>
                                <p className="text-foreground/90 font-medium">
                                  {new Date(member.last_sign_in_at).toLocaleDateString("ar-TN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {new Date(member.last_sign_in_at).toLocaleTimeString("ar-TN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60">لم يسجل الدخول بعد</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 sm:px-5 py-3.5 text-end">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setSelectedMember(member)}
                            >
                              <Settings2 className="h-3.5 w-3.5 text-primary" />
                              <span>إدارة</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Member Details & Management Drawer */}
        <MemberManageDrawer
          member={activeMember}
          onClose={() => setSelectedMember(null)}
          currentUserId={currentUser?.id}
          isSuperAdmin={isSuperAdmin}
          totalSuperAdmins={counts.superAdmin}
          onUpdateMember={async (payload) => {
            await updateMut.mutateAsync(payload);
          }}
          onToggleStatus={async (userId, disabled) => {
            await toggleStatusMut.mutateAsync({ userId, disabled });
          }}
          onResetPassword={async (userId) => {
            return await resetPasswordMut.mutateAsync(userId);
          }}
          onDeleteMember={async (userId) => {
            await deleteMut.mutateAsync(userId);
          }}
          onSavePermissions={async (userId, permissions) => {
            await updatePermsMut.mutateAsync({ userId, permissions });
          }}
          isUpdating={updateMut.isPending || toggleStatusMut.isPending}
        />

        {/* Invite Member Drawer */}
        <MemberInviteDrawer
          open={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          isSuperAdmin={isSuperAdmin}
          onInvite={async (data) => {
            await inviteMut.mutateAsync(data);
          }}
          isPending={inviteMut.isPending}
        />
      </Page>
    </PermissionGate>
  );
}
