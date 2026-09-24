import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCustomerProfile, archiveCustomer } from "@/lib/admin/command.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Archive, AlertCircle } from "lucide-react";
import type { CustomerDetail, CustomerLifecycleStatus } from "@/types/customer";

interface CustomerEditModalProps {
  customer: CustomerDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerEditModal({ customer, open, onOpenChange }: CustomerEditModalProps) {
  const qc = useQueryClient();
  const updateProfileFn = useServerFn(updateCustomerProfile);
  const archiveCustomerFn = useServerFn(archiveCustomer);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<CustomerLifecycleStatus>("customer");
  const [branchId, setBranchId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (customer) {
      setName(typeof customer.name === "string" ? customer.name : "");
      setPhone(typeof customer.phone === "string" ? customer.phone : "");
      setEmail(typeof customer.email === "string" ? customer.email : "");
      setCity(typeof customer.city === "string" ? customer.city : "");
      setStatus(customer.status || "customer");
      setBranchId(customer.branchId || null);
      const initialNotes =
        typeof customer.profileNotes === "string"
          ? customer.profileNotes
          : typeof (customer as unknown as { notes?: unknown }).notes === "string"
            ? (customer as unknown as { notes: string }).notes
            : "";
      setNotes(initialNotes);
    }
  }, [customer]);

  const branchesQuery = useQuery({
    queryKey: ["branches-list-simple"],
    queryFn: async () => {
      const { data } = await supabase
        .from("branches")
        .select("id, name, city")
        .eq("is_active", true);
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!customer?.key) return;
      const cleanEmail = typeof email === "string" ? email.trim() : "";
      const safeNotes = typeof notes === "string" ? notes.trim() : "";
      return updateProfileFn({
        data: {
          customerKey: customer.key,
          fullName: (typeof name === "string" ? name.trim() : "") || null,
          phone: (typeof phone === "string" ? phone.trim() : "") || null,
          email: cleanEmail ? cleanEmail : null,
          city: (typeof city === "string" ? city.trim() : "") || null,
          status,
          branchId: branchId || null,
          notes: safeNotes || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("تم تحديث بيانات العميل بنجاح");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["admin-customer", customer?.key] });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "فشل حفظ التعديلات");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (shouldArchive: boolean) => {
      if (!customer?.key) return;
      return archiveCustomerFn({
        data: {
          customerKey: customer.key,
          archived: shouldArchive,
        },
      });
    },
    onSuccess: (_, shouldArchive) => {
      toast.success(
        shouldArchive
          ? "تم أرشفة حساب العميل بنجاح دون حذف سجلاته المالية"
          : "تمت استعادة حساب العميل وتفعيله",
      );
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["admin-customer", customer?.key] });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "فشل تعديل حالة الأرشفة");
    },
  });

  if (!customer) return null;

  const isInactive = customer.status === "inactive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>تعديل ملف العميل</DialogTitle>
          <DialogDescription>
            تحديث المعلومات الشخصية، بيانات الاتصال، المدينة، الفرع التابع وحالة العميل.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3.5 py-3">
          {/* Personal */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">الاسم الكامل</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم العميل الرباعي أو الثلاثي"
              className="text-xs"
            />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">رقم الهاتف</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                placeholder="رقم الهاتف"
                className="text-xs font-mono text-end"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">البريد الإلكتروني</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                placeholder="البريد الإلكتروني"
                className="text-xs text-end"
              />
            </div>
          </div>

          {/* Location & Branch */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">المدينة / الولاية</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="المدينة أو الولاية"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">الفرع المسؤول</Label>
              <Select
                value={branchId ?? "none"}
                onValueChange={(val) => setBranchId(val === "none" ? null : val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="اختر الفرع المسند إليه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون تحديد فرع</SelectItem>
                  {branchesQuery.data?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lifecycle Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">حالة العميل في النظام</Label>
            <Select
              value={status}
              onValueChange={(val) => setStatus(val as CustomerLifecycleStatus)}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">عميل فعلي (حجز سابق أو مؤكد)</SelectItem>
                <SelectItem value="lead">عميل محتمل (طلب جديد أو استفسار)</SelectItem>
                <SelectItem value="vip">عميل VIP (أولوية خاصة)</SelectItem>
                <SelectItem value="inactive">غير نشط / مؤرشف</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Persistent Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">ملاحظات العميل الدائمة</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="تفضيلات السفر، ملاحظات صحية أو طلبات خاصة تظهر في ملف العميل..."
              className="text-xs min-h-[70px]"
            />
          </div>

          {/* Safe Archive Section */}
          <div className="rounded-lg border border-border/80 bg-muted/30 p-3 mt-1">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                  أرشفة حساب العميل
                </p>
                <p className="text-[11px] text-muted-foreground">
                  الأرشفة تحافظ على كافة الحجوزات والسجلات المالية وتخفي العميل من القوائم النشطة.
                </p>
              </div>
              <Button
                type="button"
                variant={isInactive ? "outline" : "ghost"}
                size="sm"
                onClick={() => {
                  if (
                    confirm(
                      isInactive
                        ? "هل ترغب في إعادة تفعيل هذا العميل وإخراجه من الأرشيف؟"
                        : "هل ترغب في أرشفة هذا العميل؟ ستبقى كافة سجلاته المالية وحجوزاته محفوظة.",
                    )
                  ) {
                    archiveMutation.mutate(!isInactive);
                  }
                }}
                disabled={archiveMutation.isPending}
                className="text-xs h-8 shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400"
              >
                {isInactive ? "إلغاء الأرشفة" : "أرشفة العميل"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name.trim()}
          >
            {saveMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
