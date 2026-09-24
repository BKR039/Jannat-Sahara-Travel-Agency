import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, ExternalLink, MapPin, Pencil, Plus, Power, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createHotel,
  deleteHotel,
  listHotels,
  setHotelActive,
  updateHotel,
  isMakkahCity,
  isMadinahCity,
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
  StatusSwitch,
  useDebounced,
} from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { NumberInput } from "@/components/ui/number-input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageField } from "@/components/admin/settings/parts";
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

interface HotelRow {
  id: string;
  name: string;
  city: string;
  area: string | null;
  location: string | null;
  stars?: number | null;
  images?: string[] | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_to_haram?: number | null;
  distance_to_masjid_nabawi?: number | null;
  active: boolean;
  requestCount: number;
}

interface Draft {
  id: string | null;
  name: string;
  city: string;
  area: string;
  location: string;
  mapsUrl: string;
  stars: number;
  coverImage: string;
  latitude: string;
  longitude: string;
  description: string;
  distanceToHaram: string;
  distanceToMasjidNabawi: string;
  active: boolean;
}

const EMPTY_DRAFT: Draft = {
  id: null,
  name: "",
  city: "",
  area: "",
  location: "",
  mapsUrl: "",
  stars: 5,
  coverImage: "",
  latitude: "",
  longitude: "",
  description: "",
  distanceToHaram: "",
  distanceToMasjidNabawi: "",
  active: true,
};

/**
 * Well-known city slugs used in the system. These provide a canonical
 * representation and i18n display names for common cities.
 */
export const WELL_KNOWN_CITIES: { slug: string; ar: string }[] = [
  { slug: "makkah", ar: "مكة المكرمة" },
  { slug: "madinah", ar: "المدينة المنورة" },
  { slug: "jeddah", ar: "جدة" },
  { slug: "riyadh", ar: "الرياض" },
  { slug: "istanbul", ar: "إسطنبول" },
  { slug: "tunis", ar: "تونس العاصمة" },
  { slug: "sousse", ar: "سوسة" },
];

export function cityDisplayName(city: string): string {
  if (!city) return "";
  const norm = city.trim().toLowerCase();
  const known = WELL_KNOWN_CITIES.find(
    (c) => c.slug.toLowerCase() === norm || c.ar === city.trim(),
  );
  return known?.ar ?? city;
}

type T = (key: string, options?: Record<string, unknown>) => string;

/** Server error codes mapped to localized, actionable messages. */
function errorMessage(err: unknown, t: T): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  if (raw.includes("HOTEL_DUPLICATE")) return t("ops.hotels.errorDuplicate");
  if (raw.includes("HOTEL_IN_USE")) return t("ops.hotels.errorInUse");
  if (raw.includes("Forbidden")) return t("ops.hotels.errorForbidden");
  return t("ops.hotels.errorGeneric");
}

function getGoogleMapsUrl(hotel: {
  name: string;
  city: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): string {
  const loc = hotel.location?.trim() || "";
  if (loc.startsWith("http://") || loc.startsWith("https://")) {
    return loc;
  }
  if (hotel.latitude && hotel.longitude) {
    return `https://www.google.com/maps?q=${hotel.latitude},${hotel.longitude}`;
  }
  const query = [hotel.name, cityDisplayName(hotel.city), loc].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function HotelsPage() {
  const fetchHotels = useServerFn(listHotels);
  const create = useServerFn(createHotel);
  const update = useServerFn(updateHotel);
  const toggleActive = useServerFn(setHotelActive);
  const remove = useServerFn(deleteHotel);
  const queryClient = useQueryClient();
  const { t } = useTranslation("admin");

  const areaLabel = (code: string) => t(`ops.hotels.areas.${code}`, { defaultValue: code });

  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<HotelRow | null>(null);
  const [pendingHotelId, setPendingHotelId] = useState<string | null>(null);
  const debounced = useDebounced(search);

  const q = useQuery({
    queryKey: ["admin-hotels"] as const,
    queryFn: () => fetchHotels(),
    staleTime: 30_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
    queryClient.invalidateQueries({ queryKey: ["hotels"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (d: Draft) => {
      // If mapsUrl is provided and location is separate, combine or preserve Google Maps URL
      let effectiveLocation = d.location.trim();
      if (d.mapsUrl.trim()) {
        if (!effectiveLocation) {
          effectiveLocation = d.mapsUrl.trim();
        } else if (!effectiveLocation.startsWith("http")) {
          effectiveLocation = `${effectiveLocation} | ${d.mapsUrl.trim()}`;
        }
      }

      const imagesArray = d.coverImage.trim() ? [d.coverImage.trim()] : [];

      const lat = d.latitude.trim() ? Number(d.latitude) : null;
      const lng = d.longitude.trim() ? Number(d.longitude) : null;

      const payload = {
        name: d.name.trim(),
        city: d.city.trim(),
        area: d.area.trim() || null,
        location: effectiveLocation || null,
        stars: d.stars > 0 ? d.stars : null,
        description: d.description.trim() || null,
        images: imagesArray,
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lng) ? lng : null,
        active: d.active,
        distance_to_haram:
          isMakkahCity(d.city) && d.distanceToHaram.trim() ? Number(d.distanceToHaram) : null,
        distance_to_masjid_nabawi:
          isMadinahCity(d.city) && d.distanceToMasjidNabawi.trim()
            ? Number(d.distanceToMasjidNabawi)
            : null,
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
    onSettled: () => setPendingHotelId(null),
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

  // Derive unique cities from loaded data for dynamic filter tabs
  const uniqueCities = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of rows) {
      map.set(h.city, (map.get(h.city) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([city, count]) => ({ city, count }));
  }, [rows]);

  // Cities already used across all hotels — used for the city combobox suggestions
  const existingCities = useMemo(() => [...new Set(rows.map((h) => h.city))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    return rows.filter((h) => {
      if (cityFilter !== "all" && h.city !== cityFilter) return false;
      if (statusFilter === "active" && !h.active) return false;
      if (statusFilter === "inactive" && h.active) return false;
      if (!needle) return true;
      return [h.name, cityDisplayName(h.city)]
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
  const validCity = (draft?.city ?? "").trim().length >= 1;

  // Area suggestions for the current city
  const areaSuggestions = draft ? (HOTEL_AREAS[draft.city] ?? []) : [];

  function openEditDrawer(h: HotelRow) {
    let loc = h.location ?? "";
    let mapUrl = "";
    if (loc.startsWith("http://") || loc.startsWith("https://")) {
      mapUrl = loc;
      loc = "";
    } else if (loc.includes(" | http")) {
      const parts = loc.split(" | ");
      loc = parts[0];
      mapUrl = parts[1] || "";
    }

    setDraft({
      id: h.id,
      name: h.name,
      city: h.city,
      area: h.area ?? "",
      location: loc,
      mapsUrl: mapUrl,
      stars: h.stars || 5,
      coverImage: h.images?.[0] || "",
      latitude: h.latitude != null ? String(h.latitude) : "",
      longitude: h.longitude != null ? String(h.longitude) : "",
      description: h.description ?? "",
      distanceToHaram: h.distance_to_haram != null ? String(h.distance_to_haram) : "",
      distanceToMasjidNabawi:
        h.distance_to_masjid_nabawi != null ? String(h.distance_to_masjid_nabawi) : "",
      active: h.active,
    });
  }

  return (
    <Page
      title={t("ops.hotels.title")}
      description={t("ops.hotels.description")}
      actions={
        <Button onClick={() => setDraft({ ...EMPTY_DRAFT })}>
          <Plus className="me-2 h-4 w-4" /> {t("ops.hotels.addHotel")}
        </Button>
      }
    >
      {/* ----------------- Filter controls bar ----------------- */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* City Filter: All Cities button + searchable city dropdown */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-card p-1">
          <Button
            type="button"
            size="sm"
            variant={cityFilter === "all" ? "default" : "ghost"}
            onClick={() => setCityFilter("all")}
            className="h-8 rounded-lg px-3 text-caption font-semibold"
          >
            {t("ops.hotels.allCities")} ({rows.length})
          </Button>

          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger
              className={cn(
                "h-8 rounded-lg border border-border bg-background px-3 text-caption font-medium outline-none transition-colors",
                cityFilter !== "all"
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "text-foreground hover:border-primary/60",
              )}
              aria-label="تصفية حسب المدينة"
            >
              <SelectValue placeholder="اختر مدينة للتصفية..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">اختر مدينة للتصفية...</SelectItem>
              {uniqueCities.map(({ city, count }) => (
                <SelectItem key={city} value={city}>
                  {cityDisplayName(city)} ({count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
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

        {/* Search */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("ops.hotels.searchPlaceholder")}
          className="lg:ms-auto lg:max-w-xs"
        />
      </div>

      {/* ----------------- Hotels list/grid ----------------- */}
      <Panel className="mt-4" bodyClassName="p-0 sm:p-0">
        {q.isLoading ? (
          <div className="p-4">
            <SkeletonRows rows={5} />
          </div>
        ) : q.isError ? (
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
                <div className="flex items-center justify-between bg-surface-sunken/60 px-4 py-2.5 sm:px-5">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <h2 className="text-small font-bold text-foreground">
                      {cityDisplayName(city)}
                    </h2>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-caption font-semibold text-muted-foreground border border-border-subtle">
                      {list.length}
                    </span>
                  </div>
                  <span className="text-caption text-muted-foreground hidden sm:inline">
                    الفنادق المعتمدة في {cityDisplayName(city)}
                  </span>
                </div>

                <ul className="divide-y divide-border-subtle">
                  {list.map((h) => {
                    return (
                      <li
                        key={h.id}
                        className="group flex flex-col gap-3 p-4 transition-colors hover:bg-accent/30 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                      >
                        {/* Hotel Icon */}
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                          <Building2 className="h-5 w-5" />
                        </div>

                        {/* Info: Name and City */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-body font-bold text-foreground">
                              {h.name}
                            </h3>
                            <span className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-sunken/60 px-2 py-0.5 text-caption font-medium text-foreground/80">
                              <MapPin className="h-3 w-3 text-primary/70" />
                              {cityDisplayName(h.city)}
                            </span>
                            {!h.active && (
                              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                                {t("ops.hotels.inactive")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Usage badge if referenced in requests */}
                        {h.requestCount > 0 && (
                          <div className="flex items-center sm:justify-end">
                            <span className="text-caption font-medium text-muted-foreground bg-muted/40 rounded-md px-2 py-0.5 border border-border-subtle">
                              {t("ops.hotels.requestCount", { count: h.requestCount })}
                            </span>
                          </div>
                        )}

                        {/* Quick actions */}
                        <div className="flex items-center gap-1 sm:ms-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t("ops.common.edit")}
                            onClick={() => openEditDrawer(h)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <StatusSwitch
                            checked={Boolean(h.active)}
                            disabled={activeMutation.isPending && pendingHotelId === h.id}
                            isPending={activeMutation.isPending && pendingHotelId === h.id}
                            onCheckedChange={(active) => {
                              setPendingHotelId(h.id);
                              activeMutation.mutate({ id: h.id, active });
                            }}
                            ariaLabel={t(
                              h.active ? "ops.hotels.deactivate" : "ops.hotels.activate",
                            )}
                          />

                          <Button
                            variant="ghost"
                            size="icon"
                            title={
                              h.requestCount > 0
                                ? t("ops.hotels.deleteBlocked")
                                : t("ops.common.delete")
                            }
                            disabled={h.requestCount > 0}
                            className="text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDelete(h)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>

      {/* ----------------- Hotel Edit Side Drawer ----------------- */}
      <Drawer
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? t("ops.hotels.editHotel") : t("ops.hotels.addHotel")}
        description="إدارة تفاصيل الفندق، التقييم، موقعه على الخريطة وصورته الرسمية"
      >
        {draft && (
          <form
            className="space-y-6 pb-8"
            onSubmit={(e) => {
              e.preventDefault();
              if (!validName || !validCity || saveMutation.isPending) return;
              saveMutation.mutate(draft);
            }}
          >
            {/* 1. Basic information */}
            <div className="space-y-4 rounded-xl border border-border-subtle bg-card p-4">
              <h4 className="text-small font-bold text-foreground">1. البيانات الأساسية</h4>

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
                  <p className="text-caption text-destructive">استخدم حرفين على الأقل.</p>
                )}
              </div>

              {/* City combobox with quick suggestion chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hotel-city">{t("ops.hotels.cityLabel")} *</Label>
                  <span className="text-[11px] text-muted-foreground">اكتب أو اختر أي مدينة</span>
                </div>

                <div className="relative">
                  <Input
                    id="hotel-city"
                    list="city-suggestions"
                    value={draft.city}
                    onChange={(e) => setDraft({ ...draft, city: e.target.value, area: "" })}
                    placeholder="ابحث أو اكتب المدينة (مكة، جدة، تونس، إسطنبول...)"
                  />
                  <datalist id="city-suggestions">
                    {WELL_KNOWN_CITIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.ar}
                      </option>
                    ))}
                    {existingCities
                      .filter((c) => !WELL_KNOWN_CITIES.some((wk) => wk.slug === c || wk.ar === c))
                      .map((c) => (
                        <option key={c} value={c} />
                      ))}
                  </datalist>
                </div>

                {/* Quick preset city chips for fast operator data entry */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {WELL_KNOWN_CITIES.map((c) => {
                    const active =
                      draft.city.toLowerCase() === c.slug.toLowerCase() || draft.city === c.ar;
                    return (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => setDraft({ ...draft, city: c.slug, area: "" })}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "bg-surface-sunken text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                      >
                        {c.ar}
                      </button>
                    );
                  })}
                </div>

                {!validCity && draft.city.length > 0 && (
                  <p className="text-caption text-destructive">اسم المدينة مطلوب.</p>
                )}
                {draft.city && (
                  <p className="text-caption text-primary font-medium">
                    المدينة المحددة: {cityDisplayName(draft.city)}
                  </p>
                )}
              </div>

              {/* Area / neighborhood */}
              <div className="space-y-1.5">
                <Label htmlFor="hotel-area">{t("ops.hotels.areaLabel")}</Label>
                {areaSuggestions.length > 0 ? (
                  <>
                    <Select
                      value={
                        areaSuggestions.includes(draft.area)
                          ? draft.area
                          : draft.area
                            ? "__custom__"
                            : "__none__"
                      }
                      onValueChange={(val) => {
                        if (val === "__custom__" || val === "__none__") {
                          setDraft({ ...draft, area: "" });
                        } else {
                          setDraft({ ...draft, area: val });
                        }
                      }}
                    >
                      <SelectTrigger id="hotel-area" className="h-10 w-full">
                        <SelectValue placeholder={t("ops.hotels.areaNotSet")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("ops.hotels.areaNotSet")}</SelectItem>
                        {areaSuggestions.map((code) => (
                          <SelectItem key={code} value={code}>
                            {areaLabel(code)}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">أخرى (كتابة يدوية)...</SelectItem>
                      </SelectContent>
                    </Select>
                    {!areaSuggestions.includes(draft.area) && draft.area !== "" && (
                      <Input
                        value={draft.area}
                        onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                        placeholder="اكتب اسم المنطقة أو الحي..."
                        className="mt-1.5"
                      />
                    )}
                  </>
                ) : (
                  <Input
                    id="hotel-area"
                    value={draft.area}
                    onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                    placeholder="المنطقة أو الحي..."
                  />
                )}
              </div>

              {/* Stars rating */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="hotel-stars">تصنيف النجوم (Stars)</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setDraft({ ...draft, stars: star })}
                      className={cn(
                        "rounded p-1 transition-transform hover:scale-110",
                        star <= draft.stars ? "text-amber-500" : "text-muted-foreground/30",
                      )}
                      aria-label={`${star} نجوم`}
                    >
                      <Star className={cn("h-5 w-5", star <= draft.stars && "fill-current")} />
                    </button>
                  ))}
                  <span className="ms-2 text-caption font-semibold text-foreground">
                    {draft.stars} نجوم
                  </span>
                </div>
              </div>

              {/* Active / Inactive switch inside Basic Information */}
              <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-sunken/40 p-3 pt-2.5">
                <div>
                  <p className="text-caption font-bold text-foreground">حالة تفعيل الفندق</p>
                  <p className="text-[11px] text-muted-foreground">
                    الفنادق المعطّلة تختفي من خيارات الرحلات الجديدة
                  </p>
                </div>
                <StatusSwitch
                  checked={Boolean(draft.active)}
                  onCheckedChange={(v) => setDraft({ ...draft, active: v })}
                />
              </div>
            </div>

            {/* 2. Location */}
            <div className="space-y-4 rounded-xl border border-border-subtle bg-card p-4">
              <h4 className="text-small font-bold text-foreground">2. الموقع والخرائط</h4>

              <div className="space-y-1.5">
                <Label htmlFor="hotel-location">{t("ops.hotels.locationLabel")}</Label>
                <Input
                  id="hotel-location"
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  placeholder="العنوان التفصيلي أو المعلم القريب"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hotel-maps-url">رابط خرائط جوجل (Google Maps URL)</Label>
                  {draft.mapsUrl && (
                    <a
                      href={draft.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-caption font-semibold text-primary hover:underline"
                    >
                      اختبار الرابط <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <Input
                  id="hotel-maps-url"
                  value={draft.mapsUrl}
                  onChange={(e) => setDraft({ ...draft, mapsUrl: e.target.value })}
                  placeholder="https://maps.app.goo.gl/... أو https://google.com/maps?..."
                  dir="ltr"
                />
                <p className="text-[11px] text-muted-foreground">
                  يسمح للمسافر والموظف بفتح موقع الفندق الدقيق بضغطة زر.
                </p>
              </div>

              {/* Coordinates: Latitude & Longitude */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="hotel-lat" className="text-caption">
                    خط العرض (Latitude)
                  </Label>
                  <Input
                    id="hotel-lat"
                    value={draft.latitude}
                    onChange={(e) => setDraft({ ...draft, latitude: e.target.value })}
                    placeholder="21.4225"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hotel-lng" className="text-caption">
                    خط الطول (Longitude)
                  </Label>
                  <Input
                    id="hotel-lng"
                    value={draft.longitude}
                    onChange={(e) => setDraft({ ...draft, longitude: e.target.value })}
                    placeholder="39.8262"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* 3. Hotel Media */}
            <div className="space-y-4 rounded-xl border border-border-subtle bg-card p-4">
              <h4 className="text-small font-bold text-foreground">3. وسائط الفندق</h4>
              <ImageField
                label="صورة الفندق الرئيسية"
                hint="صورة واضحة لواجهة الفندق أو الغرفة (تُستخدم في الموقع والبطاقات)"
                value={draft.coverImage}
                onChange={(url) => setDraft({ ...draft, coverImage: url })}
                folder="hotels"
                aspect="aspect-[16/10]"
              />
            </div>

            {/* 4. Travel information (Adaptive based on City) */}
            <div className="space-y-4 rounded-xl border border-border-subtle bg-card p-4">
              <h4 className="text-small font-bold text-foreground">4. معلومات السفر والتنقل</h4>

              {/* Makkah specific distance */}
              {isMakkahCity(draft.city) && (
                <div className="space-y-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <Label
                    htmlFor="hotel-distance-haram"
                    className="font-semibold text-amber-700 dark:text-amber-400"
                  >
                    المسافة إلى المسجد الحرام (بالأمتار) *
                  </Label>
                  <NumberInput
                    id="hotel-distance-haram"
                    value={draft.distanceToHaram === "" ? null : Number(draft.distanceToHaram)}
                    onChange={(v) =>
                      setDraft({ ...draft, distanceToHaram: v === null ? "" : String(v) })
                    }
                    placeholder="المسافة بالأمتار"
                    min={0}
                    max={99999}
                    allowEmpty
                    showSteppers={false}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    تُعرض في بطاقة الفندق ضمن برنامج العمرة
                  </p>
                </div>
              )}

              {/* Madinah specific distance */}
              {isMadinahCity(draft.city) && (
                <div className="space-y-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <Label
                    htmlFor="hotel-distance-nabawi"
                    className="font-semibold text-emerald-700 dark:text-emerald-400"
                  >
                    المسافة إلى المسجد النبوي (بالأمتار) *
                  </Label>
                  <NumberInput
                    id="hotel-distance-nabawi"
                    value={
                      draft.distanceToMasjidNabawi === ""
                        ? null
                        : Number(draft.distanceToMasjidNabawi)
                    }
                    onChange={(v) =>
                      setDraft({ ...draft, distanceToMasjidNabawi: v === null ? "" : String(v) })
                    }
                    placeholder="المسافة بالأمتار"
                    min={0}
                    max={99999}
                    allowEmpty
                    showSteppers={false}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    تُعرض في بطاقة الفندق ضمن برنامج العمرة
                  </p>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="hotel-description">وصف موجز للفندق (اختياري)</Label>
                <Textarea
                  id="hotel-description"
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="نبذة سريعة عن الفندق ومميزاته وموقعه وخدماته..."
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                {t("ops.common.cancel")}
              </Button>
              <Button type="submit" disabled={!validName || !validCity || saveMutation.isPending}>
                {saveMutation.isPending ? t("ops.hotels.saving") : t("ops.hotels.saveHotel")}
              </Button>
            </div>
          </form>
        )}
      </Drawer>

      {/* ----------------- Delete Confirmation Dialog ----------------- */}
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
