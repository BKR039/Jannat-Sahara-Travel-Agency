import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Archive,
  RotateCcw,
  Trash2,
  Users,
  Inbox,
  Package as PackageIcon,
  AlertCircle,
  ShieldAlert,
  Info,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { adminDocTitle } from "@/lib/admin/doc-title";
import {
  getArchiveCounts,
  listArchivedRecordsFn,
  restoreRecordFn,
  checkDependenciesFn,
  permanentDeleteRecordFn,
} from "@/lib/admin/archive.functions";
import type {
  ArchiveEntityType,
  ArchiveSubType,
  ArchivedRecord,
} from "@/lib/admin/archive.server";
import {
  Page,
  Panel,
  EmptyState,
  SkeletonRows,
  ErrorState,
  SearchInput,
  relativeDate,
  shortDate,
  money,
  useDebounced,
} from "@/components/admin/kit";
import { PermissionGate } from "@/components/admin/kit/PermissionGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/archive")({
  head: () => ({
    meta: [
      { title: adminDocTitle("archive") || "الأرشيف | جنات الصحراء" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminArchivePage,
});

const ENTITY_TYPE_LABELS: Record<ArchiveEntityType, { label: string; icon: typeof Users; color: string }> = {
  client: {
    label: "عميل",
    icon: Users,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  },
  request: {
    label: "طلب / حجز",
    icon: Inbox,
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  },
  trip: {
    label: "رحلة / باقة",
    icon: PackageIcon,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
};

function AdminArchivePage() {
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState<ArchiveEntityType | "all">("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);

  // Modals state
  const [recordToRestore, setRecordToRestore] = useState<ArchivedRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<ArchivedRecord | null>(null);
  const [blockedDeleteRecord, setBlockedDeleteRecord] = useState<{
    record: ArchivedRecord;
    reason: string;
    dependencies: Record<string, number>;
  } | null>(null);
  const [confirmationInput, setConfirmationInput] = useState("");

  // Server functions
  const fetchCounts = useServerFn(getArchiveCounts);
  const fetchList = useServerFn(listArchivedRecordsFn);
  const restoreFn = useServerFn(restoreRecordFn);
  const checkDepFn = useServerFn(checkDependenciesFn);
  const deleteFn = useServerFn(permanentDeleteRecordFn);

  // Queries
  const countsQuery = useQuery({
    queryKey: ["admin-archive-counts"],
    queryFn: () => fetchCounts(),
    staleTime: 15_000,
  });

  const listQuery = useQuery({
    queryKey: ["admin-archive-list", selectedType, debouncedSearch],
    queryFn: () =>
      fetchList({
        data: {
          entityType: selectedType,
          search: debouncedSearch,
          limit: 150,
          offset: 0,
        },
      }),
  });

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["admin-archive-counts"] });
    qc.invalidateQueries({ queryKey: ["admin-archive-list"] });
    qc.invalidateQueries({ queryKey: ["admin-customers"] });
    qc.invalidateQueries({ queryKey: ["admin-requests"] });
    qc.invalidateQueries({ queryKey: ["admin-packages"] });
    qc.invalidateQueries({ queryKey: ["packages"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
  }

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (record: ArchivedRecord) => {
      return await restoreFn({
        data: {
          entityType: record.entityType,
          subType: record.subType,
          id: record.id,
        },
      });
    },
    onSuccess: () => {
      toast.success("تمت استعادة السجل بنجاح");
      setRecordToRestore(null);
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message || "فشلت استعادة السجل"),
  });

  // Permanent Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (record: ArchivedRecord) => {
      return await deleteFn({
        data: {
          entityType: record.entityType,
          subType: record.subType,
          id: record.id,
        },
      });
    },
    onSuccess: () => {
      toast.success("تم حذف السجل نهائياً بنجاح");
      setRecordToDelete(null);
      setConfirmationInput("");
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message || "فشل حذف السجل نهائياً"),
  });

  // Handle click on Permanent Delete: check dependencies first
  async function handleDeleteClick(record: ArchivedRecord) {
    try {
      const verdict = await checkDepFn({
        data: {
          entityType: record.entityType,
          subType: record.subType,
          id: record.id,
        },
      });

      if (!verdict.canDelete) {
        setBlockedDeleteRecord({
          record,
          reason: verdict.reason || "توجد ارتباطات تشغيلية تمنع الحذف النهائي",
          dependencies: verdict.dependencies || {},
        });
        return;
      }

      setConfirmationInput("");
      setRecordToDelete(record);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فحص الارتباطات غير متاح حالياً";
      toast.error(msg);
    }
  }

  const counts = countsQuery.data ?? { total: 0, clients: 0, requests: 0, trips: 0 };
  const records: ArchivedRecord[] = ((listQuery.data as unknown as { records?: ArchivedRecord[] })?.records) ?? [];

  return (
    <PermissionGate permission="archive.view">
      <Page
        title="الأرشيف"
        description="السجلات المؤرشفة التي لم تعد ضمن العمليات الحالية"
      >
        {/* Top-Level Real Database Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-card border border-border-subtle bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-caption font-medium text-muted-foreground">إجمالي السجلات المؤرشفة</span>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-h3 font-bold tabular-nums text-foreground">
              {counts.total}
            </p>
          </div>

          <div className="rounded-card border border-border-subtle bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-caption font-medium text-muted-foreground">العملاء المؤرشفون</span>
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="mt-2 text-h3 font-bold tabular-nums text-foreground">
              {counts.clients}
            </p>
          </div>

          <div className="rounded-card border border-border-subtle bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-caption font-medium text-muted-foreground">الطلبات المؤرشفة</span>
              <Inbox className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="mt-2 text-h3 font-bold tabular-nums text-foreground">
              {counts.requests}
            </p>
          </div>

          <div className="rounded-card border border-border-subtle bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-caption font-medium text-muted-foreground">الرحلات المؤرشفة</span>
              <PackageIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="mt-2 text-h3 font-bold tabular-nums text-foreground">
              {counts.trips}
            </p>
          </div>
        </div>

        {/* Filter Surface */}
        <Panel className="mb-4" bodyClassName="p-3 sm:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="اسم العميل، رقم الهاتف، رقم الطلب، أو اسم الرحلة..."
              className="md:min-w-[280px] md:flex-1"
            />

            <div className="flex flex-wrap items-center gap-1.5 border-t border-border-subtle pt-2 md:border-t-0 md:pt-0">
              <Button
                variant={selectedType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("all")}
              >
                الكل ({counts.total})
              </Button>
              <Button
                variant={selectedType === "client" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("client")}
              >
                العملاء ({counts.clients})
              </Button>
              <Button
                variant={selectedType === "request" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("request")}
              >
                الطلبات ({counts.requests})
              </Button>
              <Button
                variant={selectedType === "trip" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("trip")}
              >
                الرحلات ({counts.trips})
              </Button>
            </div>
          </div>
        </Panel>

        {/* Records Table / List */}
        <Panel bodyClassName="p-0">
          {listQuery.isLoading ? (
            <div className="p-4">
              <SkeletonRows rows={6} />
            </div>
          ) : listQuery.isError ? (
            <div className="p-6">
              <ErrorState onRetry={() => listQuery.refetch()} />
            </div>
          ) : records.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Archive}
                title="لا توجد سجلات مؤرشفة"
                description={
                  debouncedSearch
                    ? "لم يتم العثور على سجلات تطابق معايير البحث."
                    : "لا توجد سجلات مؤرشفة حالياً في هذا القسم."
                }
              />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                      <th className="py-3 px-4 text-start font-semibold">نوع السجل</th>
                      <th className="py-3 px-4 text-start font-semibold">المعرّف والعنوان</th>
                      <th className="py-3 px-4 text-start font-semibold">تفاصيل إضافية</th>
                      <th className="py-3 px-4 text-start font-semibold">تاريخ الأرشفة</th>
                      <th className="py-3 px-4 text-start font-semibold">مؤرشف بواسطة</th>
                      <th className="py-3 px-4 text-end font-semibold">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {records.map((r) => {
                      const entityCfg = ENTITY_TYPE_LABELS[r.entityType];
                      const Icon = entityCfg.icon;

                      const actionItems: ActionMenuItem[] = [
                        {
                          key: "restore",
                          label: "استرجاع السجل",
                          icon: RotateCcw,
                          onClick: () => setRecordToRestore(r),
                        },
                        {
                          key: "delete",
                          label: "حذف نهائي",
                          icon: Trash2,
                          destructive: true,
                          separatorBefore: true,
                          onClick: () => handleDeleteClick(r),
                        },
                      ];

                      return (
                        <tr key={`${r.entityType}-${r.id}`} className="transition-colors hover:bg-muted/40">
                          {/* Type */}
                          <td className="py-3.5 px-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
                                entityCfg.color,
                              )}
                            >
                              <Icon className="h-3 w-3" />
                              {entityCfg.label}
                            </span>
                          </td>

                          {/* Identifier & Title */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground text-sm">
                                {r.title}
                              </span>
                              <div className="mt-0.5 flex items-center gap-2 text-muted-foreground text-[11px]">
                                <span className="font-mono bg-muted/50 px-1.5 py-0.2 rounded">
                                  {r.identifier}
                                </span>
                                {r.subtitle && <span>· {r.subtitle}</span>}
                              </div>
                            </div>
                          </td>

                          {/* Metadata */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5 text-muted-foreground text-[11px]">
                              {r.metadata.phone && (
                                <div className="font-mono text-foreground/80" dir="ltr">
                                  {r.metadata.phone}
                                </div>
                              )}
                              {r.metadata.email && (
                                <div className="truncate max-w-[160px]">{r.metadata.email}</div>
                              )}
                              {r.metadata.amount != null && (
                                <div className="font-semibold text-foreground">
                                  {money(Number(r.metadata.amount), (r.metadata.currency as string) || "TND")}
                                </div>
                              )}
                              {r.metadata.destination && (
                                <div>الوجهة: {String(r.metadata.destination)}</div>
                              )}
                            </div>
                          </td>

                          {/* Archived Date */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5 text-[11px]">
                              <span className="font-medium text-foreground">
                                {shortDate(r.archivedAt)}
                              </span>
                              <div className="text-muted-foreground text-[10px]">
                                {relativeDate(r.archivedAt)}
                              </div>
                            </div>
                          </td>

                          {/* Archived By & Reason */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5 text-[11px]">
                              <span className="font-medium text-foreground">
                                {r.archivedByName || r.archivedBy || "مسؤول النظام"}
                              </span>
                              {r.archiveReason && (
                                <p className="text-muted-foreground text-[10px] truncate max-w-[180px]" title={r.archiveReason}>
                                  السبب: {r.archiveReason}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-end">
                            <ActionMenu items={actionItems} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="divide-y divide-border/60 md:hidden">
                {records.map((r) => {
                  const entityCfg = ENTITY_TYPE_LABELS[r.entityType];
                  const Icon = entityCfg.icon;

                  const actionItems: ActionMenuItem[] = [
                    {
                      key: "restore",
                      label: "استرجاع السجل",
                      icon: RotateCcw,
                      onClick: () => setRecordToRestore(r),
                    },
                    {
                      key: "delete",
                      label: "حذف نهائي",
                      icon: Trash2,
                      destructive: true,
                      separatorBefore: true,
                      onClick: () => handleDeleteClick(r),
                    },
                  ];

                  return (
                    <div key={`m-${r.entityType}-${r.id}`} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
                              entityCfg.color,
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {entityCfg.label}
                          </span>
                          <h3 className="font-semibold text-foreground text-sm">{r.title}</h3>
                          <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                            {r.identifier}
                          </span>
                        </div>
                        <ActionMenu items={actionItems} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
                        <div>
                          <span className="text-[10px] text-muted-foreground/70 block">تاريخ الأرشفة</span>
                          <span className="text-foreground">{shortDate(r.archivedAt)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground/70 block">مؤرشف بواسطة</span>
                          <span className="text-foreground truncate block">
                            {r.archivedByName || "مسؤول النظام"}
                          </span>
                        </div>
                      </div>

                      {r.archiveReason && (
                        <p className="text-caption text-muted-foreground bg-muted/30 p-2 rounded">
                          السبب: {r.archiveReason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Panel>

        {/* 1. Restore Confirmation Dialog */}
        <AlertDialog
          open={!!recordToRestore}
          onOpenChange={(open) => !open && setRecordToRestore(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>استرجاع السجل من الأرشيف</AlertDialogTitle>
              <AlertDialogDescription>
                هل تريد استعادة «{recordToRestore?.title}» وإعادته إلى قائمة العمليات النشطة؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                disabled={restoreMutation.isPending}
                onClick={() => recordToRestore && restoreMutation.mutate(recordToRestore)}
              >
                {restoreMutation.isPending ? "جاري الاستعادة..." : "تأكيد الاسترجاع"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 2. Blocked Delete Dialog (Dependencies Protection) */}
        <Dialog
          open={!!blockedDeleteRecord}
          onOpenChange={(open) => !open && setBlockedDeleteRecord(null)}
        >
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="h-5 w-5" />
                <DialogTitle>تعذر الحذف النهائي لوجود ارتباطات</DialogTitle>
              </div>
              <DialogDescription className="mt-2 text-foreground/90">
                {blockedDeleteRecord?.reason}
              </DialogDescription>
            </DialogHeader>

            <div className="my-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs space-y-1.5 text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="h-4 w-4 text-amber-500" />
                لماذا يتم منع الحذف؟
              </div>
              <p>
                تفرض قواعد النظام الحفاظ التام على السجلات المالية والمحاسبية وحجوزات المسافرين لضمان النزاهة القانونية والعملياتية وعدم تدمير التاريخ التشغيلي.
              </p>
              <p className="font-medium text-foreground">
                يمكنك إبقاء هذا السجل في الأرشيف؛ فهو معزول تماماً عن قوائم العمليات النشطة ولا يظهر للموظفين إلا عند البحث في الأرشيف.
              </p>
            </div>

            <DialogFooter>
              <Button variant="default" onClick={() => setBlockedDeleteRecord(null)}>
                فهمت، الإبقاء في الأرشيف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 3. Permanent Delete Confirmation Dialog */}
        <AlertDialog
          open={!!recordToDelete}
          onOpenChange={(open) => {
            if (!open) {
              setRecordToDelete(null);
              setConfirmationInput("");
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDialogTitle>تأكيد الحذف النهائي والدائم</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="space-y-2 mt-2">
                <p>
                  أنت على وشك حذف السجل «<strong>{recordToDelete?.title}</strong>» المعرّف بـ (
                  <span className="font-mono text-foreground font-semibold">
                    {recordToDelete?.identifier}
                  </span>
                  ) بشكل نهائي من قاعدة البيانات.
                </p>
                <p className="font-bold text-destructive">
                  تحذير: لا يمكن التراجع عن هذا الإجراء إطلاقاً بعد تنفيذه.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="my-2 space-y-2">
              <label className="text-caption font-semibold text-foreground block">
                لتأكيد الحذف، اكتب كلمة <span className="font-mono text-destructive font-bold">حذف</span> أدناه:
              </label>
              <Input
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="اكتب كلمة: حذف"
                className="font-medium"
              />
            </div>

            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmationInput.trim() !== "حذف" || deleteMutation.isPending}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                onClick={() => recordToDelete && deleteMutation.mutate(recordToDelete)}
              >
                {deleteMutation.isPending ? "جاري الحذف..." : "حذف نهائياً"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Page>
    </PermissionGate>
  );
}
