import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  ExternalLink,
  Plus,
  Edit,
  Trash2,
  Star,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Navigation,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Drawer,
  EmptyState,
  ErrorState,
  Page,
  Panel,
  SearchInput,
  SkeletonRows,
  StatusSwitch,
  useDebounced,
} from "@/components/admin/kit";
import { supabase } from "@/integrations/supabase/client";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/branches")({
  ssr: false,
  head: () => ({
    meta: [{ title: adminDocTitle("branches") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: BranchesAdminPage,
});

type BranchRow = Database["public"]["Tables"]["branches"]["Row"];

interface BranchFormData {
  id?: string;
  name: string;
  name_fr: string;
  city: string;
  city_fr: string;
  address: string;
  address_fr: string;
  phone: string;
  email: string;
  working_hours: string;
  working_hours_fr: string;
  google_maps_url: string;
  latitude: string;
  longitude: string;
  is_active: boolean;
  is_main_branch: boolean;
}

const EMPTY_BRANCH_FORM: BranchFormData = {
  name: "",
  name_fr: "",
  city: "",
  city_fr: "",
  address: "",
  address_fr: "",
  phone: "",
  email: "",
  working_hours: "الإثنين - السبت: 08:30 - 17:30",
  working_hours_fr: "Lundi - Samedi : 08h30 - 17h30",
  google_maps_url: "",
  latitude: "33.705",
  longitude: "8.971",
  is_active: true,
  is_main_branch: false,
};

const digits = (phone: string | null) => (phone ?? "").replace(/[^\d+]/g, "");

function BranchesAdminPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  // Drawer / Dialog state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchFormData | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [setMainConfirmId, setSetMainConfirmId] = useState<string | null>(null);
  const [pendingBranchId, setPendingBranchId] = useState<string | null>(null);

  // Invalidate both admin and public branch queries so public website syncs immediately!
  const invalidateBranches = () => {
    qc.invalidateQueries({ queryKey: ["admin-branches"] });
    qc.invalidateQueries({ queryKey: ["branches"] });
    qc.invalidateQueries({ queryKey: ["branches-list-simple"] });
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  // Fetch all branches
  const branchesQuery = useQuery({
    queryKey: ["admin-branches"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("is_main_branch", { ascending: false })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as BranchRow[];
    },
    staleTime: 30_000,
  });

  const branches = useMemo(() => branchesQuery.data ?? [], [branchesQuery.data]);

  // Quick stats
  const activeCount = useMemo(() => branches.filter((b) => b.is_active).length, [branches]);
  const mainBranch = useMemo(() => branches.find((b) => b.is_main_branch), [branches]);

  // Filtering
  const filtered = useMemo(() => {
    let result = branches;
    if (filterActive === "active") result = result.filter((b) => b.is_active);
    if (filterActive === "inactive") result = result.filter((b) => !b.is_active);

    const needle = debounced.trim().toLowerCase();
    if (needle) {
      result = result.filter((b) =>
        [b.name, b.name_fr, b.city, b.city_fr, b.address, b.phone, b.email].some((v) =>
          (v ?? "").toLowerCase().includes(needle),
        ),
      );
    }
    return result;
  }, [branches, filterActive, debounced]);

  // Toggle Active Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("branches").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      toast.success(
        is_active
          ? "تم تفعيل الفرع وإظهاره على الموقع العام"
          : "تم إلغاء تفعيل الفرع وإخفاؤه من الموقع العام",
      );
      invalidateBranches();
    },
    onError: (err: Error) => toast.error(err.message || "فشل تحديث حالة الفرع"),
    onSettled: () => setPendingBranchId(null),
  });

  // Set Main Branch Mutation
  const setMainMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: e1 } = await supabase
        .from("branches")
        .update({ is_main_branch: false })
        .neq("id", id);
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("branches")
        .update({ is_main_branch: true, is_active: true })
        .eq("id", id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("تم تحديث الفرع الرئيسي بنجاح وسيظهر كفرع رئيسي في الموقع والفوتير");
      setSetMainConfirmId(null);
      invalidateBranches();
    },
    onError: (err: Error) => toast.error(err.message || "فشل تعيين الفرع الرئيسي"),
  });

  // Delete Branch Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف الفرع من النظام");
      setDeleteConfirmId(null);
      invalidateBranches();
    },
    onError: (err: Error) => toast.error(err.message || "فشل حذف الفرع"),
  });

  const openAdd = () => {
    setEditingBranch({
      ...EMPTY_BRANCH_FORM,
      is_main_branch: branches.length === 0,
    });
    setIsDrawerOpen(true);
  };

  const openEdit = (b: BranchRow) => {
    setEditingBranch({
      id: b.id,
      name: b.name ?? "",
      name_fr: b.name_fr ?? "",
      city: b.city ?? "",
      city_fr: b.city_fr ?? "",
      address: b.address ?? "",
      address_fr: b.address_fr ?? "",
      phone: b.phone ?? "",
      email: b.email ?? "",
      working_hours: b.working_hours ?? "الإثنين - السبت: 08:30 - 17:30",
      working_hours_fr: b.working_hours_fr ?? "Lundi - Samedi : 08h30 - 17h30",
      google_maps_url: b.google_maps_url ?? "",
      latitude: String(b.latitude ?? "33.705"),
      longitude: String(b.longitude ?? "8.971"),
      is_active: b.is_active,
      is_main_branch: b.is_main_branch,
    });
    setIsDrawerOpen(true);
  };

  return (
    <Page
      title="إدارة الفروع ومراكز الخدمة (Branches)"
      description="المصدر التشغيلي الوحيد لبيانات فروع الوكالة: تفعيل الفروع، تحديث العناوين والهواتف، والمزامنة اللحظية مع الموقع العام والفوتير."
      actions={
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4" /> إضافة فرع جديد
        </Button>
      }
    >
      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-muted-foreground">إجمالي الفروع</span>
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{branches.length}</p>
          <p className="mt-1 text-caption text-muted-foreground">فروع مسجلة بالنظام</p>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-4 shadow-sm dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-emerald-800 dark:text-emerald-300">
              مفعلة على الموقع
            </span>
            <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            {activeCount}
          </p>
          <p className="mt-1 text-caption text-emerald-600/80 dark:text-emerald-400/80">
            تظهر حالياً في صفحة الفروع والفوتير
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-muted-foreground">معطلة مؤقتاً</span>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
            {branches.length - activeCount}
          </p>
          <p className="mt-1 text-caption text-muted-foreground">مخفية من الموقع العام</p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-primary">الفرع الرئيسي</span>
            <Star className="h-4 w-4 text-primary fill-primary" />
          </div>
          <p className="mt-2 text-base font-bold text-foreground truncate">
            {mainBranch ? mainBranch.name : "لم يتم التحديد"}
          </p>
          <p className="mt-1 text-caption text-muted-foreground">
            {mainBranch ? mainBranch.city : "حدد فرعاً رئيسياً"}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ابحث باسم الفرع، المدينة، الهاتف أو العنوان..."
          className="max-w-md flex-1"
        />

        <div className="flex items-center gap-1.5 border-b sm:border-b-0 pb-2 sm:pb-0">
          {[
            { id: "all", label: "جميع الفروع", count: branches.length },
            { id: "active", label: "المفعلة فقط", count: activeCount },
            { id: "inactive", label: "المعطلة", count: branches.length - activeCount },
          ].map((tab) => {
            const active = filterActive === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterActive(tab.id as typeof filterActive)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-bold",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Branches List / Cards */}
      <Panel className="mt-4" bodyClassName="p-0 sm:p-0">
        {branchesQuery.isLoading ? (
          <div className="p-4">
            <SkeletonRows rows={4} />
          </div>
        ) : branchesQuery.isError ? (
          <ErrorState onRetry={() => branchesQuery.refetch()} />
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Building2}
              title={branches.length === 0 ? "لا توجد فروع مسجلة" : "لم يتم العثور على فروع مطابقة"}
              description="أضف فروع الوكالة لتظهر في صفحات الموقع، الخريطة، والتواصل المباشر مع العملاء."
              action={
                <Button onClick={openAdd} size="sm" className="mt-3">
                  <Plus className="me-1 h-4 w-4" /> إضافة أول فرع
                </Button>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((b) => (
              <div
                key={b.id}
                className={cn(
                  "flex flex-col gap-4 p-4 sm:p-5 transition-colors sm:flex-row sm:items-center sm:justify-between",
                  !b.is_active && "opacity-70 bg-muted/20",
                  b.is_main_branch && "bg-primary/[0.02]",
                )}
              >
                {/* Branch Info */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">{b.name}</h3>

                    {b.name_fr && (
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        ({b.name_fr})
                      </span>
                    )}

                    {b.is_main_branch && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] gap-1 font-bold">
                        <Star className="h-3 w-3 fill-current" />
                        الفرع الرئيسي
                      </Badge>
                    )}

                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold",
                        b.is_active
                          ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "border-muted bg-muted/40 text-muted-foreground",
                      )}
                    >
                      {b.is_active ? "نشط على الموقع" : "معطل"}
                    </Badge>

                    {b.city && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-foreground font-medium">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {b.city}
                      </span>
                    )}
                  </div>

                  {/* Address & Hours */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {b.address && <span>العنوان: {b.address}</span>}
                    {b.working_hours && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {b.working_hours}
                      </span>
                    )}
                  </div>

                  {/* Contact Links & Coordinates */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                    {b.phone && (
                      <span className="font-mono text-foreground" dir="ltr">
                        {b.phone}
                      </span>
                    )}
                    {b.email && <span>{b.email}</span>}
                    {b.latitude && b.longitude && (
                      <span className="font-mono text-[11px] text-muted-foreground/80">
                        الإحداثيات: {b.latitude}, {b.longitude}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Switch & Actions */}
                <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-3 sm:border-t-0 sm:pt-0 sm:justify-end">
                  {/* Active StatusSwitch */}
                  <StatusSwitch
                    id={`active-${b.id}`}
                    checked={Boolean(b.is_active)}
                    disabled={toggleActiveMutation.isPending && pendingBranchId === b.id}
                    isPending={toggleActiveMutation.isPending && pendingBranchId === b.id}
                    onCheckedChange={(checked) => {
                      setPendingBranchId(b.id);
                      toggleActiveMutation.mutate({ id: b.id, is_active: checked });
                    }}
                    ariaLabel={b.is_active ? "إلغاء تفعيل الفرع" : "تفعيل الفرع"}
                  />

                  {/* Quick Contact & Map Actions */}
                  <div className="flex items-center gap-1">
                    {b.google_maps_url && (
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <a
                          href={b.google_maps_url}
                          target="_blank"
                          rel="noreferrer"
                          title="فتح الموقع على خرائط جوجل"
                        >
                          <Navigation className="h-4 w-4" />
                        </a>
                      </Button>
                    )}

                    {b.phone && (
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-emerald-600"
                      >
                        <a href={`tel:${digits(b.phone)}`} title="اتصال">
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                    )}

                    {b.phone && (
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-emerald-600"
                      >
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={`https://wa.me/${digits(b.phone).replace(/^\+/, "")}`}
                          title="واتساب"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </Button>
                    )}

                    {!b.is_main_branch && (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => setSetMainConfirmId(b.id)}
                        title="تعيين كفرع رئيسي"
                      >
                        <Star className="me-1 h-3.5 w-3.5" />
                        تعيين كرئيسي
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => openEdit(b)}
                    >
                      <Edit className="h-3.5 w-3.5" /> تعديل
                    </Button>

                    {!b.is_main_branch && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirmId(b.id)}
                        title="حذف الفرع"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Add / Edit Branch Drawer */}
      <BranchEditDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialData={editingBranch}
        onSaved={() => {
          setIsDrawerOpen(false);
          invalidateBranches();
        }}
      />

      {/* Confirm Set Main Branch Dialog */}
      <AlertDialog open={!!setMainConfirmId} onOpenChange={() => setSetMainConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد تعيين الفرع كفرع رئيسي</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم تعيين هذا الفرع كفرع رئيسي للوكالة وسيظهر في مقدمة صفحة الفروع وبطاقة التواصل في
              الفوتير.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (setMainConfirmId) setMainMutation.mutate(setMainConfirmId);
              }}
            >
              تأكيد التعيين
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذا الفرع؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا الفرع نهائياً من النظام ولن يظهر بعد الآن في الموقع العام أو الخرائط.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId);
              }}
            >
              حذف الفرع
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

/* ------------------------------------------------------------------ Branch Edit Drawer */

function BranchEditDrawer({
  open,
  onClose,
  initialData,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initialData: BranchFormData | null;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState<BranchFormData>(EMPTY_BRANCH_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync state when initialData changes
  useMemo(() => {
    if (initialData) {
      setFormData(initialData);
      setErrors({});
    }
  }, [initialData]);

  const isEdit = !!formData.id;

  const validate = () => {
    const err: Record<string, string> = {};
    if (!formData.name.trim()) err.name = "اسم الفرع بالعربية مطلوب";
    if (!formData.city.trim()) err.city = "المدينة مطلوبة";
    if (!formData.address.trim()) err.address = "العنوان مطلوب";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      err.email = "يرجى إدخال بريد إلكتروني صحيح";
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        name_fr: formData.name_fr.trim() || null,
        city: formData.city.trim(),
        city_fr: formData.city_fr.trim() || null,
        address: formData.address.trim(),
        address_fr: formData.address_fr.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        working_hours: formData.working_hours.trim() || null,
        working_hours_fr: formData.working_hours_fr.trim() || null,
        google_maps_url: formData.google_maps_url.trim() || null,
        latitude: Number(formData.latitude) || 33.705,
        longitude: Number(formData.longitude) || 8.971,
        is_active: formData.is_active,
        is_main_branch: formData.is_main_branch,
      };

      if (isEdit && formData.id) {
        const { error } = await supabase
          .from("branches")
          .update(payload as never)
          .eq("id", formData.id);
        if (error) throw error;
        toast.success("تم تحديث بيانات الفرع ومزامنتها بنجاح مع الموقع العام");
      } else {
        const { error } = await supabase.from("branches").insert(payload as never);
        if (error) throw error;
        toast.success("تمت إضافة الفرع بنجاح وسيظهر الآن في الموقع العام");
      }

      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل حفظ بيانات الفرع";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? `تعديل فرع: ${formData.name}` : "إضافة فرع جديد للوكالة"}
      description="بيانات الفرع تُنشر وتُحدث فوراً على الموقع العام وخرائط الفروع."
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            إلغاء
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "حفظ التعديلات" : "إضافة الفرع ونشره"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 border-b border-border/50 pb-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground">1. المعلومات الأساسية للفرع</h4>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              اسم الفرع (بالعربية) <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: فرع سوق الأحد الرئيسي"
              className={cn("text-xs", errors.name && "border-destructive")}
            />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">اسم الفرع (بالفرنسية - اختياري)</Label>
            <Input
              value={formData.name_fr}
              onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })}
              placeholder="Ex: Agence Principale Souk El Ahad"
              dir="ltr"
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                المدينة <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="سوق الأحد، قبلي، الفوار..."
                className={cn("text-xs", errors.city && "border-destructive")}
              />
              {errors.city && <p className="text-[11px] text-destructive">{errors.city}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">المدينة (بالفرنسية)</Label>
              <Input
                value={formData.city_fr}
                onChange={(e) => setFormData({ ...formData, city_fr: e.target.value })}
                placeholder="Ex: Souk El Ahad, Kebili..."
                dir="ltr"
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              العنوان الكامل <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="الشارع، رقم المبنى، الرمز البريدي..."
              className={cn("text-xs min-h-[60px]", errors.address && "border-destructive")}
            />
            {errors.address && <p className="text-[11px] text-destructive">{errors.address}</p>}
          </div>
        </div>

        {/* Section 2: Contact & Working Hours */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 border-b border-border/50 pb-2">
            <Phone className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground">2. بيانات التواصل وساعات العمل</h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">رقم الهاتف / الجوال</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+216 75 000 000"
                dir="ltr"
                className="text-xs font-mono text-end"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">البريد الإلكتروني</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="branch@janatsahara.com"
                dir="ltr"
                className={cn("text-xs", errors.email && "border-destructive")}
              />
              {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">أوقات وساعات العمل</Label>
            <Input
              value={formData.working_hours}
              onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
              placeholder="الإثنين - السبت: 08:30 - 17:30"
              className="text-xs"
            />
          </div>
        </div>

        {/* Section 3: Location & Google Maps */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 border-b border-border/50 pb-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground">3. الموقع الجغرافي وخرائط جوجل</h4>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">رابط خرائط جوجل (Google Maps URL)</Label>
              {formData.google_maps_url && (
                <a
                  href={formData.google_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  اختبار الرابط <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <Input
              value={formData.google_maps_url}
              onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
              placeholder="https://maps.app.goo.gl/..."
              dir="ltr"
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">خط العرض (Latitude)</Label>
              <Input
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="33.705"
                dir="ltr"
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">خط الطول (Longitude)</Label>
              <Input
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="8.971"
                dir="ltr"
                className="text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Status & Website Visibility */}
        <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-1.5 border-b border-border/50 pb-2">
            <Star className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground">
              4. الحالة والظهور على الموقع العام
            </h4>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs font-semibold text-foreground">تفعيل الفرع ونشره على الموقع</p>
              <p className="text-[11px] text-muted-foreground">
                عند التفعيل، يظهر الفرع فوراً في صفحة الفروع، الخريطة التفاعلية، والفوتير.
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <div>
              <p className="text-xs font-semibold text-foreground">تعيين كفرع رئيسي للوكالة</p>
              <p className="text-[11px] text-muted-foreground">
                الفرع الرئيسي يتميز بشارة خاصة ويُعرض كأول خيار في التواصل ومقدمة الفروع.
              </p>
            </div>
            <Switch
              checked={formData.is_main_branch}
              onCheckedChange={(checked) => setFormData({ ...formData, is_main_branch: checked })}
            />
          </div>
        </div>
      </div>
    </Drawer>
  );
}
