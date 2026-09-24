import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  Phone,
  MessageCircle,
  Mail,
  CalendarCheck,
  CreditCard,
  History,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Building2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  CheckCircle2,
  Compass,
  Plane,
  Inbox,
  UserCheck,
  Receipt,
  Wallet,
  Banknote,
  CheckCheck,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer,
  EmptyState,
  ErrorState,
  SkeletonRows,
  relativeDate,
  shortDate,
} from "@/components/admin/kit";
import {
  addCustomerNote,
  deleteCustomerNote,
  addInstallment,
  deleteInstallment,
  getCustomer,
  toggleInstallment,
  recordPayment,
  updateInstallment,
} from "@/lib/admin/command.functions";
import { keySource } from "@/lib/admin/customer-identity";
import { formatMoney } from "@/lib/localize";
import { CustomerEditModal } from "./CustomerEditModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CustomerDetail, CustomerInstallment } from "@/types/customer";

interface CustomerWorkspaceDrawerProps {
  customerKey: string | undefined;
  onClose: () => void;
}

const cleanPhoneDigits = (phone: string | null | undefined) => (phone ?? "").replace(/[^\d+]/g, "");

export function CustomerWorkspaceDrawer({
  customerKey: key,
  onClose,
}: CustomerWorkspaceDrawerProps) {
  const qc = useQueryClient();
  const fetchCustomer = useServerFn(getCustomer);
  const toggleInstFn = useServerFn(toggleInstallment);
  const addInstFn = useServerFn(addInstallment);
  const deleteInstFn = useServerFn(deleteInstallment);
  const recordPaymentFn = useServerFn(recordPayment);
  const updateInstFn = useServerFn(updateInstallment);
  const addNoteFn = useServerFn(addCustomerNote);
  const deleteNoteFn = useServerFn(deleteCustomerNote);

  const [activeTab, setActiveTab] = useState<string>("trips");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingInstallment, setIsAddingInstallment] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  // Payment confirmation dialog for marking an installment paid
  const [pendingInstallmentId, setPendingInstallmentId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<string>("cash");
  const [payNote, setPayNote] = useState<string>("");

  // Direct Payment Recording state
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [directPayAmount, setDirectPayAmount] = useState("");
  const [directPayDate, setDirectPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [directPayBookingId, setDirectPayBookingId] = useState<string | null>(null);
  const [directPayMethod, setDirectPayMethod] = useState("cash");
  const [directPayNote, setDirectPayNote] = useState("");
  const [directPayIsFull, setDirectPayIsFull] = useState(false);
  const [directPayTitle, setDirectPayTitle] = useState("");

  // Edit Installment / Payment dialog state
  const [editingInstallment, setEditingInstallment] = useState<CustomerInstallment | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPaidAt, setEditPaidAt] = useState("");
  const [editMethod, setEditMethod] = useState("cash");
  const [editNote, setEditNote] = useState("");
  const [editStatus, setEditStatus] = useState<"pending" | "paid" | "overdue" | "cancelled">(
    "pending",
  );

  // Add Installment dialog state
  const [instTitle, setInstTitle] = useState("");
  const [instAmount, setInstAmount] = useState("");
  const [instDueDate, setInstDueDate] = useState("");
  const [instBookingId, setInstBookingId] = useState<string | null>(null);
  const [instNote, setInstNote] = useState("");

  const detailQuery = useQuery({
    queryKey: ["admin-customer", key] as const,
    queryFn: () => fetchCustomer({ data: { key: key as string } }),
    enabled: !!key,
    staleTime: 10_000,
  });

  const customer = detailQuery.data as unknown as CustomerDetail | undefined;

  // Toggle Installment Paid Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      paid,
      method,
      note,
    }: {
      id: string;
      paid: boolean;
      method?: string;
      note?: string;
    }) => {
      return toggleInstFn({
        data: {
          installmentId: id,
          paid,
          paymentMethod: method || "cash",
          note: note || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("تم تحديث حالة القسط وإعادة احتساب الرصيد بنجاح");
      setPendingInstallmentId(null);
      setPayNote("");
      qc.invalidateQueries({ queryKey: ["admin-customer", key] });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "فشل تحديث حالة القسط");
    },
  });

  // Add Installment Mutation
  const addInstMutation = useMutation({
    mutationFn: async () => {
      if (!key) throw new Error("Customer key missing");
      const amt = Number(instAmount);
      if (Number.isNaN(amt) || amt <= 0) throw new Error("يرجى إدخال مبلغ صحيح");
      if (!instTitle.trim()) throw new Error("يرجى إدخال عنوان القسط");

      return addInstFn({
        data: {
          customerKey: key,
          bookingId: instBookingId || null,
          title: instTitle.trim(),
          amount: amt,
          dueDate: instDueDate || null,
          note: instNote.trim() || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("تمت إضافة القسط بنجاح");
      setIsAddingInstallment(false);
      setInstTitle("");
      setInstAmount("");
      setInstDueDate("");
      setInstNote("");
      qc.invalidateQueries({ queryKey: ["admin-customer", key] });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (err: Error) => toast.error(err.message || "فشل إضافة القسط"),
  });

  // Delete Installment Mutation
  const deleteInstMutation = useMutation({
    mutationFn: async (installmentId: string) => {
      return deleteInstFn({ data: { installmentId } });
    },
    onSuccess: () => {
      toast.success("تم حذف القسط وتحديث الرصيد");
      qc.invalidateQueries({ queryKey: ["admin-customer", key] });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (err: Error) => toast.error(err.message || "فشل حذف القسط"),
  });

  // Record Direct Payment Mutation (Full Payment or Partial Payment)
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!key) throw new Error("Customer key missing");
      const amt = Number(directPayAmount);
      if (Number.isNaN(amt) || amt <= 0) throw new Error("يجب أن يكون مبلغ الدفعة أكبر من صفر");

      if (directPayBookingId) {
        const b = customer?.bookingRows?.find((item) => item.id === directPayBookingId);
        if (b) {
          const rem = Math.max(0, Number(b.total_price ?? 0) - Number(b.paid_amount ?? 0));
          if (amt > rem + 0.01) {
            throw new Error("المبلغ يتجاوز المبلغ المتبقي.");
          }
        }
      }

      return recordPaymentFn({
        data: {
          customerKey: key,
          bookingId: directPayBookingId || null,
          amount: amt,
          paymentDate: directPayDate || null,
          paymentMethod: directPayMethod || "cash",
          note: directPayNote.trim() || null,
          title: directPayTitle.trim() || undefined,
          isFullPayment: directPayIsFull,
        },
      });
    },
    onSuccess: () => {
      toast.success("تم تسجيل الدفعة وتحديث الحساب بنجاح");
      setIsRecordingPayment(false);
      setDirectPayAmount("");
      setDirectPayNote("");
      setDirectPayTitle("");
      qc.invalidateQueries({ queryKey: ["admin-customer", key] });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "فشل تسجيل الدفعة");
    },
  });

  // Edit Installment / Payment Mutation
  const updateInstallmentMutation = useMutation({
    mutationFn: async () => {
      if (!editingInstallment) return;
      const amt = Number(editAmount);
      if (Number.isNaN(amt) || amt <= 0)
        throw new Error("يجب أن يكون مبلغ القسط أو الدفعة أكبر من صفر");

      return updateInstFn({
        data: {
          installmentId: editingInstallment.id,
          title: editTitle.trim() || undefined,
          amount: amt,
          dueDate: editDueDate || null,
          paidAt: editPaidAt || null,
          paymentMethod: editMethod || null,
          note: editNote.trim() || null,
          status: editStatus,
        },
      });
    },
    onSuccess: () => {
      toast.success("تم حفظ التعديلات وتحديث الرصيد بنجاح");
      setEditingInstallment(null);
      qc.invalidateQueries({ queryKey: ["admin-customer", key] });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "فشل تعديل القسط أو الدفعة");
    },
  });

  // Add Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!key || !newNoteText.trim()) return;
      return addNoteFn({ data: { key, note: newNoteText.trim() } });
    },
    onSuccess: () => {
      toast.success("تمت إضافة الملاحظة بنجاح");
      setNewNoteText("");
      setIsAddingNote(false);
      qc.invalidateQueries({ queryKey: ["admin-customer", key] });
    },
    onError: (err: Error) => toast.error(err.message || "فشل حفظ الملاحظة"),
  });

  // Delete Note Mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return deleteNoteFn({ data: { noteId } });
    },
    onSuccess: () => {
      toast.success("تم حذف الملاحظة");
      qc.invalidateQueries({ queryKey: ["admin-customer", key] });
    },
    onError: (err: Error) => toast.error(err.message || "فشل حذف الملاحظة"),
  });

  // Archive Customer Mutation
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const archiveCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!customer?.key) return;
      const { archiveRecordFn } = await import("@/lib/admin/archive.functions");
      return archiveRecordFn({
        data: {
          entityType: "client",
          subType: "customer_profile",
          id: customer.key,
          reason: "أرشفة العميل من ملف CRM",
        },
      });
    },
    onSuccess: () => {
      toast.success("تم نقل العميل إلى الأرشيف بنجاح");
      setIsArchiveDialogOpen(false);
      onClose();
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (err: Error) => toast.error(err.message || "فشل نقل العميل للأرشيف"),
  });

  const phoneDigits = cleanPhoneDigits(customer?.phone);

  return (
    <>
      <Drawer
        open={!!key}
        onClose={onClose}
        title={customer?.name ?? "ملف العميل الموحد (CRM)"}
        description={key ? `المعرّف الداخلي: ${key} (${keySource(key)})` : undefined}
      >
        {detailQuery.isLoading ? (
          <SkeletonRows rows={8} />
        ) : detailQuery.isError ? (
          <ErrorState onRetry={() => detailQuery.refetch()} />
        ) : !customer ? (
          <EmptyState icon={Users} title="لم يتم العثور على العميل" />
        ) : (
          <div className="space-y-6">
            {/* Top Section: Client Profile Card & Quick Communications */}
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">{customer.name}</h2>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold",
                        customer.status === "vip"
                          ? "border-purple-500/30 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300"
                          : customer.status === "customer"
                            ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                            : customer.status === "lead"
                              ? "border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                              : customer.status === "inactive"
                                ? "border-muted-foreground/30 bg-muted text-muted-foreground"
                                : "border-border text-foreground",
                      )}
                    >
                      {customer.status === "vip"
                        ? "عميل VIP"
                        : customer.status === "customer"
                          ? "عميل مؤكد"
                          : customer.status === "lead"
                            ? "طلب جديد"
                            : customer.status === "inactive"
                              ? "أرشيف / غير نشط"
                              : customer.status}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {customer.phone && (
                      <span className="font-mono text-foreground font-medium" dir="ltr">
                        {customer.phone}
                      </span>
                    )}
                    {customer.email && <span className="text-foreground/80">{customer.email}</span>}
                    {customer.city && (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {customer.city}
                      </span>
                    )}
                    {customer.branchName && (
                      <span className="inline-flex items-center gap-1 font-medium text-primary">
                        <Building2 className="h-3 w-3" />
                        فرع {customer.branchName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {phoneDigits && (
                    <Button asChild size="xs" variant="outline">
                      <a href={`tel:${phoneDigits}`}>
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        اتصال
                      </a>
                    </Button>
                  )}
                  {phoneDigits && (
                    <Button
                      asChild
                      size="xs"
                      variant="outline"
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={`https://wa.me/${phoneDigits.replace(/^\+/, "")}`}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        واتساب
                      </a>
                    </Button>
                  )}
                  {customer.email && (
                    <Button asChild size="xs" variant="outline">
                      <a href={`mailto:${customer.email}`}>
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        بريد
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingProfile(true)}
                    className="h-8 gap-1 text-xs font-medium"
                  >
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                    تعديل الملف
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsArchiveDialogOpen(true)}
                    className="h-8 gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    أرشفة العميل
                  </Button>
                </div>
              </div>

              {/* Financial Metrics Summary Ribbon */}
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/50 pt-3 sm:grid-cols-4">
                <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                  <p className="text-[11px] font-medium text-muted-foreground">عدد الحجوزات</p>
                  <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">
                    {customer.bookings}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                  <p className="text-[11px] font-medium text-muted-foreground">إجمالي القيمة</p>
                  <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">
                    {formatMoney(customer.totalSpent, customer.currency)}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-center">
                  <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                    المدفوع
                  </p>
                  <p className="mt-0.5 text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatMoney(customer.totalPaid, customer.currency)}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-center">
                  <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                    المتبقي
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-base font-bold tabular-nums",
                      customer.totalRemaining > 0
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatMoney(customer.totalRemaining, customer.currency)}
                  </p>
                </div>
              </div>

              {/* Direct Financial Quick Action Bar */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                  <span>
                    حالة السداد:{" "}
                    <strong
                      className={cn(
                        customer.totalRemaining === 0 && customer.totalSpent > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : customer.totalPaid > 0
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {customer.totalRemaining === 0 && customer.totalSpent > 0
                        ? "مسدد بالكامل"
                        : customer.totalPaid > 0
                          ? "مسدد جزئياً"
                          : "غير مسدد"}
                    </strong>
                  </span>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    const defaultBooking = customer.bookingRows?.[0];
                    setDirectPayBookingId(defaultBooking?.id ?? null);
                    const remaining = defaultBooking
                      ? Math.max(
                          0,
                          Number(defaultBooking.total_price ?? 0) -
                            Number(defaultBooking.paid_amount ?? 0),
                        )
                      : customer.totalRemaining;
                    setDirectPayIsFull(true);
                    setDirectPayAmount(remaining > 0 ? String(remaining) : "");
                    setDirectPayDate(new Date().toISOString().split("T")[0]);
                    setDirectPayMethod("cash");
                    setDirectPayNote("");
                    setDirectPayTitle("سداد كامل للحجز");
                    setIsRecordingPayment(true);
                  }}
                  className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  تسجيل دفعة جديدة
                </Button>
              </div>

              {customer.profileNotes && (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-foreground/90">
                  <span className="font-semibold text-primary block mb-0.5">ملاحظات العميل:</span>
                  {customer.profileNotes}
                </div>
              )}
            </div>

            {/* Modular Workspace Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-muted/70 p-1 text-xs">
                <TabsTrigger value="trips" className="gap-1.5 py-1.5 text-xs">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">الحجوزات</span> (
                  {customer.bookingRows?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="installments" className="gap-1.5 py-1.5 text-xs">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">الأقساط</span> (
                  {customer.installments?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="requests" className="gap-1.5 py-1.5 text-xs">
                  <Inbox className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">الطلبات</span> (
                  {(customer.customRows?.length ?? 0) + (customer.flightRows?.length ?? 0)})
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-1.5 py-1.5 text-xs">
                  <History className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">السجل</span> ({customer.timeline?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-1.5 py-1.5 text-xs">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">ملاحظات</span> (
                  {customer.internalNotes?.length ?? 0})
                </TabsTrigger>
              </TabsList>

              {/* ----------------- TAB 1: Trips, Bookings & Passenger Passports ----------------- */}
              <TabsContent value="trips" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      الحجوزات وقوائم المسافرين
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      تفاصيل البرامج السياحية المسجلة مع بيانات الجوازات للمسافرين.
                    </p>
                  </div>
                </div>

                {!customer.bookingRows || customer.bookingRows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 p-8 text-center">
                    <Compass className="mx-auto h-8 w-8 text-muted-foreground/60" />
                    <p className="mt-2 text-sm font-medium text-foreground">
                      لا توجد حجوزات رسمية بعد
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      ستظهر كافة الحجوزات المسجلة لهذا العميل هنا مع تفاصيل المبالغ والمسافرين.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customer.bookingRows.map((b) => {
                      const total = Number(b.total_price ?? 0);
                      const paid = Number(b.paid_amount ?? 0);
                      const remaining = Math.max(0, total - paid);
                      const travellersCount =
                        (b.people ?? (b.adults ?? 0) + (b.children ?? 0) + (b.infants ?? 0)) || 1;

                      return (
                        <div
                          key={b.id}
                          className="rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-foreground text-sm">
                                  {b.package_title || "حجز رحلة سياحية"}
                                </h4>
                                <a
                                  href={`/admin/bookings?booking=${b.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                                  title="فتح ملف الحجز الرئيسي"
                                >
                                  فتح الحجز
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>عدد المسافرين: {travellersCount}</span>
                                <span>تاريخ الحجز: {shortDate(b.created_at)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  b.status === "confirmed" || b.status === "completed"
                                    ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                    : b.status === "cancelled"
                                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                                      : "border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
                                )}
                              >
                                {b.status === "confirmed"
                                  ? "مؤكد"
                                  : b.status === "completed"
                                    ? "مكتمل"
                                    : b.status === "cancelled"
                                      ? "ملغي"
                                      : "قيد المتابعة"}
                              </Badge>

                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  b.payment_status === "paid"
                                    ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                    : b.payment_status === "partially_paid"
                                      ? "border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                                      : "border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
                                )}
                              >
                                {b.payment_status === "paid"
                                  ? "مدفوع بالكامل"
                                  : b.payment_status === "partially_paid"
                                    ? "مدفوع جزئياً"
                                    : "غير مدفوع"}
                              </Badge>
                            </div>
                          </div>

                          {/* Financials Breakdown for this Booking */}
                          <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-center">
                            <div>
                              <span className="text-[11px] text-muted-foreground">
                                السعر الإجمالي
                              </span>
                              <p className="font-bold tabular-nums text-foreground">
                                {formatMoney(total, b.currency ?? "TND")}
                              </p>
                            </div>
                            <div>
                              <span className="text-[11px] text-muted-foreground">
                                المبلغ المسدد
                              </span>
                              <p className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                {formatMoney(paid, b.currency ?? "TND")}
                              </p>
                            </div>
                            <div>
                              <span className="text-[11px] text-muted-foreground">المتبقي</span>
                              <p
                                className={cn(
                                  "font-bold tabular-nums",
                                  remaining > 0
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-muted-foreground",
                                )}
                              >
                                {formatMoney(remaining, b.currency ?? "TND")}
                              </p>
                            </div>
                          </div>

                          {/* Passengers and Passports Details */}
                          {b.passengers && b.passengers.length > 0 && (
                            <div className="mt-3.5 border-t border-border/50 pt-3">
                              <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                                <UserCheck className="h-3.5 w-3.5" />
                                بيانات المسافرين وجوازات السفر ({b.passengers.length}):
                              </h5>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {b.passengers.map((p) => (
                                  <div
                                    key={p.id}
                                    className="rounded-lg border border-border/70 bg-background p-2.5 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-foreground">
                                        {p.full_name}
                                      </span>
                                      {p.is_primary && (
                                        <Badge variant="outline" className="text-[9px] py-0">
                                          المسافر الرئيسي
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                                      {p.passport_number && (
                                        <div className="flex items-center gap-1">
                                          <span className="font-medium text-foreground">
                                            جواز السفر:
                                          </span>
                                          <span className="font-mono" dir="ltr">
                                            {p.passport_number}
                                          </span>
                                        </div>
                                      )}
                                      {p.date_of_birth && (
                                        <div>تاريخ الميلاد: {shortDate(p.date_of_birth)}</div>
                                      )}
                                      {p.passport_expiry && (
                                        <div>صلاحية الجواز: {shortDate(p.passport_expiry)}</div>
                                      )}
                                      {p.nationality && <div>الجنسية: {p.nationality}</div>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ----------------- TAB 2: Financials & Installments ----------------- */}
              <TabsContent value="installments" className="mt-4 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      الإدارة المالية والمدفوعات
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      سجل المدفوعات المستلمة فعلياً وجدول الأقساط مع احتساب فوري للرصيد.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const defaultBooking = customer.bookingRows?.[0];
                        setDirectPayBookingId(defaultBooking?.id ?? null);
                        const remaining = defaultBooking
                          ? Math.max(
                              0,
                              Number(defaultBooking.total_price ?? 0) -
                                Number(defaultBooking.paid_amount ?? 0),
                            )
                          : customer.totalRemaining;
                        setDirectPayIsFull(true);
                        setDirectPayAmount(remaining > 0 ? String(remaining) : "");
                        setDirectPayDate(new Date().toISOString().split("T")[0]);
                        setDirectPayMethod("cash");
                        setDirectPayNote("");
                        setDirectPayTitle("سداد كامل للحجز");
                        setIsRecordingPayment(true);
                      }}
                      className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      تسجيل دفعة مستلمة
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddingInstallment(true);
                        if (customer.bookingRows?.[0]) setInstBookingId(customer.bookingRows[0].id);
                      }}
                      className="h-8 gap-1.5 text-xs"
                    >
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      جدولة قسط قادم
                    </Button>
                  </div>
                </div>

                {/* Section 1: Received Payments (Payment History) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      سجل المدفوعات المستلمة (
                      {(customer.installments ?? []).filter((i) => i.status === "paid").length})
                    </h4>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold tabular-nums">
                      إجمالي المقبوضات: {formatMoney(customer.totalPaid, customer.currency)}
                    </span>
                  </div>

                  {(customer.installments ?? []).filter((i) => i.status === "paid").length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
                      <Receipt className="mx-auto h-7 w-7 text-muted-foreground/60" />
                      <p className="mt-1.5 text-xs font-medium text-foreground">
                        لم يتم تسجيل أي دفعات مستلمة بعد
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        اضغط على "تسجيل دفعة مستلمة" لإدخال وصل سداد كامل أو قسط مالي.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(customer.installments ?? [])
                        .filter((i) => i.status === "paid")
                        .map((inst, index) => (
                          <div
                            key={inst.id}
                            className="flex items-start justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 shadow-2xs"
                          >
                            <div className="flex items-start gap-3">
                              <div className="pt-0.5">
                                <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-white">
                                  <CheckCheck className="h-3.5 w-3.5" />
                                </span>
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs text-foreground">
                                    {inst.title ||
                                      `دفعة مالية ${inst.installment_number ?? index + 1}`}
                                  </span>
                                  <Badge className="bg-emerald-600 text-white text-[9px] font-medium py-0">
                                    تم السداد
                                  </Badge>
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                  <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                    {formatMoney(inst.amount, inst.currency)}
                                  </span>

                                  {inst.paid_at && (
                                    <span className="text-foreground/80 font-medium">
                                      تاريخ الدفع: {shortDate(inst.paid_at)}
                                    </span>
                                  )}

                                  {inst.payment_method && (
                                    <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] text-foreground">
                                      {inst.payment_method === "cash"
                                        ? "نقداً (Espèces)"
                                        : inst.payment_method === "bank_transfer"
                                          ? "تحويل بنكي (Virement)"
                                          : inst.payment_method === "cheque"
                                            ? "شيك (Chèque)"
                                            : inst.payment_method === "credit_card"
                                              ? "بطاقة بنكية (Carte)"
                                              : inst.payment_method === "edinar"
                                                ? "دينار إلكتروني"
                                                : inst.payment_method}
                                    </span>
                                  )}
                                </div>

                                {inst.note && (
                                  <p className="mt-1 text-[11px] text-muted-foreground italic">
                                    وصل / ملاحظة: {inst.note}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-muted-foreground hover:text-foreground"
                                title="تعديل الدفعة"
                                onClick={() => {
                                  setEditingInstallment(inst);
                                  setEditTitle(inst.title || "");
                                  setEditAmount(String(inst.amount || ""));
                                  setEditStatus("paid");
                                  setEditMethod(inst.payment_method || "cash");
                                  setEditPaidAt(
                                    inst.paid_at
                                      ? inst.paid_at.split("T")[0]
                                      : new Date().toISOString().split("T")[0],
                                  );
                                  setEditDueDate(inst.due_date || "");
                                  setEditNote(inst.note || "");
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-muted-foreground hover:text-destructive"
                                title="حذف الدفعة"
                                onClick={() => {
                                  if (
                                    confirm("هل أنت متأكد من حذف هذه الدفعة وإعادة احتساب الرصيد؟")
                                  ) {
                                    deleteInstMutation.mutate(inst.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Section 2: Scheduled / Upcoming Installments */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      الأقساط المجدولة والقادمة (
                      {(customer.installments ?? []).filter((i) => i.status === "pending" || i.status === "overdue").length})
                    </h4>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      المتبقي: {formatMoney(customer.totalRemaining, customer.currency)}
                    </span>
                  </div>

                  {(customer.installments ?? []).filter((i) => i.status === "pending" || i.status === "overdue").length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
                      <p className="text-xs text-muted-foreground">
                        لا توجد أقساط معلقة أو مجدولة في المستقبل.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(customer.installments ?? [])
                        .filter((i) => i.status === "pending" || i.status === "overdue")
                        .map((inst, index) => {
                          const isOverdue =
                            inst.status === "overdue" ||
                            (inst.due_date && new Date(inst.due_date) < new Date());

                          return (
                            <div
                              key={inst.id}
                              className={cn(
                                "flex items-start justify-between gap-3 rounded-xl border p-3 transition-all shadow-2xs",
                                isOverdue
                                  ? "border-rose-500/40 bg-rose-50/30 dark:bg-rose-950/15"
                                  : "border-border/80 bg-card",
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className="pt-0.5">
                                  <Checkbox
                                    id={`inst-check-${inst.id}`}
                                    checked={false}
                                    onCheckedChange={() => {
                                      setPendingInstallmentId(inst.id);
                                    }}
                                    disabled={toggleMutation.isPending}
                                    className="h-5 w-5"
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <label
                                      htmlFor={`inst-check-${inst.id}`}
                                      className="font-semibold text-xs text-foreground cursor-pointer"
                                    >
                                      {inst.title ||
                                        `القسط ${inst.installment_number ?? index + 1}`}
                                    </label>

                                    {isOverdue ? (
                                      <Badge
                                        variant="outline"
                                        className="border-rose-500/40 bg-rose-50 text-rose-700 text-[9px] py-0 dark:bg-rose-950/30 dark:text-rose-300"
                                      >
                                        <AlertTriangle className="h-3 w-3 me-1" />
                                        متأخر
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] py-0 text-muted-foreground"
                                      >
                                        مستحق الدفع
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                    <span className="font-bold tabular-nums text-foreground">
                                      {formatMoney(inst.amount, inst.currency)}
                                    </span>

                                    {inst.due_date && (
                                      <span
                                        className={cn(
                                          isOverdue ? "text-rose-600 font-semibold" : "",
                                        )}
                                      >
                                        تاريخ الاستحقاق: {shortDate(inst.due_date)}
                                      </span>
                                    )}
                                  </div>

                                  {inst.note && (
                                    <p className="mt-1 text-[11px] text-muted-foreground italic">
                                      ملاحظة: {inst.note}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="text-muted-foreground hover:text-foreground"
                                  title="تعديل القسط"
                                  onClick={() => {
                                    setEditingInstallment(inst);
                                    setEditTitle(inst.title || "");
                                    setEditAmount(String(inst.amount || ""));
                                    setEditStatus(inst.status);
                                    setEditMethod(inst.payment_method || "cash");
                                    setEditDueDate(inst.due_date || "");
                                    setEditPaidAt(inst.paid_at ? inst.paid_at.split("T")[0] : "");
                                    setEditNote(inst.note || "");
                                  }}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="text-muted-foreground hover:text-destructive"
                                  title="حذف القسط"
                                  onClick={() => {
                                    if (confirm("هل أنت متأكد من حذف هذا القسط؟")) {
                                      deleteInstMutation.mutate(inst.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Section 2.b: Cancelled / Void Installments (Audit trail only) */}
                  {(customer.installments ?? []).some((i) => i.status === "cancelled") && (
                    <div className="space-y-2 pt-3 border-t border-border/40">
                      <h5 className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        الأقساط الملغاة (
                        {(customer.installments ?? []).filter((i) => i.status === "cancelled").length})
                      </h5>
                      <div className="space-y-1.5">
                        {(customer.installments ?? [])
                          .filter((i) => i.status === "cancelled")
                          .map((inst) => (
                            <div
                              key={inst.id}
                              className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-2.5 opacity-60 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="line-through text-muted-foreground font-medium">
                                  {inst.title || "قسط ملغي"}
                                </span>
                                <Badge variant="outline" className="text-[9px] py-0 text-muted-foreground">
                                  ملغي
                                </Badge>
                              </div>
                              <span className="line-through tabular-nums text-muted-foreground">
                                {formatMoney(inst.amount, inst.currency)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ----------------- TAB 3: Requests & Messages ----------------- */}
              <TabsContent value="requests" className="mt-4 space-y-4">
                {/* Custom Umrah Requests */}
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                    طلبات برامج العمرة المخصصة ({customer.customRows?.length ?? 0})
                  </h4>
                  {!customer.customRows || customer.customRows.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                      لا توجد طلبات عمرة مخصصة مسجلة.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {customer.customRows.map((u) => {
                        const travellers = (u.adults ?? 0) + (u.children ?? 0) + (u.infants ?? 0);
                        return (
                          <div
                            key={u.id}
                            className="rounded-lg border border-border/70 bg-card p-3 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                برنامج عمرة {u.reference ? `(${u.reference})` : ""}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {u.status}
                              </Badge>
                            </div>
                            <p className="mt-1 text-muted-foreground">
                              مكة: {u.makkah_nights ?? 0} ليالٍ · المدينة: {u.madinah_nights ?? 0}{" "}
                              ليالٍ · المسافرين: {travellers} · تاريخ التسجيل:{" "}
                              {shortDate(u.created_at)}
                            </p>
                            {u.offer_amount && (
                              <p className="mt-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                عرض السعر المرسل: {formatMoney(u.offer_amount, "TND")} (بتاريخ:{" "}
                                {shortDate(u.offer_sent_at || u.created_at)})
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Flight Requests */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                    طلبات تذاكر الطيران ({customer.flightRows?.length ?? 0})
                  </h4>
                  {!customer.flightRows || customer.flightRows.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                      لا توجد طلبات حجز طيران مسجلة.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {customer.flightRows.map((f) => (
                        <div
                          key={f.id}
                          className="rounded-lg border border-border/70 bg-card p-3 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground flex items-center gap-1">
                              <Plane className="h-3.5 w-3.5 text-primary" />
                              {f.from_airport} ⟵ {f.to_airport}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {f.status}
                            </Badge>
                          </div>
                          <p className="mt-1 text-muted-foreground">
                            النوع: {f.trip_type} · الرقم المرجعي: {f.reference} · التسجيل:{" "}
                            {shortDate(f.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contact Messages */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                    رسائل واستفسارات التواصل ({customer.messageRows?.length ?? 0})
                  </h4>
                  {!customer.messageRows || customer.messageRows.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                      لا توجد رسائل تواصل سابقة.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {customer.messageRows.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-lg border border-border/70 bg-card p-3 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              {m.subject || "رسالة استفسار من الموقع"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {shortDate(m.created_at)}
                            </span>
                          </div>
                          <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                            {m.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ----------------- TAB 4: Activity Timeline ----------------- */}
              <TabsContent value="timeline" className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">السجل الزمني والأنشطة</h3>
                    <p className="text-xs text-muted-foreground">
                      تتبع زمني متكامل لكافة الحجوزات، الدفعات، التعديلات والملاحظات.
                    </p>
                  </div>
                </div>

                {!customer.timeline || customer.timeline.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">
                    لا توجد أحداث مسجلة في السجل الزمني حتى الآن.
                  </p>
                ) : (
                  <div className="relative border-s border-border/80 pe-1 ps-4 space-y-4 mt-3">
                    {customer.timeline.map((evt) => {
                      const isPayment =
                        evt.type === "installment_paid" || evt.type === "payment_made";
                      const isBooking = evt.type === "booking_created";

                      return (
                        <div key={evt.id} className="relative">
                          <div
                            className={cn(
                              "absolute -start-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full border bg-background",
                              isPayment
                                ? "border-emerald-500 text-emerald-600"
                                : isBooking
                                  ? "border-primary text-primary"
                                  : "border-muted-foreground/60 text-muted-foreground",
                            )}
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-current" />
                          </div>

                          <div className="rounded-lg border border-border/70 bg-card p-3 shadow-2xs">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-foreground">{evt.title}</p>
                              <span className="text-[11px] tabular-nums text-muted-foreground whitespace-nowrap">
                                {shortDate(evt.date)}
                              </span>
                            </div>

                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {evt.description}
                            </p>

                            {evt.amount && (
                              <p className="mt-1 text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                المبلغ: {formatMoney(evt.amount, evt.currency ?? "TND")}
                              </p>
                            )}

                            {evt.authorEmail && (
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                المسجل: {evt.authorEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ----------------- TAB 5: Internal Staff Notes ----------------- */}
              <TabsContent value="notes" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      ملاحظات فريق العمل الداخلية
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      ملاحظات خاصة بموظفي الوكالة، مؤرخة ومحمية ولا تظهر على الموقع العام.
                    </p>
                  </div>
                  {!isAddingNote && (
                    <Button
                      size="sm"
                      onClick={() => setIsAddingNote(true)}
                      className="h-8 gap-1.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> إضافة ملاحظة
                    </Button>
                  )}
                </div>

                {isAddingNote && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-3">
                    <Label className="text-xs font-medium">ملاحظة داخلية جديدة</Label>
                    <Textarea
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="تفضيلات المسافر أو ملاحظات المتابعة الداخلية..."
                      className="min-h-[75px] text-xs"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingNote(false)}
                        className="text-xs h-7"
                      >
                        إلغاء
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => addNoteMutation.mutate()}
                        disabled={addNoteMutation.isPending || !newNoteText.trim()}
                        className="text-xs h-7"
                      >
                        {addNoteMutation.isPending ? "جاري الحفظ..." : "حفظ الملاحظة"}
                      </Button>
                    </div>
                  </div>
                )}

                {!customer.internalNotes || customer.internalNotes.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">
                    لا توجد ملاحظات داخلية مسجلة لهذا العميل بعد.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {customer.internalNotes.map((n) => (
                      <div
                        key={n.id}
                        className="rounded-lg border border-border/70 bg-card p-3 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-foreground whitespace-pre-wrap">{n.note}</p>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف هذه الملاحظة؟")) {
                                deleteNoteMutation.mutate(n.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-1.5">
                          <span>الكاتب: {n.author_email || "فريق الوكالة"}</span>
                          <span>{relativeDate(n.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </Drawer>

      {/* Mark Installment Paid Modal */}
      <Dialog
        open={!!pendingInstallmentId}
        onOpenChange={(open) => !open && setPendingInstallmentId(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تسجيل سداد القسط</DialogTitle>
            <DialogDescription>
              حدد طريقة الدفع وملاحظات التحصيل لتأكيد استلام المبلغ وتحديث رصيد الحجز.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">طريقة الدفع</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقداً في الوكالة (Espèces)</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي رسمي (Virement)</SelectItem>
                  <SelectItem value="cheque">شيك بنكي (Chèque)</SelectItem>
                  <SelectItem value="edinar">بطاقة إلكترونية / دينار بريدي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">رقم الوصل / ملاحظة التحصيل</Label>
              <Input
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="رقم وصل الاستلام أو الملاحظة"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPendingInstallmentId(null)}
              disabled={toggleMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (pendingInstallmentId) {
                  toggleMutation.mutate({
                    id: pendingInstallmentId,
                    paid: true,
                    method: payMethod,
                    note: payNote.trim() || undefined,
                  });
                }
              }}
              disabled={toggleMutation.isPending}
            >
              {toggleMutation.isPending ? "جاري التأكيد..." : "تأكيد السداد وتحديث الرصيد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Installment Dialog */}
      <Dialog open={isAddingInstallment} onOpenChange={setIsAddingInstallment}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>إضافة وجدولة قسط جديد</DialogTitle>
            <DialogDescription>
              حدد بيانات القسط وتاريخ استحقاقه لجدولته ضمن حساب العميل.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">عنوان القسط</Label>
              <Input
                value={instTitle}
                onChange={(e) => setInstTitle(e.target.value)}
                placeholder="عنوان القسط أو الدفعة"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">المبلغ (دينار تونسي)</Label>
              <NumberInput
                value={instAmount === "" ? null : Number(instAmount)}
                onChange={(val) => setInstAmount(val === null ? "" : String(val))}
                placeholder="أدخل المبلغ (د.ت)"
                showSteppers={false}
                allowDecimal
                allowEmpty
                className="text-xs tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تاريخ الاستحقاق</Label>
              <DatePicker
                value={instDueDate}
                onChange={(d) => setInstDueDate(d || "")}
                placeholder="اختر تاريخ الاستحقاق"
                className="text-xs"
              />
            </div>

            {customer?.bookingRows && customer.bookingRows.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ربط بالحجز</Label>
                <Select
                  value={instBookingId ?? "none"}
                  onValueChange={(v) => setInstBookingId(v === "none" ? null : v)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="اختر الحجز المرتبط" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون ربط بحجز محدد</SelectItem>
                    {customer.bookingRows.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.package_title || "حجز عام"} ({shortDate(b.created_at)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ملاحظات إضافية (اختياري)</Label>
              <Input
                value={instNote}
                onChange={(e) => setInstNote(e.target.value)}
                placeholder="طريقة الدفع أو تفاصيل السداد"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingInstallment(false)}
              disabled={addInstMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={() => addInstMutation.mutate()}
              disabled={addInstMutation.isPending || !instTitle.trim() || !instAmount}
            >
              {addInstMutation.isPending ? "جاري الحفظ..." : "حفظ وجدولة القسط"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Direct Payment Dialog (Full Payment or Partial) */}
      <Dialog open={isRecordingPayment} onOpenChange={setIsRecordingPayment}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة مالية للعميل</DialogTitle>
            <DialogDescription>
              تسجيل مبلغ مستلم فعلياً (سداد كامل أو دفعة جزئية) مع تحديث فوري للحساب والتقارير.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const selectedBooking = customer?.bookingRows?.find((b) => b.id === directPayBookingId);
            const remainingForBooking = selectedBooking
              ? Math.max(
                  0,
                  Number(selectedBooking.total_price ?? 0) -
                    Number(selectedBooking.paid_amount ?? 0),
                )
              : (customer?.totalRemaining ?? 0);
            const enteredAmount = Number(directPayAmount);
            const isOverpaying = enteredAmount > remainingForBooking + 0.01;

            return (
              <div className="grid gap-3.5 py-3">
                {/* Booking Selection */}
                {customer?.bookingRows && customer.bookingRows.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">ربط بالحجز</Label>
                    <Select
                      value={directPayBookingId ?? "none"}
                      onValueChange={(v) => {
                        const newBookingId = v === "none" ? null : v;
                        setDirectPayBookingId(newBookingId);
                        const b = customer.bookingRows.find((item) => item.id === newBookingId);
                        const rem = b
                          ? Math.max(0, Number(b.total_price ?? 0) - Number(b.paid_amount ?? 0))
                          : customer.totalRemaining;
                        if (directPayIsFull) {
                          setDirectPayAmount(rem > 0 ? String(rem) : "");
                        }
                      }}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="اختر الحجز المستهدف" />
                      </SelectTrigger>
                      <SelectContent>
                        {customer.bookingRows.map((b) => {
                          const rem = Math.max(
                            0,
                            Number(b.total_price ?? 0) - Number(b.paid_amount ?? 0),
                          );
                          return (
                            <SelectItem key={b.id} value={b.id}>
                              {b.package_title || "حجز رحلة"} (المتبقي:{" "}
                              {formatMoney(rem, b.currency ?? "TND")})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Payment Pattern Choice: Full vs Partial */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">نوع الدفعة</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDirectPayIsFull(true);
                        setDirectPayAmount(
                          remainingForBooking > 0 ? String(remainingForBooking) : "",
                        );
                        setDirectPayTitle("سداد كامل للحجز");
                      }}
                      className={cn(
                        "rounded-lg border p-2.5 text-xs text-center font-medium transition-all",
                        directPayIsFull
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-emerald-600/30 font-bold"
                          : "border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground",
                      )}
                    >
                      سداد كامل (Full Payment)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDirectPayIsFull(false);
                        setDirectPayTitle("دفعة مالية جزئية");
                      }}
                      className={cn(
                        "rounded-lg border p-2.5 text-xs text-center font-medium transition-all",
                        !directPayIsFull
                          ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20 font-bold"
                          : "border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground",
                      )}
                    >
                      دفعة جزئية (Partial)
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <Label className="font-semibold">المبلغ المستلم (دينار تونسي)</Label>
                    <span className="text-[11px] text-muted-foreground">
                      المتبقي الأقصى:{" "}
                      <strong className="text-foreground tabular-nums">
                        {formatMoney(remainingForBooking, customer?.currency ?? "TND")}
                      </strong>
                    </span>
                  </div>
                  <NumberInput
                    value={directPayAmount === "" ? null : Number(directPayAmount)}
                    onChange={(val) => setDirectPayAmount(val === null ? "" : String(val))}
                    placeholder="أدخل المبلغ (د.ت)"
                    showSteppers={false}
                    allowDecimal
                    allowEmpty
                    className="text-xs tabular-nums"
                  />
                </div>

                {/* Overpayment Validation Alert */}
                {isOverpaying && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      المبلغ يتجاوز المبلغ المتبقي (
                      {formatMoney(remainingForBooking, customer?.currency ?? "TND")}).
                    </span>
                  </div>
                )}

                {/* Payment Date & Method Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">تاريخ الدفع الفعلي</Label>
                    <DatePicker
                      value={directPayDate}
                      onChange={(d) => setDirectPayDate(d || "")}
                      placeholder="اختر تاريخ الدفع"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">طريقة الدفع</Label>
                    <Select value={directPayMethod} onValueChange={setDirectPayMethod}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">نقداً بالفرع (Espèces)</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي (Virement)</SelectItem>
                        <SelectItem value="cheque">شيك بنكي (Chèque)</SelectItem>
                        <SelectItem value="credit_card">بطاقة بنكية (Carte)</SelectItem>
                        <SelectItem value="edinar">دينار بريدي / إلكتروني</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description & Note */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">عنوان الدفعة / الوصف</Label>
                  <Input
                    value={directPayTitle}
                    onChange={(e) => setDirectPayTitle(e.target.value)}
                    placeholder="بيان الدفعة أو الغرض منها"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">رقم الوصل / ملاحظة التحصيل</Label>
                  <Input
                    value={directPayNote}
                    onChange={(e) => setDirectPayNote(e.target.value)}
                    placeholder="رقم وصل الاستلام أو اسم المستلم"
                    className="text-xs"
                  />
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRecordingPayment(false)}
              disabled={recordPaymentMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={() => recordPaymentMutation.mutate()}
              disabled={
                recordPaymentMutation.isPending ||
                !directPayAmount ||
                Number(directPayAmount) <= 0 ||
                (() => {
                  const selectedBooking = customer?.bookingRows?.find(
                    (b) => b.id === directPayBookingId,
                  );
                  const rem = selectedBooking
                    ? Math.max(
                        0,
                        Number(selectedBooking.total_price ?? 0) -
                          Number(selectedBooking.paid_amount ?? 0),
                      )
                    : (customer?.totalRemaining ?? 0);
                  return Number(directPayAmount) > rem + 0.01;
                })()
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {recordPaymentMutation.isPending ? "جاري التسجيل..." : "تأكيد تسجيل الدفعة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Installment / Payment Dialog */}
      <Dialog
        open={!!editingInstallment}
        onOpenChange={(open) => !open && setEditingInstallment(null)}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>تعديل بيانات القسط / الدفعة</DialogTitle>
            <DialogDescription>
              تعديل المبلغ أو التاريخ أو طريقة السداد مع إعادة احتساب الأرصدة تلقائياً.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">العنوان</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="عنوان الدفعة أو القسط"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">المبلغ (دينار تونسي)</Label>
              <NumberInput
                value={editAmount === "" ? null : Number(editAmount)}
                onChange={(val) => setEditAmount(val === null ? "" : String(val))}
                placeholder="أدخل المبلغ (د.ت)"
                showSteppers={false}
                allowDecimal
                allowEmpty
                className="text-xs tabular-nums"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">الحالة</Label>
                <Select
                  value={editStatus}
                  onValueChange={(v) =>
                    setEditStatus(v as "pending" | "paid" | "overdue" | "cancelled")
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">مسدد (Paid)</SelectItem>
                    <SelectItem value="pending">قيد الانتظار (Pending)</SelectItem>
                    <SelectItem value="overdue">متأخر (Overdue)</SelectItem>
                    <SelectItem value="cancelled">ملغي (Cancelled)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">طريقة الدفع</Label>
                <Select value={editMethod} onValueChange={setEditMethod}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقداً (Espèces)</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي (Virement)</SelectItem>
                    <SelectItem value="cheque">شيك (Chèque)</SelectItem>
                    <SelectItem value="credit_card">بطاقة بنكية (Carte)</SelectItem>
                    <SelectItem value="edinar">دينار بريدي / إلكتروني</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">تاريخ السداد</Label>
                <DatePicker
                  value={editPaidAt}
                  onChange={(d) => setEditPaidAt(d || "")}
                  placeholder="اختر تاريخ السداد"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">تاريخ الاستحقاق</Label>
                <DatePicker
                  value={editDueDate}
                  onChange={(d) => setEditDueDate(d || "")}
                  placeholder="اختر تاريخ الاستحقاق"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ملاحظات / رقم الوصل</Label>
              <Input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="ملاحظات إضافية"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingInstallment(null)}
              disabled={updateInstallmentMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={() => updateInstallmentMutation.mutate()}
              disabled={
                updateInstallmentMutation.isPending || !editAmount || Number(editAmount) <= 0
              }
            >
              {updateInstallmentMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Profile Dialog */}
      <CustomerEditModal
        customer={customer ?? null}
        open={isEditingProfile}
        onOpenChange={setIsEditingProfile}
      />

      {/* Archive Customer Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>أرشفة ملف العميل</DialogTitle>
            <DialogDescription>
              هل تريد نقل العميل «{customer?.name}» إلى الأرشيف؟ سيتم إخفاؤه من قوائم العملاء النشطة مع الحفاظ الكامل على كافة حجوزاته وسجلاته المالية والمحاسبية في النظام، ويمكنك استرجاعه في أي وقت من قسم الأرشيف.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="default"
              disabled={archiveCustomerMutation.isPending}
              onClick={() => archiveCustomerMutation.mutate()}
            >
              {archiveCustomerMutation.isPending ? "جاري الأرشفة..." : "تأكيد الأرشفة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
