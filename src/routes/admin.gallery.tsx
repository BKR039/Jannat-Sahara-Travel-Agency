import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Upload,
  ImageIcon,
  Eye,
  FolderInput,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
  RotateCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  EmptyState,
  ErrorState,
  FilterTabs,
  Page,
  Panel,
  SearchInput,
  SkeletonRows,
  StatusSwitch,
  useDebounced,
} from "@/components/admin/kit";
import { ImageLightbox } from "@/components/common/ImageLightbox";
import { uploadMedia, deleteMediaByUrl } from "@/lib/admin/media";
import type { Database } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/gallery")({
  ssr: false,
  head: () => ({
    meta: [{ title: adminDocTitle("gallery") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: GalleryAdminPage,
});

type Item = Database["public"]["Tables"]["gallery_items"]["Row"];

interface QueuedFile {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB limit
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

/**
 * Concurrency helper to run async operations with a maximum concurrency limit.
 */
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

function GalleryAdminPage() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();

  // Gallery items query
  const list = useQuery({
    queryKey: ["admin-gallery"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Item[];
    },
    staleTime: 30_000,
  });

  // Package suggestions query (for easy group selection)
  const packagesQ = useQuery({
    queryKey: ["admin-packages-groups"] as const,
    queryFn: async () => {
      const { data } = await supabase
        .from("packages")
        .select("title")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      return Array.from(new Set((data ?? []).map((p) => p.title).filter(Boolean))) as string[];
    },
    staleTime: 120_000,
  });

  const items = useMemo(() => list.data ?? [], [list.data]);

  // Compute distinct groups with their image counts
  const groupStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const grp = item.category?.trim() || "";
      if (grp) {
        map.set(grp, (map.get(grp) || 0) + 1);
      }
    }
    return map;
  }, [items]);

  const existingGroups = useMemo(() => Array.from(groupStats.keys()), [groupStats]);

  // Combined suggestions: existing gallery groups + active package titles
  const allSuggestedGroups = useMemo(() => {
    const set = new Set<string>(existingGroups);
    for (const p of packagesQ.data ?? []) {
      if (p) set.add(p);
    }
    return Array.from(set);
  }, [existingGroups, packagesQ.data]);

  // State: Filters & Search
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);

  // State: Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // State: Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [singleDeleteItem, setSingleDeleteItem] = useState<Item | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [moveModalState, setMoveModalState] = useState<{
    open: boolean;
    ids: string[];
    currentGroup?: string;
  }>({ open: false, ids: [] });

  const [pendingGalleryId, setPendingGalleryId] = useState<string | null>(null);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-gallery"] });
    qc.invalidateQueries({ queryKey: ["admin-gallery-categories"] });
    qc.invalidateQueries({ queryKey: ["gallery"] });
  }

  // Filter items
  const filtered = useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter === "active" && !i.active) return false;
      if (statusFilter === "inactive" && i.active) return false;
      if (selectedGroup !== "all" && (i.category?.trim() || "") !== selectedGroup) return false;
      if (!needle) return true;
      return [i.title, i.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [items, statusFilter, selectedGroup, debounced]);

  // Selection handlers
  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  }

  function toggleItemSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Single Item Delete Mutation
  const singleDeleteMutation = useMutation({
    mutationFn: async (item: Item) => {
      const { error } = await supabase.from("gallery_items").delete().eq("id", item.id);
      if (error) throw error;
      await deleteMediaByUrl(item.image);
    },
    onSuccess: () => {
      toast.success(t("content.gallery.toasts.deletedCount", { count: 1 }));
      setSingleDeleteItem(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (singleDeleteItem) next.delete(singleDeleteItem.id);
        return next;
      });
      invalidate();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setSingleDeleteItem(null);
    },
  });

  // Bulk Delete Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const itemsToDelete = items.filter((i) => ids.includes(i.id));
      const { error } = await supabase.from("gallery_items").delete().in("id", ids);
      if (error) throw error;

      // Clean up storage for deleted images
      for (const item of itemsToDelete) {
        try {
          await deleteMediaByUrl(item.image);
        } catch (err) {
          console.warn("Storage deletion warning for item:", item.id, err);
        }
      }
    },
    onSuccess: (_r, ids) => {
      toast.success(t("content.gallery.toasts.deletedCount", { count: ids.length }));
      setSelectedIds(new Set());
      setBulkDeleteConfirmOpen(false);
      invalidate();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setBulkDeleteConfirmOpen(false);
    },
  });

  // Bulk / Single Move Mutation
  const moveGroupMutation = useMutation({
    mutationFn: async ({ ids, targetGroup }: { ids: string[]; targetGroup: string }) => {
      const cleanGroup = targetGroup.trim();
      const { error } = await supabase
        .from("gallery_items")
        .update({ category: cleanGroup || null })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_r, vars) => {
      toast.success(t("content.gallery.toasts.movedCount", { count: vars.ids.length }));
      setMoveModalState({ open: false, ids: [] });
      setSelectedIds(new Set());
      invalidate();
    },
    onError: (e: Error) => {
      toast.error(e.message || t("content.gallery.toasts.saveFailed"));
    },
  });

  // Toggle Single Active Status
  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("gallery_items").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      toast.success(
        t(v.active ? "content.services.toasts.activated" : "content.services.toasts.deactivated"),
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "فشل تحديث حالة الصورة"),
    onSettled: () => setPendingGalleryId(null),
  });

  // Bulk Toggle Active Status
  const bulkToggleActiveMutation = useMutation({
    mutationFn: async ({ ids, active }: { ids: string[]; active: boolean }) => {
      const { error } = await supabase.from("gallery_items").update({ active }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      toast.success(
        t(v.active ? "content.services.toasts.activated" : "content.services.toasts.deactivated"),
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || t("content.gallery.toasts.saveFailed")),
  });

  return (
    <Page
      title={t("content.gallery.pageTitle")}
      description={t("content.gallery.pageDescription")}
      actions={
        <Button onClick={() => setIsUploadOpen(true)} className="shadow-sm">
          <Plus className="me-2 h-4 w-4" />
          {t("content.gallery.addImages")}
        </Button>
      }
    >
      {/* ----------------- FILTER AND SEARCH BAR ----------------- */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <FilterTabs
          value={statusFilter}
          onChange={setStatusFilter}
          tabs={[
            { value: "all", label: t("content.services.filters.all"), count: items.length },
            {
              value: "active",
              label: t("content.services.filters.active"),
              count: items.filter((r) => r.active).length,
            },
            {
              value: "inactive",
              label: t("content.services.filters.inactive"),
              count: items.filter((r) => !r.active).length,
            },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2 lg:ms-auto">
          {/* Group Filter Dropdown */}
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-full sm:w-[220px] h-11 bg-card">
              <SelectValue placeholder={t("content.gallery.allGroups")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("content.gallery.allGroups")} ({items.length})
              </SelectItem>
              {existingGroups.map((grp) => (
                <SelectItem key={grp} value={grp}>
                  {grp} ({groupStats.get(grp) ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t("content.services.searchPlaceholder")}
            className="w-full sm:w-64"
          />
        </div>
      </div>

      {/* ----------------- BULK ACTIONS BAR (When items selected) ----------------- */}
      {selectedIds.size > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 shadow-sm transition-all animate-in fade-in">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allFilteredSelected}
              onCheckedChange={toggleSelectAll}
              id="select-all-floating"
            />
            <Label
              htmlFor="select-all-floating"
              className="text-small font-semibold text-foreground cursor-pointer"
            >
              {t("content.gallery.selectedCount", { count: selectedIds.size })}
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="h-8 px-2 text-caption text-muted-foreground hover:text-foreground"
            >
              {t("content.gallery.clearSelection")}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Move to Group Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setMoveModalState({
                  open: true,
                  ids: Array.from(selectedIds),
                  currentGroup: selectedGroup !== "all" ? selectedGroup : undefined,
                })
              }
              className="h-9 gap-1.5 bg-card hover:bg-accent"
            >
              <FolderInput className="h-4 w-4 text-primary" />
              {t("content.gallery.moveToGroup")}
            </Button>

            {/* Toggle Status Bulk */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const anyInactive = items
                  .filter((i) => selectedIds.has(i.id))
                  .some((i) => !i.active);
                bulkToggleActiveMutation.mutate({
                  ids: Array.from(selectedIds),
                  active: anyInactive,
                });
              }}
              disabled={bulkToggleActiveMutation.isPending}
              className="h-9 gap-1.5 bg-card hover:bg-accent"
            >
              <RotateCw className="h-4 w-4" />
              {items.filter((i) => selectedIds.has(i.id)).some((i) => !i.active)
                ? t("content.services.toasts.activated")
                : t("content.services.toasts.deactivated")}
            </Button>

            {/* Bulk Delete Button */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteConfirmOpen(true)}
              disabled={bulkDeleteMutation.isPending}
              className="h-9 gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              {t("content.gallery.bulkDelete")}
            </Button>
          </div>
        </div>
      )}

      {/* ----------------- MEDIA LIBRARY GRID ----------------- */}
      <Panel className="mt-4" bodyClassName="p-4 sm:p-5">
        {list.isLoading ? (
          <SkeletonRows rows={4} />
        ) : list.isError ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              items.length === 0 ? t("content.gallery.empty") : t("content.gallery.emptyInGroup")
            }
            description={
              items.length === 0
                ? "ارفع صورك ونظمها ضمن مجموعات لعرضها في معرض الموقع."
                : t("content.services.noMatchDescription")
            }
            icon={ImageIcon}
            action={
              <Button onClick={() => setIsUploadOpen(true)}>
                <Plus className="me-2 h-4 w-4" />
                {t("content.gallery.addImages")}
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {/* Quick selection bar above grid */}
            <div className="flex items-center justify-between text-caption text-muted-foreground border-b border-border-subtle pb-2.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={toggleSelectAll}
                  id="select-all-header"
                />
                <label
                  htmlFor="select-all-header"
                  className="cursor-pointer select-none font-medium hover:text-foreground"
                >
                  {allFilteredSelected
                    ? t("content.gallery.deselectAll")
                    : t("content.gallery.selectAll")}
                </label>
              </div>
              <span className="tabular-nums">
                {t("content.gallery.itemsCount", { count: filtered.length })}
              </span>
            </div>

            {/* Grid of Cards */}
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 select-none shadow-sm",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30 shadow-md"
                        : "border-border-subtle hover:border-primary/40",
                    )}
                  >
                    {/* Image Thumbnail Container */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-sunken">
                      <img
                        src={item.image}
                        alt={item.title || item.category || "صورة المعرض"}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />

                      {/* Select Checkbox (always visible if selected, otherwise visible on hover) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItemSelection(item.id);
                        }}
                        className={cn(
                          "absolute top-2 start-2 z-10 flex h-6 w-6 items-center justify-center rounded-md backdrop-blur-md transition-opacity cursor-pointer shadow-sm",
                          isSelected
                            ? "bg-primary text-primary-foreground opacity-100"
                            : "bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60",
                        )}
                        aria-label="تحديد الصورة"
                      >
                        {isSelected ? (
                          <Check className="h-4 w-4 stroke-[2.5]" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-sm border border-white" />
                        )}
                      </button>

                      {/* Group Badge Overlay */}
                      {item.category && (
                        <span className="absolute top-2 end-2 max-w-[80%] truncate rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[11px] font-medium text-white shadow-sm">
                          {item.category}
                        </span>
                      )}

                      {/* Quick Hover Action Overlay: View Fullscreen */}
                      <button
                        type="button"
                        onClick={() => setLightboxSrc(item.image)}
                        className="absolute bottom-2 end-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        title={t("content.gallery.preview")}
                        aria-label={t("content.gallery.preview")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Card Footer: Status & Actions */}
                    <div className="flex items-center justify-between gap-1 p-2 bg-card border-t border-border-subtle">
                      <StatusSwitch
                        checked={Boolean(item.active)}
                        disabled={toggleActive.isPending && pendingGalleryId === item.id}
                        isPending={toggleActive.isPending && pendingGalleryId === item.id}
                        onCheckedChange={(active) => {
                          setPendingGalleryId(item.id);
                          toggleActive.mutate({ id: item.id, active });
                        }}
                        activeLabel={t("content.common.active")}
                        inactiveLabel={t("content.common.hidden")}
                        ariaLabel={t("content.common.toggleActive")}
                      />

                      <div className="flex items-center gap-0.5">
                        {/* Move Group Button */}
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground"
                          title={t("content.gallery.changeGroup")}
                          aria-label={t("content.gallery.changeGroup")}
                          onClick={() =>
                            setMoveModalState({
                              open: true,
                              ids: [item.id],
                              currentGroup: item.category || undefined,
                            })
                          }
                        >
                          <FolderInput className="h-3.5 w-3.5" />
                        </Button>

                        {/* Delete Button */}
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          title={t("content.common.delete")}
                          aria-label={t("content.common.delete")}
                          onClick={() => setSingleDeleteItem(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      {/* ----------------- BULK UPLOAD MODAL ----------------- */}
      <BulkUploadDialog
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        suggestedGroups={allSuggestedGroups}
        defaultGroup={selectedGroup !== "all" ? selectedGroup : ""}
        onUploadSuccess={() => {
          invalidate();
        }}
      />

      {/* ----------------- MOVE GROUP MODAL ----------------- */}
      <MoveGroupDialog
        open={moveModalState.open}
        onClose={() => setMoveModalState({ open: false, ids: [] })}
        itemCount={moveModalState.ids.length}
        suggestedGroups={allSuggestedGroups}
        currentGroup={moveModalState.currentGroup}
        onConfirm={(targetGroup) => {
          moveGroupMutation.mutate({ ids: moveModalState.ids, targetGroup });
        }}
        isPending={moveGroupMutation.isPending}
      />

      {/* ----------------- SINGLE DELETE CONFIRMATION ----------------- */}
      <AlertDialog open={!!singleDeleteItem} onOpenChange={(o) => !o && setSingleDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.gallery.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("content.gallery.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("ops.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => singleDeleteItem && singleDeleteMutation.mutate(singleDeleteItem)}
              disabled={singleDeleteMutation.isPending}
            >
              {singleDeleteMutation.isPending ? t("content.common.saving") : t("ops.common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ----------------- BULK DELETE CONFIRMATION ----------------- */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("content.gallery.bulkDeleteConfirmTitle", { count: selectedIds.size })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("content.gallery.bulkDeleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("ops.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? t("content.common.saving")
                : t("content.gallery.bulkDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ----------------- LIGHTBOX PREVIEW ----------------- */}
      <ImageLightbox src={lightboxSrc} alt="معاينة الصورة" onClose={() => setLightboxSrc(null)} />
    </Page>
  );
}

/* ========================================================================= */
/*                         BULK UPLOAD DIALOG COMPONENT                      */
/* ========================================================================= */

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  suggestedGroups: string[];
  defaultGroup?: string;
  onUploadSuccess: () => void;
}

function BulkUploadDialog({
  open,
  onClose,
  suggestedGroups,
  defaultGroup = "",
  onUploadSuccess,
}: BulkUploadDialogProps) {
  const { t } = useTranslation("admin");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [selectedGroupChoice, setSelectedGroupChoice] = useState<string>(defaultGroup || "");
  const [customGroupName, setCustomGroupName] = useState<string>("");
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStats, setUploadStats] = useState<{
    uploaded: number;
    failed: number;
    total: number;
  }>({
    uploaded: 0,
    failed: 0,
    total: 0,
  });

  // Keep chosen group synced with default if opened while filtered
  useEffect(() => {
    if (open) {
      if (defaultGroup) {
        setSelectedGroupChoice(defaultGroup);
        setIsCreatingNewGroup(false);
      } else if (suggestedGroups.length > 0) {
        setSelectedGroupChoice(suggestedGroups[0]);
        setIsCreatingNewGroup(false);
      } else {
        setIsCreatingNewGroup(true);
      }
      setQueue([]);
      setUploadStats({ uploaded: 0, failed: 0, total: 0 });
      setIsUploading(false);
    }
  }, [open, defaultGroup, suggestedGroups]);

  // Clean up object URLs when unmounting or clearing
  useEffect(() => {
    return () => {
      queue.forEach((q) => URL.revokeObjectURL(q.previewUrl));
    };
  }, [queue]);

  function handleFilesSelected(files: FileList | File[]) {
    const newItems: QueuedFile[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        toast.error(t("content.gallery.toasts.invalidFormat", { name: file.name }));
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(t("content.gallery.toasts.fileTooLarge", { name: file.name }));
        continue;
      }

      newItems.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending",
      });
    }

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
    }
  }

  function removeQueuedItem(id: string) {
    if (isUploading) return;
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  const effectiveGroup = isCreatingNewGroup ? customGroupName.trim() : selectedGroupChoice.trim();

  const canUpload =
    queue.length > 0 &&
    effectiveGroup.length > 0 &&
    !isUploading &&
    queue.some((i) => i.status === "pending" || i.status === "error");

  async function startUpload() {
    if (!effectiveGroup) {
      toast.error(t("content.gallery.toasts.groupRequired"));
      return;
    }

    const itemsToUpload = queue.filter((i) => i.status === "pending" || i.status === "error");
    if (itemsToUpload.length === 0) return;

    setIsUploading(true);
    setUploadStats({
      uploaded: 0,
      failed: 0,
      total: itemsToUpload.length,
    });

    let uploadedCount = 0;
    let failedCount = 0;

    // Use concurrency of 3 uploads simultaneously for optimal bandwidth & UI responsiveness
    await runWithConcurrency(itemsToUpload, 3, async (item) => {
      // Mark as uploading in UI
      setQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "uploading", error: undefined } : i)),
      );

      try {
        const publicUrl = await uploadMedia(item.file, "gallery");

        // Insert database row without per-image metadata requirements
        const { error } = await supabase.from("gallery_items").insert({
          image: publicUrl,
          category: effectiveGroup,
          active: true,
          sort_order: 0,
          title: null,
          title_fr: null,
          title_en: null,
        });

        if (error) throw error;

        uploadedCount++;
        setQueue((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "done" } : i)));
      } catch (err) {
        failedCount++;
        const message = err instanceof Error ? err.message : "Upload error";
        setQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "error", error: message } : i)),
        );
      } finally {
        setUploadStats((prev) => ({
          ...prev,
          uploaded: uploadedCount,
          failed: failedCount,
        }));
      }
    });

    setIsUploading(false);

    if (failedCount === 0) {
      toast.success(t("content.gallery.toasts.uploadedCount", { count: uploadedCount }));
      onUploadSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      toast.warning(
        `تم رفع ${uploadedCount} صورة بنجاح. فشل رفع ${failedCount} صورة. يمكنك إعادة المحاولة.`,
      );
      onUploadSuccess();
    }
  }

  const allDone = queue.length > 0 && queue.every((i) => i.status === "done");
  const percent =
    uploadStats.total > 0
      ? Math.round(((uploadStats.uploaded + uploadStats.failed) / uploadStats.total) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isUploading && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border-subtle">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            {t("content.gallery.addImages")}
          </DialogTitle>
          <DialogDescription>
            حدد صورة أو عدة صور، اختر المجموعة، ثم ارفعها دفعة واحدة.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* GROUP SELECTOR (REQUIRED) */}
          <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-small font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" />
                {t("content.gallery.group")} *
              </Label>
              <button
                type="button"
                onClick={() => setIsCreatingNewGroup((v) => !v)}
                className="text-caption font-medium text-primary hover:underline"
              >
                {isCreatingNewGroup
                  ? "← اختيار من المجموعات الحالية"
                  : t("content.gallery.newGroup")}
              </button>
            </div>

            {isCreatingNewGroup ? (
              <div className="space-y-1.5">
                <Input
                  value={customGroupName}
                  onChange={(e) => setCustomGroupName(e.target.value)}
                  placeholder={t("content.gallery.newGroupPlaceholder")}
                  autoFocus
                  disabled={isUploading}
                  className="bg-card h-11"
                />
                <p className="text-caption text-muted-foreground">
                  أدخل اسم المجموعة، مثل: «عمرة جانفي 2027» أو «الرحلات».
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Select
                  value={selectedGroupChoice}
                  onValueChange={(val) => {
                    if (val === "__NEW__") {
                      setIsCreatingNewGroup(true);
                    } else {
                      setSelectedGroupChoice(val);
                    }
                  }}
                  disabled={isUploading}
                >
                  <SelectTrigger className="bg-card h-11">
                    <SelectValue placeholder={t("content.gallery.groupPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {suggestedGroups.map((grp) => (
                      <SelectItem key={grp} value={grp}>
                        {grp}
                      </SelectItem>
                    ))}
                    <SelectItem value="__NEW__" className="font-semibold text-primary">
                      {t("content.gallery.newGroup")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* DROPZONE */}
          {!allDone && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200",
                isDragOver
                  ? "border-primary bg-primary/10 scale-[0.99]"
                  : "border-border-subtle bg-surface-sunken/20 hover:border-primary/50 hover:bg-surface-sunken/40",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                className="sr-only"
                disabled={isUploading}
                onChange={(e) => {
                  if (e.target.files) handleFilesSelected(e.target.files);
                  e.target.value = "";
                }}
              />
              <div className="rounded-full bg-primary/10 p-3 mb-2 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-small font-semibold text-foreground">
                {t("content.gallery.dropzoneTitle")}
              </p>
              <p className="mt-1 text-caption text-muted-foreground">
                {t("content.gallery.dropzoneHint")}
              </p>
            </div>
          )}

          {/* UPLOAD PROGRESS BAR (When uploading or finished) */}
          {isUploading && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-between text-caption font-semibold">
                <span className="flex items-center gap-1.5 text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("content.gallery.uploading")}
                </span>
                <span className="tabular-nums">
                  {uploadStats.uploaded + uploadStats.failed} / {uploadStats.total} ({percent}%)
                </span>
              </div>
              <Progress value={percent} className="h-2" />
            </div>
          )}

          {/* SUCCESS BANNER */}
          {allDone && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-success/30 bg-success-muted/50 p-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-success mb-2" />
              <p className="text-small font-bold text-foreground">
                {t("content.gallery.uploadComplete", { count: queue.length })}
              </p>
              <p className="mt-1 text-caption text-muted-foreground">
                تمت إضافة جميع الصور إلى مجموعة «{effectiveGroup}» بنجاح.
              </p>
            </div>
          )}

          {/* PREVIEW GRID OF SELECTED IMAGES */}
          {queue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-caption">
                <span className="font-semibold text-foreground">
                  {t("content.gallery.selectedCount", { count: queue.length })}
                </span>
                {!isUploading && !allDone && (
                  <button
                    type="button"
                    onClick={() => {
                      queue.forEach((i) => URL.revokeObjectURL(i.previewUrl));
                      setQueue([]);
                    }}
                    className="text-destructive hover:underline text-caption"
                  >
                    {t("content.gallery.clearSelection")}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-[320px] overflow-y-auto p-1 border border-border-subtle rounded-lg bg-surface-sunken/10">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-border-subtle bg-surface-sunken shadow-sm"
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="h-full w-full object-cover"
                    />

                    {/* Remove button before upload */}
                    {!isUploading && item.status !== "done" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeQueuedItem(item.id);
                        }}
                        className="absolute top-1 end-1 rounded-full bg-black/70 p-1 text-white hover:bg-black transition-colors"
                        title="إزالة الصورة"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}

                    {/* Status Badge Overlays */}
                    {item.status === "uploading" && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center text-white">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    )}
                    {item.status === "done" && (
                      <div className="absolute inset-0 bg-success/30 backdrop-blur-[1px] flex items-center justify-center text-white">
                        <Check className="h-6 w-6 stroke-[3]" />
                      </div>
                    )}
                    {item.status === "error" && (
                      <div
                        className="absolute inset-0 bg-destructive/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-white p-1 text-center"
                        title={item.error}
                      >
                        <AlertCircle className="h-5 w-5" />
                        <span className="text-[10px] line-clamp-1 mt-0.5">فشل</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border-subtle bg-surface-sunken/30 flex items-center justify-between sm:justify-between">
          <div className="text-caption text-muted-foreground">
            {effectiveGroup && (
              <span>
                المجموعة: <strong className="text-foreground">{effectiveGroup}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
              {allDone ? "إغلاق" : t("ops.common.cancel")}
            </Button>

            {queue.some((i) => i.status === "error") && !isUploading && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startUpload}
                className="text-warning"
              >
                <RotateCw className="h-4 w-4" />
                {t("content.gallery.retryFailed")}
              </Button>
            )}

            {!allDone && (
              <Button
                type="button"
                size="sm"
                onClick={startUpload}
                disabled={!canUpload}
                className="min-w-[120px]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t("content.gallery.uploading")}
                  </>
                ) : (
                  t("content.gallery.uploadButton", {
                    count: queue.filter((i) => i.status !== "done").length,
                  })
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ========================================================================= */
/*                          MOVE GROUP DIALOG COMPONENT                      */
/* ========================================================================= */

interface MoveGroupDialogProps {
  open: boolean;
  onClose: () => void;
  itemCount: number;
  suggestedGroups: string[];
  currentGroup?: string;
  onConfirm: (group: string) => void;
  isPending: boolean;
}

function MoveGroupDialog({
  open,
  onClose,
  itemCount,
  suggestedGroups,
  currentGroup,
  onConfirm,
  isPending,
}: MoveGroupDialogProps) {
  const { t } = useTranslation("admin");
  const [targetChoice, setTargetChoice] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [isCustom, setIsCustom] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setCustomName("");
      const validChoice = suggestedGroups.find((g) => g !== currentGroup);
      if (validChoice) {
        setTargetChoice(validChoice);
        setIsCustom(false);
      } else {
        setIsCustom(true);
      }
    }
  }, [open, suggestedGroups, currentGroup]);

  const targetGroup = isCustom ? customName.trim() : targetChoice.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="h-5 w-5 text-primary" />
            {t("content.gallery.moveToGroup")}
          </DialogTitle>
          <DialogDescription>نقل {itemCount} صورة إلى مجموعة أخرى.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <Label className="text-small font-medium">
              {t("content.gallery.chooseDestinationGroup")}
            </Label>
            <button
              type="button"
              onClick={() => setIsCustom((v) => !v)}
              className="text-caption font-medium text-primary hover:underline"
            >
              {isCustom ? "← اختيار من المجموعات الحالية" : t("content.gallery.newGroup")}
            </button>
          </div>

          {isCustom ? (
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={t("content.gallery.newGroupPlaceholder")}
              autoFocus
              className="h-11"
            />
          ) : (
            <Select
              value={targetChoice}
              onValueChange={(val) => {
                if (val === "__NEW__") setIsCustom(true);
                else setTargetChoice(val);
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t("content.gallery.groupPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {suggestedGroups.map((grp) => (
                  <SelectItem key={grp} value={grp}>
                    {grp}
                  </SelectItem>
                ))}
                <SelectItem value="__NEW__" className="font-semibold text-primary">
                  {t("content.gallery.newGroup")}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            {t("ops.common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => targetGroup && onConfirm(targetGroup)}
            disabled={!targetGroup || isPending}
          >
            {isPending ? t("content.common.saving") : t("content.gallery.confirmMove")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
