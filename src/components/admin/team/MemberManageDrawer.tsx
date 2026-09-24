import { useState, useEffect } from "react";
import { Drawer } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusSwitch } from "@/components/admin/kit/StatusSwitch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PermissionMatrixInspector } from "./PermissionMatrixInspector";
import { type AdminUserRecord, type AppRole } from "@/lib/admin/admin.functions";
import { KeyRound, ShieldCheck, User, AlertTriangle, Mail, Calendar, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MemberManageDrawerProps {
  member: AdminUserRecord | null;
  onClose: () => void;
  currentUserId: string | undefined;
  isSuperAdmin: boolean;
  totalSuperAdmins: number;
  onUpdateMember: (payload: {
    userId: string;
    fullName: string;
    email?: string;
    role: AppRole;
    disabled?: boolean;
  }) => Promise<void> | void;
  onToggleStatus: (userId: string, disabled: boolean) => Promise<void> | void;
  onResetPassword: (userId: string) => Promise<{ ok?: boolean } | void>;
  onDeleteMember: (userId: string) => Promise<void> | void;
  onSavePermissions: (
    userId: string,
    permissions: { permission: string; granted: boolean }[],
  ) => Promise<void> | void;
  isUpdating?: boolean;
}

export function MemberManageDrawer({
  member,
  onClose,
  currentUserId,
  isSuperAdmin,
  totalSuperAdmins,
  onUpdateMember,
  onToggleStatus,
  onResetPassword,
  onDeleteMember,
  onSavePermissions,
  isUpdating = false,
}: MemberManageDrawerProps) {
  // Local Form State
  const [fullName, setFullName] = useState(member?.fullName || "");
  const [email, setEmail] = useState(member?.email || "");
  const [role, setRole] = useState<AppRole>(member?.roles[0] ?? "staff");
  const [disabled, setDisabled] = useState(member?.disabled ?? false);

  // Password recovery state
  const [isResetting, setIsResetting] = useState(false);

  // Delete modal state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state when member changes
  useEffect(() => {
    if (member) {
      setFullName(member.fullName || "");
      setEmail(member.email || "");
      setRole(member.roles[0] ?? "staff");
      setDisabled(member.disabled);
    }
  }, [member]);

  if (!member) return null;

  const isSelf = member.id === currentUserId;
  const isTargetSuper = member.roles.includes("super_admin");
  const isLastSuperAdmin = isTargetSuper && totalSuperAdmins <= 1;

  const hasFormChanges =
    fullName.trim() !== (member.fullName || "") ||
    email.trim() !== (member.email || "") ||
    role !== (member.roles[0] ?? "staff") ||
    disabled !== member.disabled;

  async function handleSaveBasicInfo() {
    try {
      await onUpdateMember({
        userId: member!.id,
        fullName: fullName.trim(),
        email: email.trim() !== member!.email ? email.trim() : undefined,
        role,
        disabled,
      });
      toast.success("تم تحديث بيانات العضو بنجاح");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "تعذر حفظ التعديلات");
    }
  }

  async function handleResetPassword() {
    try {
      setIsResetting(true);
      await onResetPassword(member!.id);
      toast.success("تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد المسجل");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل طلب استعادة كلمة المرور");
    } finally {
      setIsResetting(false);
    }
  }

  async function handleDeleteConfirmed() {
    try {
      setIsDeleting(true);
      await onDeleteMember(member!.id);
      toast.success("تم حذف العضو نهائيًا بنجاح");
      setIsDeleteDialogOpen(false);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل حذف الحساب");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Drawer
        open={!!member}
        onClose={onClose}
        title="إدارة العضو والصلاحيات"
        description={member.email ?? member.id}
        footer={
          <div className="flex items-center justify-between gap-2 w-full">
            <div>
              {isLastSuperAdmin && (
                <span className="text-caption text-warning-foreground bg-warning/10 px-2 py-1 rounded-md">
                  مسؤول رئيسي وحيد (محمي)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                إغلاق
              </Button>
              <Button onClick={handleSaveBasicInfo} disabled={isUpdating || !hasFormChanges}>
                {isUpdating ? "جارٍ الحفظ…" : "حفظ التعديلات"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* SECTION 1: IDENTITY */}
          <div className="rounded-xl border border-border-subtle bg-card p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-full text-h5 font-bold uppercase",
                  isTargetSuper
                    ? "bg-primary/15 text-primary ring-2 ring-primary/25"
                    : role === "admin"
                      ? "bg-emerald-500/15 text-emerald-700 ring-2 ring-emerald-500/20"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {fullName ? fullName.charAt(0) : "U"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-body font-bold text-foreground truncate">
                    {fullName || "عضو فريق"}
                  </h3>
                  {isSelf && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-caption font-semibold text-primary">
                      أنت
                    </span>
                  )}
                </div>
                <p className="text-caption text-muted-foreground truncate">{member.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="manage-name">الاسم الكامل</Label>
                <Input
                  id="manage-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="الاسم الكامل للعضو"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="manage-email">البريد الإلكتروني</Label>
                <Input
                  id="manage-email"
                  type="email"
                  dir="ltr"
                  value={email}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@janatsahara.tn"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ACCESS & ROLE */}
          <div className="rounded-xl border border-border-subtle bg-card p-4 shadow-sm space-y-4">
            <h4 className="text-small font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>الدور وحالة الوصول</span>
            </h4>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>الرتبة في النظام</Label>
                {isLastSuperAdmin ? (
                  <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-caption text-warning-foreground">
                    هذا الحساب هو المسؤول الرئيسي الوحيد في النظام. لا يمكن تقليص الرتبة لمنع إغلاق
                    لوحة التحكم.
                  </div>
                ) : (
                  <Select
                    value={role}
                    disabled={!isSuperAdmin}
                    onValueChange={(v) => setRole(v as AppRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">
                        مسؤول رئيسي (Super Admin) — وصول شامل
                      </SelectItem>
                      <SelectItem value="admin">مسؤول (Admin) — تشغيل كامل وحجوزات</SelectItem>
                      <SelectItem value="staff">موظف (Staff) — قراءة فقط واطلاع محدد</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <p className="text-caption text-muted-foreground">
                  {role === "super_admin"
                    ? "يمتلك كافة الصلاحيات بدون قيود، ويدير الفريق وإعدادات الأمان."
                    : role === "admin"
                      ? "يدير الحجوزات والعملاء والباقات ومحتوى الموقع والتقارير."
                      : "وصول تشغيلي مخصص للقراءة، ولا يمكنه التعديل أو الحذف إلا بإذن مخصص."}
                </p>
              </div>

              <div className="rounded-lg border border-border-subtle bg-surface-sunken/30 p-3 flex items-center justify-between">
                <div>
                  <p className="text-small font-semibold text-foreground">حالة الحساب</p>
                  <p className="text-caption text-muted-foreground">
                    عند التعطيل يفقد العضو إمكانية الدخول فوريًا. تبقى الحجوزات والبيانات المسجلة
                    باسمه سليمة.
                  </p>
                </div>
                <StatusSwitch
                  checked={!disabled}
                  disabled={isSelf || isLastSuperAdmin || !isSuperAdmin}
                  activeLabel="نشط"
                  inactiveLabel="معطل"
                  onCheckedChange={(active) => setDisabled(!active)}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: PERMISSION MATRIX */}
          <PermissionMatrixInspector
            role={role}
            customPermissions={member.customPermissions}
            editable={isSuperAdmin}
            onSaveCustomPermissions={(perms) => onSavePermissions(member.id, perms)}
          />

          {/* SECTION 4: SECURITY & RECOVERY */}
          <div className="rounded-xl border border-border-subtle bg-card p-4 shadow-sm space-y-3">
            <h4 className="text-small font-bold text-foreground flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-primary" />
              <span>الأمان والمصادقة</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-caption">
              <div className="rounded-lg border border-border-subtle p-2.5 bg-surface-sunken/20">
                <span className="text-muted-foreground block">تأكيد البريد</span>
                <span
                  className={cn(
                    "font-bold mt-0.5 inline-block",
                    member.emailConfirmed ? "text-emerald-700" : "text-amber-700",
                  )}
                >
                  {member.emailConfirmed ? "مؤكد ومفعل ✓" : "في انتظار التأكيد"}
                </span>
              </div>
              <div className="rounded-lg border border-border-subtle p-2.5 bg-surface-sunken/20">
                <span className="text-muted-foreground block">آخر تسجيل دخول</span>
                <span className="font-semibold text-foreground mt-0.5 inline-block">
                  {member.last_sign_in_at
                    ? new Date(member.last_sign_in_at).toLocaleDateString("ar-TN")
                    : "لم يسجل الدخول"}
                </span>
              </div>
            </div>

            {/* Password Reset Action */}
            <div className="pt-2 border-t border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-small font-semibold text-foreground">
                    إعادة تعيين كلمة المرور
                  </p>
                  <p className="text-caption text-muted-foreground">
                    إرسال رابط استعادة آمن عبر البريد الإلكتروني المسجل للعضو لتعيين كلمة مرور
                    جديدة.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetPassword}
                  disabled={isResetting || !isSuperAdmin}
                >
                  <KeyRound className="me-1.5 h-3.5 w-3.5 text-primary" />
                  <span>{isResetting ? "جارٍ الإرسال…" : "إرسال الرابط للبريد"}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 5: ACTIVITY & METADATA */}
          <div className="rounded-xl border border-border-subtle bg-card p-4 shadow-sm space-y-2 text-caption">
            <h4 className="text-small font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>سجل الحساب</span>
            </h4>
            <div className="flex justify-between py-1 text-muted-foreground border-b border-border/30">
              <span>تاريخ الإنشاء:</span>
              <span className="font-semibold text-foreground">
                {new Date(member.created_at).toLocaleDateString("ar-TN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between py-1 text-muted-foreground">
              <span>معرّف الحساب:</span>
              <span className="font-mono text-[11px] text-foreground/80">{member.id}</span>
            </div>
          </div>

          {/* SECTION 6: DANGER ZONE */}
          {isSuperAdmin && !isSelf && !isLastSuperAdmin && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <h4 className="text-small font-bold text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                <span>منطقة الخطر (إجراءات حساسة)</span>
              </h4>
              <p className="text-caption text-muted-foreground">
                إجراءات الحذف نهائية وتزيل صلاحيات العضو من النظام تمامًا.
              </p>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-small font-semibold text-foreground">حذف الحساب نهائيًا</p>
                  <p className="text-caption text-muted-foreground">
                    إزالة الحساب من المصادقة وسحب كافة الصلاحيات.
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                  حذف الحساب
                </Button>
              </div>
            </div>
          )}
        </div>
      </Drawer>

      {/* ALERT DIALOG: DELETE CONFIRMATION */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              حذف حساب المسؤول نهائيًا؟
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 leading-relaxed">
              <span className="block">
                أنت على وشك حذف حساب العضو{" "}
                <strong className="text-foreground">{member.fullName}</strong> ({member.email}).
              </span>
              <span className="block text-destructive font-semibold">
                سيؤدي هذا إلى إزالة بيانات الدخول وسحب الصلاحيات نهائيًا. الحجوزات والمعاملات
                السابقة المسجلة ستبقى محفوظة في قاعدة البيانات.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirmed}
              disabled={isDeleting}
            >
              {isDeleting ? "جارٍ الحذف…" : "تأكيد الحذف النهائي"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
