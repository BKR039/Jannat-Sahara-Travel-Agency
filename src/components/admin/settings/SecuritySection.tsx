import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  KeyRound,
  ArrowUpRight,
  Lock,
  Server,
  Users,
  CheckCircle2,
  Mail,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listAdmins, resetAdminPassword } from "@/lib/admin/admin.functions";
import { useAdmin } from "@/components/admin/context";
import { SettingsCard, SettingsSection } from "./parts";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function SecuritySection() {
  const { t } = useTranslation("admin");
  const { user, roles, isSuperAdmin } = useAdmin();
  const list = useServerFn(listAdmins);
  const resetFn = useServerFn(resetAdminPassword);

  const admins = useQuery({ queryKey: ["admin-admins"] as const, queryFn: () => list() });
  const [resettingSelf, setResettingSelf] = useState(false);

  async function handleResetSelfPassword() {
    if (!user?.email) return;
    setResettingSelf(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل إرسال رابط الاستعادة";
      toast.error(msg);
    } finally {
      setResettingSelf(false);
    }
  }

  return (
    <SettingsSection
      title={t("content.settings.nav.security.label", "الأمان وصلاحيات الوصول")}
      description="مراقبة حالة الجلسة النشطة، سياسات المصادقة، وإدارة وصول الفريق."
    >
      {/* Card 1: Active Session & Current Admin Identity */}
      <SettingsCard
        title="حالة المصادقة والجلسة الحالية"
        description="تفاصيل الحساب المسجل وحالة الصلاحيات النشطة في النظام."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-4 space-y-1">
            <div className="flex items-center gap-2 text-caption font-semibold text-muted-foreground">
              <Mail className="h-4 w-4 text-primary" />
              البريد الإلكتروني المسجل
            </div>
            <p className="text-small font-bold text-foreground truncate">{user?.email}</p>
            <span className="inline-flex items-center gap-1 text-caption text-emerald-600 font-medium">
              <CheckCircle2 className="h-3 w-3" /> بريد مؤكد
            </span>
          </div>

          <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-4 space-y-1">
            <div className="flex items-center gap-2 text-caption font-semibold text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              الرتبة والصلاحيات
            </div>
            <p className="text-small font-bold text-foreground">
              {isSuperAdmin
                ? "مسؤول رئيسي (Super Admin)"
                : roles?.includes("admin")
                  ? "مسؤول (Admin)"
                  : "موظف (Staff)"}
            </p>
            <span className="text-caption text-muted-foreground">
              {isSuperAdmin
                ? "وصول شامل للوحة التحكم وإدارة الحسابات"
                : "وصول تشغيلي وإدارة المحتوى"}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <Clock className="h-4 w-4" />
            آخر تسجيل دخول:{" "}
            <span className="text-foreground font-medium">
              {user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString("ar-TN")
                : "جلسة حالية"}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetSelfPassword}
            disabled={resettingSelf}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>{resettingSelf ? "جارٍ الإرسال…" : "إعادة تعيين كلمة المرور"}</span>
          </Button>
        </div>
      </SettingsCard>

      {/* Card 2: Team Members Hub Link */}
      <SettingsCard
        title={t("content.settings.security.teamAccessTitle", "فريق العمل وصلاحيات المسؤولين")}
        description="إدارة المسؤولين والموظفين، تعديل الأدوار، تفعيل الحسابات أو تعطيلها."
        actions={
          <Button asChild variant="default" size="sm">
            <Link to="/admin/admins">
              {t("content.settings.security.manageAdmins", "إدارة الفريق والصلاحيات")}
              <ArrowUpRight className="ms-2 h-4 w-4" />
            </Link>
          </Button>
        }
      >
        {admins.isLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : admins.data?.length ? (
          <div className="space-y-3">
            <ul className="grid gap-3 sm:grid-cols-2">
              {admins.data.slice(0, 4).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-sunken/40 px-4 py-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-primary font-bold">
                    {a.fullName ? a.fullName.charAt(0) : "U"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-small font-semibold text-foreground">
                      {a.fullName}
                    </span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {a.email}
                    </span>
                  </div>
                  <span className="text-caption font-semibold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {a.roles.includes("super_admin")
                      ? "رئيسي"
                      : a.roles.includes("admin")
                        ? "مسؤول"
                        : "موظف"}
                  </span>
                </li>
              ))}
            </ul>

            {admins.data.length > 4 && (
              <p className="text-caption text-muted-foreground text-center pt-1">
                + {admins.data.length - 4} أعضاء آخرين في الفريق
              </p>
            )}
          </div>
        ) : (
          <p className="text-small text-muted-foreground">
            {t("content.settings.security.noDashboardUsers", "لا يوجد مسؤولون مسجلون بعد.")}
          </p>
        )}
      </SettingsCard>

      {/* Card 3: Security & Isolation Architecture */}
      <SettingsCard
        title="بنية الأمان وعزل البيانات"
        description="السياسات الأمنية المطبقة لحماية قاعدة البيانات وجلسات المستخدمين."
      >
        <div className="space-y-3 text-small text-muted-foreground leading-relaxed">
          <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-card p-3.5">
            <Server className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">
                عزل الصفوف على مستوى قاعدة البيانات (RLS)
              </p>
              <p className="text-caption mt-0.5">
                تطبق Supabase Row Level Security سياسات عزل دقيقة تمنع أي وصول غير مصرح به أو تعديل
                مباشر للبيانات من المتصفح.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-card p-3.5">
            <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">
                تحقق الصلاحيات على الخادم (Server-Side Authorization)
              </p>
              <p className="text-caption mt-0.5">
                جميع العمليات الحساسة (إنشاء الحسابات، تغيير الصلاحيات، حذف المستخدمين) تخضع للتحقق
                الإلزامي من رتبة المسؤول الرئيسي في الخادم.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-card p-3.5">
            <ShieldCheck className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">سجل تدقيق العمليات (Audit Logging)</p>
              <p className="text-caption mt-0.5">
                تُسجل كافة التعديلات وعمليات تغيير الصلاحيات في سجل تدقيق آمن يوثق هوية المنفذ
                وتاريخ الإجراء.
              </p>
            </div>
          </div>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}
