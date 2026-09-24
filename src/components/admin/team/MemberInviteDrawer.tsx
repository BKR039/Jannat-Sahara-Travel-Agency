import { useState } from "react";
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
import { type AppRole } from "@/lib/admin/admin.functions";
import { UserPlus, Mail } from "lucide-react";

interface MemberInviteDrawerProps {
  open: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
  onInvite: (data: { email: string; role: AppRole; fullName?: string }) => Promise<void> | void;
  isPending?: boolean;
}

export function MemberInviteDrawer({
  open,
  onClose,
  isSuperAdmin,
  onInvite,
  isPending = false,
}: MemberInviteDrawerProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("admin");

  function resetForm() {
    setFullName("");
    setEmail("");
    setRole("admin");
  }

  async function handleSubmit() {
    if (!email.trim()) return;
    await onInvite({
      email: email.trim(),
      role,
      fullName: fullName.trim() || undefined,
    });
    resetForm();
    onClose();
  }

  const isValid = email.trim().length > 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="إضافة عضو جديد إلى الفريق"
      description="قم بدعوة مسؤول أو موظف جديد وعيّن دوره وصلاحياته في النظام."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !isValid}>
            <UserPlus className="me-2 h-4 w-4" />
            <span>{isPending ? "جارٍ الإضافة…" : "إرسال الدعوة"}</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="invite-name">الاسم الكامل</Label>
          <Input
            id="invite-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="الاسم الكامل"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-email">البريد الإلكتروني *</Label>
          <Input
            id="invite-email"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
          />
        </div>

        <div className="space-y-2">
          <Label>الدور والصلاحيات *</Label>
          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {isSuperAdmin && (
                <SelectItem value="super_admin">مسؤول رئيسي (Super Admin) — وصول شامل</SelectItem>
              )}
              <SelectItem value="admin">مسؤول (Admin) — تشغيل كامل وحجوزات</SelectItem>
              <SelectItem value="staff">موظف (Staff) — قراءة فقط واطلاع محدد</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-caption text-muted-foreground leading-relaxed">
            {role === "super_admin"
              ? "يتحكم في إعدادات النظام، المستخدمين، إدارة الفريق، والحذف الكامل."
              : role === "admin"
                ? "يدير الحجوزات، الباقات، الفروع، والمقالات بدون صلاحية إدارة المسؤولين الرئيسيين."
                : "صلاحيات محدودة للتشغيل اليومي ومتابعة العملاء."}
          </p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-small">
            <Mail className="h-4 w-4" />
            <span>دعوة آمنة عبر البريد الإلكتروني</span>
          </div>
          <p className="text-caption text-muted-foreground leading-relaxed">
            سيتم إرسال رابط دعوة آمن ومشفّر لمرة واحدة إلى عنوان البريد الإلكتروني المدخل، ليقوم
            العضو بتسجيل دخوله وتعيين كلمة مرور خاصة به وفقاً لأعلى معايير الأمان (Zero-Knowledge
            Passwords).
          </p>
        </div>
      </div>
    </Drawer>
  );
}
