import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createHotel,
  deleteHotel,
  listHotels,
  setHotelActive,
  updateHotel,
  HOTEL_AREAS,
} from "@/lib/admin/hotels.functions";
import {
  Drawer,
  EmptyState,
  ErrorState,
  FilterTabs,
  Page,
  Panel,
  SearchInput,
  SkeletonRows,
  useDebounced,
} from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { adminDocTitle } from "@/lib/admin/doc-title";

export const Route = createFileRoute("/admin/hotels")({
  ssr: false,
  head: () => ({
    meta: [{ title: adminDocTitle("hotels") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: HotelsPage,
});

type City = "makkah" | "madinah";

interface HotelRow {
  id: string;
  name: string;
  city: string;
  area: string | null;
  location: string | null;
  active: boolean;
  requestCount: number;
}

interface Draft {
  id: string | null;
  name: string;
  city: City;
  area: string;
  location: string;
  active: boolean;
}

const EMPTY: Draft = { id: null, name: "", city: "makkah", area: "", location: "", active: true };

type T = (key: string, options?: Record<string, unknown>) => string;

/** Server error codes mapped to localized, actionable messages. */
function errorMessage(err: unknown, t: T): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  if (raw.includes("HOTEL_DUPLICATE")) return t("ops.hotels.errorDuplicate");
  if (raw.includes("HOTEL_IN_USE")) return t("ops.hotels.errorInUse");
  if (raw.includes("Forbidden")) return t("ops.hotels.errorForbidden");
  return t("ops.hotels.errorGeneric");
}

function HotelsPage() {
  const fetchHotels = useServerFn(listHotels);
  const create = useServerFn(createHotel);
  const update = useServerFn(updateHotel);
  const toggleActive = useServerFn(setHotelActive);
  const remove = useServerFn(deleteHotel);
  const queryClient = useQueryClient();
  const { t } = useTranslation("admin");

  // Hotel and area labels are UI text; the hotel NAME itself is database
  // content and is never translated.
  const areaLabel = (code: string) => t(`ops.hotels.areas.${code}`, { defaultValue: code });
  const cityLabel = (city: string) => t(`ops.hotels.${city}`, { defaultValue: city });

  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState<"all" | City>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<HotelRow | null>(null);
  const debounced = useDebounced(search);

  const q = useQuery({
    queryKey: ["admin-hotels"] as const,
    queryFn: () => fetchHotels(),
    staleTime: 30_000,
  });

  /** The Builder reads the same table, so refresh its cache too. */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
    queryClient.invalidateQueries({ queryKey: ["hotels"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (d: Draft) => {
      const payload = {
        name: d.name,
        city: d.city,
        area: d.area || null,
        location: d.location || null,
        active: d.active,
      };
      return d.id ? update({ data: { ...payload, id: d.id } }) : create({ data: payload });
    },
    onSuccess: () => {
      toast.success(t("ops.hotels.toastSaved"));
      setDraft(null);
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e, t)),
  });

  const activeMutation = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggleActive({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(t(v.active ? "ops.hotels.toastActivated" : "ops.hotels.toastDeactivated"));
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e, t)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success(t("ops.hotels.toastDeleted"));
      setConfirmDelete(null);
      invalidate();
    },
    onError: (e) => {
      toast.error(errorMessage(e, t));
      setConfirmDelete(null);
    },
  });

  const rows = useMemo(() => (q.data ?? []) as HotelRow[], [q.data]);

  const filtered = useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    return rows.filter((h) => {
      if (cityFilter !== "all" && h.city !== cityFilter) return false;
      if (statusFilter === "active" && !h.active) return false;
      if (statusFilter === "inactive" && h.active) return false;
      if (!needle) return true;
      return [h.name, h.area, h.location]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, cityFilter, statusFilter, debounced]);

  const grouped = useMemo(() => {
    const map = new Map<string, HotelRow[]>();
    for (const h of filtered) {
      const list = map.get(h.city) ?? [];
      list.push(h);
      map.set(h.city, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const validName = (draft?.name ?? "").trim().length >= 2;

  return (
    <Page
      title={t("ops.hotels.title")}
      description={t("ops.hotels.description")}
      actions={
        <Button onClick={() => setDraft({ ...EMPTY })}>
          <Plus className="me-2 h-4 w-4" /> {t("ops.hotels.addHotel")}
        </Button>
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <FilterTabs
          value={cityFilter}
          onChange={setCityFilter}
          tabs={[
            { value: "all", label: t("ops.hotels.allCities"), count: rows.length },
            {
              value: "makkah",
              label: t("ops.hotels.makkah"),
              count: rows.filter((h) => h.city === "makkah").length,
            },
            {
              value: "madinah",
              label: t("ops.hotels.madinah"),
              count: rows.filter((h) => h.city === "madinah").length,
            },
          ]}
        />
        <FilterTabs
          value={statusFilter}
          onChange={setStatusFilter}
          tabs={[
            { value: "all", label: t("ops.hotels.all") },
            {
              value: "active",
              label: t("ops.hotels.active"),
              count: rows.filter((h) => h.active).length,
            },
            {
              value: "inactive",
              label: t("ops.hotels.inactive"),
              count: rows.filter((h) => !h.active).length,
            },
          ]}
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("ops.hotels.searchPlaceholder")}
          className="lg:ms-auto lg:max-w-sm"
        />
      </div>

      <Panel className="mt-4" bodyClassName="p-0 sm:p-0">
        {q.isLoading ? (
          <div className="p-4">
            <SkeletonRows rows={5} />
          </div>
        ) : q.isError ? (
          // A failed query must never look like an empty table.
          <ErrorState onRetry={() => q.refetch()} />
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={rows.length === 0 ? t("ops.hotels.emptyTitle") : t("ops.hotels.noMatchTitle")}
              description={
                rows.length === 0
                  ? t("ops.hotels.emptyDescription")
                  : t("ops.hotels.noMatchDescription")
              }
              icon={Building2}
            />
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {grouped.map(([city, list]) => (
              <section key={city}>
                <h2 className="bg-surface-sunken/50 px-4 py-2 text-caption font-bold uppercase tracking-wider text-muted-foreground sm:px-5">
                  {cityLabel(city)}
                </h2>
                <ul className="divide-y divide-border-subtle">
                  {list.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-small font-medium">{h.name}</p>
                        <p className="truncate text-caption text-muted-foreground">
                          {[h.area ? areaLabel(h.area) : null, h.location]
                            .filter(Boolean)
                            .join(" · ") || t("ops.hotels.noAreaSet")}
                        </p>
                      </div>

                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-caption font-semibold",
                          h.active
                            ? "bg-primary/10 text-primary"
                            : "bg-surface-sunken text-muted-foreground",
                        )}
                      >
                        {t(h.active ? "ops.hotels.active" : "ops.hotels.inactive")}
                      </span>

                      {h.requestCount > 0 && (
                        <span className="text-caption text-muted-foreground">
                          {t("ops.hotels.requestCount", { count: h.requestCount })}
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("ops.common.edit")}
                          onClick={() =>
                            setDraft({
                              id: h.id,
                              name: h.name,
                              city: h.city as City,
                              area: h.area ?? "",
                              location: h.location ?? "",
                              active: h.active,
                            })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t(h.active ? "ops.hotels.deactivate" : "ops.hotels.activate")}
                          disabled={activeMutation.isPending}
                          onClick={() => activeMutation.mutate({ id: h.id, active: !h.active })}
                        >
                          <Power className={cn("h-4 w-4", h.active && "text-primary")} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={
                            h.requestCount > 0
                              ? t("ops.hotels.deleteBlocked")
                              : t("ops.common.delete")
                          }
                          disabled={h.requestCount > 0}
                          onClick={() => setConfirmDelete(h)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>

      {/* ------------------------------------------------------------ editor */}
      <Drawer
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? t("ops.hotels.editHotel") : t("ops.hotels.addHotel")}
        description={t("ops.hotels.formHint")}
      >
        {draft && (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!validName || saveMutation.isPending) return;
              saveMutation.mutate(draft);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="hotel-name">{t("ops.hotels.nameLabel")} *</Label>
              <Input
                id="hotel-name"
                value={draft.name}
                autoFocus
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={t("ops.hotels.namePlaceholder")}
              />
              {!validName && draft.name.length > 0 && (
                <p className="text-caption text-destructive">Use at least 2 characters.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hotel-city">{t("ops.hotels.cityLabel")} *</Label>
              <select
                id="hotel-city"
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value as City, area: "" })}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-small outline-none focus:border-primary"
              >
                <option value="makkah">{t("ops.hotels.makkah")}</option>
                <option value="madinah">{t("ops.hotels.madinah")}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hotel-area">{t("ops.hotels.areaLabel")}</Label>
              <select
                id="hotel-area"
                value={draft.area}
                onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-small outline-none focus:border-primary"
              >
                <option value="">{t("ops.hotels.areaNotSet")}</option>
                {HOTEL_AREAS[draft.city].map((code) => (
                  <option key={code} value={code}>
                    {areaLabel(code)}
                  </option>
                ))}
              </select>
              <p className="text-caption text-muted-foreground">
                Shown to travellers in their own language.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hotel-location">{t("ops.hotels.locationLabel")}</Label>
              <Input
                id="hotel-location"
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                placeholder={t("ops.hotels.locationPlaceholder")}
              />
              <p className="text-caption text-muted-foreground">
                Optional. Used when no area is set.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border-subtle p-3">
              <div>
                <p className="text-small font-medium">{t("ops.hotels.activeLabel")}</p>
                <p className="text-caption text-muted-foreground">
                  Inactive hotels stay on past requests but cannot be chosen again.
                </p>
              </div>
              <Switch
                checked={draft.active}
                onCheckedChange={(v) => setDraft({ ...draft, active: v })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                {t("ops.common.cancel")}
              </Button>
              <Button type="submit" disabled={!validName || saveMutation.isPending}>
                {saveMutation.isPending ? t("ops.hotels.saving") : t("ops.hotels.saveHotel")}
              </Button>
            </div>
          </form>
        )}
      </Drawer>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ops.hotels.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("ops.hotels.deleteConfirmDescription", { name: confirmDelete?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("ops.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
            >
              {t("ops.common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
