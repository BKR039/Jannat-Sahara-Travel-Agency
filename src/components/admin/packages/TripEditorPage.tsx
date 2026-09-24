import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Hotel,
  Loader2,
  MapPin,
  Plane,
  Save,
  Send,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageField } from "@/components/admin/settings/parts";
import { Disclosure, Skeleton, StatusSwitch } from "@/components/admin/kit";
import { slugify, type PackageCategory, type PackageStatus } from "./model";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface HotelOption {
  id: string;
  name: string;
  city: string;
  area: string | null;
  stars: number | null;
  active: boolean;
}

interface TripDraft {
  id: string | null;
  status: PackageStatus;
  category: PackageCategory;
  title: string;
  title_fr: string;
  title_en: string;
  short_description: string;
  short_description_fr: string;
  short_description_en: string;
  destination: string;
  country: string;
  departure_date: string;
  return_date: string;
  duration: string;
  price: string;
  currency: string;
  total_seats: string;
  cover: string;
  // Hotels
  makkah_hotel_id: string;
  madinah_hotel_id: string;
  custom_hotel: string;
  // Flights
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  flight_route: string;
  notes: string;
  // Advanced
  discount_price: string;
  child_price: string;
  infant_price: string;
  description: string;
  description_fr: string;
  description_en: string;
  slug: string;
  featured: boolean;
}

function emptyDraft(): TripDraft {
  return {
    id: null,
    status: "draft",
    category: "umrah",
    title: "",
    title_fr: "",
    title_en: "",
    short_description: "",
    short_description_fr: "",
    short_description_en: "",
    destination: "مكة المكرمة والمدينة المنورة",
    country: "المملكة العربية السعودية",
    departure_date: "",
    return_date: "",
    duration: "",
    price: "",
    currency: "TND",
    total_seats: "45",
    cover: "",
    makkah_hotel_id: "",
    madinah_hotel_id: "",
    custom_hotel: "",
    airline: "الخطوط التونسية",
    flight_number: "",
    departure_airport: "تونس قرطاج (TUN)",
    arrival_airport: "جدة (JED)",
    flight_route: "",
    notes: "",
    discount_price: "",
    child_price: "",
    infant_price: "",
    description: "",
    description_fr: "",
    description_en: "",
    slug: "",
    featured: false,
  };
}

function autoComputeDuration(from: string, to: string): string {
  if (!from || !to) return "";
  const d1 = new Date(from);
  const d2 = new Date(to);
  const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "";
  return `${diffDays + 1} أيام (${diffDays} ليالٍ)`;
}

const CATEGORY_TABS: { key: PackageCategory; label: string; icon: typeof BedDouble }[] = [
  { key: "umrah", label: "عمرة", icon: BedDouble },
  { key: "trip", label: "رحلة سياحية", icon: Building2 },
  { key: "flight", label: "طيران", icon: Plane },
  { key: "visa", label: "أخرى / خدمات", icon: CalendarDays },
];

export function TripEditorPage({ packageId }: { packageId: string }) {
  const isNew = packageId === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation("admin");

  const [draft, setDraft] = useState<TripDraft>(emptyDraft);
  const [activeLang, setActiveLang] = useState<"ar" | "fr" | "en">("ar");
  const [showPreview, setShowPreview] = useState(true);

  // 1. Fetch existing package if editing
  const packageQuery = useQuery({
    queryKey: ["admin-package-detail", packageId] as const,
    enabled: !isNew,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("id", packageId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // 2. Fetch all hotels from real DB for dropdown selection
  const hotelsQuery = useQuery({
    queryKey: ["admin-hotels-for-trips"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select("id, name, city, area, stars, active")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as HotelOption[];
    },
    staleTime: 60_000,
  });

  const allHotels = useMemo(() => hotelsQuery.data ?? [], [hotelsQuery.data]);
  const makkahHotels = useMemo(
    () => allHotels.filter((h) => h.city?.toLowerCase() === "makkah" && h.active),
    [allHotels],
  );
  const madinahHotels = useMemo(
    () => allHotels.filter((h) => h.city?.toLowerCase() === "madinah" && h.active),
    [allHotels],
  );

  // Populate draft when existing package loads
  useEffect(() => {
    if (isNew || !packageQuery.data) return;
    const p = packageQuery.data;

    // Parse accommodation if present
    let makkahId = "";
    let madinahId = "";
    if (Array.isArray(p.accommodation)) {
      for (const item of p.accommodation as unknown[]) {
        const raw = (item ?? {}) as Record<string, unknown>;
        const id = String(raw.id || raw.hotelId || "");
        const city = String(raw.city || "").toLowerCase();
        const hotelName = String(raw.hotel || "");
        if (city === "makkah" || hotelName.includes("مكة")) {
          makkahId = id;
        } else if (city === "madinah" || hotelName.includes("المدينة")) {
          madinahId = id;
        }
      }
    }

    // Fallback search by hotel name if ID was not stored
    if (!makkahId && p.hotel) {
      const found = makkahHotels.find((h) => p.hotel?.includes(h.name));
      if (found) makkahId = found.id;
    }
    if (!madinahId && p.hotel) {
      const found = madinahHotels.find((h) => p.hotel?.includes(h.name));
      if (found) madinahId = found.id;
    }

    setDraft({
      id: p.id,
      status: (p.status as PackageStatus) || "draft",
      category: (p.category as PackageCategory) || "umrah",
      title: p.title || "",
      title_fr: p.title_fr || "",
      title_en: p.title_en || "",
      short_description: p.short_description || "",
      short_description_fr: p.short_description_fr || "",
      short_description_en: p.short_description_en || "",
      destination: p.destination || "",
      country: p.country || "",
      departure_date: p.departure_date ? p.departure_date.slice(0, 10) : "",
      return_date: p.return_date ? p.return_date.slice(0, 10) : "",
      duration: p.duration || "",
      price: p.price != null ? String(p.price) : "",
      currency: p.currency || "TND",
      total_seats: p.total_seats != null ? String(p.total_seats) : "45",
      cover: p.cover || "",
      makkah_hotel_id: makkahId,
      madinah_hotel_id: madinahId,
      custom_hotel: p.hotel && !makkahId && !madinahId ? p.hotel : "",
      airline: p.airline || "",
      flight_number: p.transport || "",
      departure_airport: p.departure_airport || p.meeting_point || "",
      arrival_airport: p.arrival_airport || "",
      flight_route: p.flight_route || "",
      notes: p.notes || "",
      discount_price: p.discount_price != null ? String(p.discount_price) : "",
      child_price: p.child_price != null ? String(p.child_price) : "",
      infant_price: p.infant_price != null ? String(p.infant_price) : "",
      description: p.description || "",
      description_fr: p.description_fr || "",
      description_en: p.description_en || "",
      slug: p.slug || "",
      featured: Boolean(p.featured),
    });
  }, [isNew, packageQuery.data, makkahHotels, madinahHotels]);

  function update<K extends keyof TripDraft>(key: K, value: TripDraft[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };

      // Auto-compute duration when dates change
      if (key === "departure_date" || key === "return_date") {
        const from = key === "departure_date" ? (value as string) : prev.departure_date;
        const to = key === "return_date" ? (value as string) : prev.return_date;
        if (from && to) {
          const autoDur = autoComputeDuration(from, to);
          if (autoDur) next.duration = autoDur;
        }
      }

      // Default destination when switching to Umrah
      if (key === "category" && value === "umrah" && !prev.destination) {
        next.destination = "مكة المكرمة والمدينة المنورة";
        next.country = "المملكة العربية السعودية";
      }

      return next;
    });
  }

  // Find currently selected hotels
  const selectedMakkah = allHotels.find((h) => h.id === draft.makkah_hotel_id);
  const selectedMadinah = allHotels.find((h) => h.id === draft.madinah_hotel_id);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-packages"] });
    qc.invalidateQueries({ queryKey: ["packages"] });
    qc.invalidateQueries({ queryKey: ["admin-package-detail", packageId] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
  }

  // Save mutation - MUST be called unconditionally before any early returns
  const saveMutation = useMutation({
    mutationFn: async (targetStatus?: PackageStatus) => {
      const statusToSave = targetStatus ?? draft.status;
      const title = draft.title.trim();
      if (!title) throw new Error("عنوان الرحلة مطلوب");

      const priceNum = Number(draft.price);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        throw new Error("يرجى تحديد سعر صالح للرحلة");
      }

      // Build slug
      let slug = draft.slug.trim();
      if (!slug) {
        slug = slugify(title) || `trip-${Math.random().toString(36).slice(2, 8)}`;
      }

      // Build accommodation and hotel string
      const accommodation = [
        selectedMakkah
          ? {
              id: selectedMakkah.id,
              city: "makkah",
              hotel: selectedMakkah.name,
              stars: selectedMakkah.stars,
            }
          : null,
        selectedMadinah
          ? {
              id: selectedMadinah.id,
              city: "madinah",
              hotel: selectedMadinah.name,
              stars: selectedMadinah.stars,
            }
          : null,
      ].filter(Boolean);

      const hotelSummary = [
        selectedMakkah ? `${selectedMakkah.name} (مكة)` : null,
        selectedMadinah ? `${selectedMadinah.name} (المدينة)` : null,
        draft.custom_hotel.trim() ? draft.custom_hotel.trim() : null,
      ]
        .filter(Boolean)
        .join(" · ");

      const payload: Record<string, unknown> = {
        title,
        title_fr: draft.title_fr.trim() || null,
        title_en: draft.title_en.trim() || null,
        slug,
        status: statusToSave,
        category: draft.category,
        destination: draft.destination.trim() || null,
        country: draft.country.trim() || null,
        departure_date: draft.departure_date || null,
        return_date: draft.return_date || null,
        duration: draft.duration.trim() || null,
        price: priceNum,
        currency: draft.currency.trim() || "TND",
        total_seats: draft.total_seats.trim() ? Number(draft.total_seats) : 45,
        seats: draft.total_seats.trim() ? Number(draft.total_seats) : 45,
        cover: draft.cover.trim() || null,
        short_description: draft.short_description.trim() || null,
        short_description_fr: draft.short_description_fr.trim() || null,
        short_description_en: draft.short_description_en.trim() || null,
        hotel: hotelSummary || null,
        accommodation: accommodation.length > 0 ? accommodation : null,
        airline: draft.airline.trim() || null,
        transport: draft.flight_number.trim() || null,
        departure_airport: draft.departure_airport.trim() || null,
        arrival_airport: draft.arrival_airport.trim() || null,
        flight_route: draft.flight_route.trim() || null,
        notes: draft.notes.trim() || null,
        meeting_point: draft.flight_route.trim() || draft.departure_airport.trim() || null,
        discount_price: draft.discount_price.trim() ? Number(draft.discount_price) : null,
        child_price: draft.child_price.trim() ? Number(draft.child_price) : null,
        infant_price: draft.infant_price.trim() ? Number(draft.infant_price) : null,
        description: draft.description.trim() || null,
        description_fr: draft.description_fr.trim() || null,
        description_en: draft.description_en.trim() || null,
        featured: draft.featured,
        seo_title: draft.title.trim().slice(0, 60),
        seo_description: (draft.short_description || draft.title).trim().slice(0, 160),
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("packages")
          .insert(payload as never)
          .select("id")
          .single();
        if (error) throw error;
        return { id: data.id, status: statusToSave };
      } else {
        const { error } = await supabase
          .from("packages")
          .update(payload as never)
          .eq("id", draft.id!);
        if (error) throw error;
        return { id: draft.id!, status: statusToSave };
      }
    },
    onSuccess: ({ id, status }) => {
      invalidate();
      toast.success(
        status === "published"
          ? "تم نشر الرحلة بنجاح وهي معروضة الآن على الموقع العام"
          : "تم حفظ المسودة بنجاح",
      );
      if (isNew) {
        void navigate({ to: "/admin/packages/$id", params: { id } });
      } else {
        setDraft((prev) => ({ ...prev, status }));
      }
    },
    onError: (e: Error) => {
      toast.error(e.message || "حدث خطأ أثناء حفظ الرحلة");
    },
  });

  const isSaving = saveMutation.isPending;
  const isPublished = draft.status === "published";
  const isValid = draft.title.trim().length > 1 && Number(draft.price) >= 0;

  // ── Loading / Error / Not-Found gates ────────────────────────────────
  // Placed strictly AFTER all hooks, ensuring hook order stability across renders.

  if (!isNew && packageQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/packages">
              <ArrowLeft className="me-1 h-4 w-4 rtl:-scale-x-100" />
              العودة للرحلات
            </Link>
          </Button>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!isNew && packageQuery.isError) {
    const errMsg =
      packageQuery.error instanceof Error ? packageQuery.error.message : "خطأ غير متوقع";
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h1 className="text-h5 font-bold text-foreground">تعذّر تحميل الرحلة</h1>
        <p className="text-small text-muted-foreground">{errMsg}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => packageQuery.refetch()}>
            إعادة المحاولة
          </Button>
          <Button asChild>
            <Link to="/admin/packages">العودة إلى الرحلات</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isNew && !packageQuery.data) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h1 className="text-h5 font-bold text-foreground">الرحلة غير موجودة</h1>
        <p className="text-small text-muted-foreground">
          لم يتم العثور على رحلة بالمعرّف المطلوب. ربما تم حذفها أو أن الرابط غير صحيح.
        </p>
        <Button asChild>
          <Link to="/admin/packages">العودة إلى الرحلات</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-20">
      {/* -------------------- Top Header & Actions -------------------- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/packages">
              <ArrowLeft className="me-1 h-4 w-4 rtl:-scale-x-100" />
              العودة للرحلات
            </Link>
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-h4 font-bold tracking-tight text-foreground">
                {isNew ? "إضافة رحلة جديدة" : draft.title || "تعديل الرحلة"}
              </h1>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-caption font-semibold",
                  draft.status === "published"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : draft.status === "draft"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : draft.status === "sold_out"
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                        : "bg-surface-sunken text-muted-foreground border border-border-subtle",
                )}
              >
                {draft.status === "published"
                  ? "منشور على الموقع"
                  : draft.status === "draft"
                    ? "مسودة"
                    : draft.status === "sold_out"
                      ? "مكتمل الحجز"
                      : "مؤرشف"}
              </span>
            </div>
            <p className="text-caption text-muted-foreground">
              البيانات التشغيلية مشتركة ومباشرة — يتم حفظها ونشرها فورًا للعملاء
            </p>
          </div>
        </div>

        {/* Primary action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && draft.slug && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/packages/${draft.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                title="عرض في الموقع العام"
              >
                <ExternalLink className="me-1 h-4 w-4" />
                الموقع العام
              </a>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="hidden lg:inline-flex"
          >
            <Eye className="me-1.5 h-4 w-4" />
            {showPreview ? "إخفاء المعاينة" : "معاينة البطاقة"}
          </Button>
        </div>
      </div>

      {/* -------------------- Main Grid: Form + Live Preview -------------------- */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* Left Column: Practical Streamlined Form */}
        <div className="space-y-6">
          {/* 1. Trip Type & Destination */}
          <div className="rounded-2xl border border-border-subtle bg-card p-5 sm:p-6 space-y-5">
            <h2 className="text-small font-bold text-foreground">نوع الرحلة والوجهة</h2>

            {/* Visual Type selector */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CATEGORY_TABS.map((cat) => {
                const Icon = cat.icon;
                const active = draft.category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => update("category", cat.key)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition-all",
                      active
                        ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/30"
                        : "border-border-subtle hover:bg-surface-sunken/60 text-muted-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 mb-1.5",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span className="text-small font-bold text-foreground">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="trip-destination">الوجهة المقصودة *</Label>
                <Input
                  id="trip-destination"
                  value={draft.destination}
                  onChange={(e) => update("destination", e.target.value)}
                  placeholder="الوجهة أو المدينة المقصودة"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="trip-country">الدولة</Label>
                <Input
                  id="trip-country"
                  value={draft.country}
                  onChange={(e) => update("country", e.target.value)}
                  placeholder="الدولة"
                />
              </div>
            </div>
          </div>

          {/* 2. Dates, Auto Duration & Pricing */}
          <div className="rounded-2xl border border-border-subtle bg-card p-5 sm:p-6 space-y-5">
            <h2 className="text-small font-bold text-foreground">التواريخ، المدة والتسعير</h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="departure-date">تاريخ الذهاب *</Label>
                <DatePicker
                  id="departure-date"
                  value={draft.departure_date}
                  onChange={(d) => update("departure_date", d || "")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="return-date">تاريخ العودة *</Label>
                <DatePicker
                  id="return-date"
                  value={draft.return_date}
                  onChange={(d) => update("return_date", d || "")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="duration">المدة (محسوبة تلقائيًا)</Label>
                <Input
                  id="duration"
                  value={draft.duration}
                  onChange={(e) => update("duration", e.target.value)}
                  placeholder="المدة بالأيام والليالي"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="price">السعر للشخص *</Label>
                <NumberInput
                  id="price"
                  value={draft.price === "" ? null : Number(draft.price)}
                  onChange={(v) => update("price", v === null ? "" : String(v))}
                  placeholder="السعر للشخص"
                  unit={draft.currency}
                  showSteppers={false}
                  allowDecimal
                  allowEmpty
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency">العملة</Label>
                <Select
                  value={draft.currency}
                  onValueChange={(val) => update("currency", val)}
                >
                  <SelectTrigger id="currency" className="h-10 w-full">
                    <SelectValue placeholder="اختر العملة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TND">دينار تونسي (TND)</SelectItem>
                    <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                    <SelectItem value="EUR">يورو (EUR)</SelectItem>
                    <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="seats">المقاعد المتاحة</Label>
                <NumberInput
                  id="seats"
                  value={draft.total_seats === "" ? null : Number(draft.total_seats)}
                  onChange={(v) => update("total_seats", v === null ? "" : String(v))}
                  placeholder="عدد المقاعد"
                  showSteppers={false}
                  allowEmpty
                />
              </div>
            </div>
          </div>

          {/* 3. Single Cover Image (One image only) */}
          <div className="rounded-2xl border border-border-subtle bg-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-small font-bold text-foreground">
                  صورة الغلاف الرئيسية (صورة واحدة)
                </h2>
                <p className="text-caption text-muted-foreground">
                  صورة الغلاف الرسمية المستخدمة في بطاقة الرحلة وصفحة التفاصيل على الموقع
                </p>
              </div>
            </div>

            <ImageField
              label="صورة الغلاف"
              hint="اضغط لرفع صورة جديدة أو استبدالها من جهازك مباشرة"
              value={draft.cover}
              onChange={(url) => update("cover", url)}
              folder="packages"
              aspect="aspect-[16/10]"
            />
          </div>

          {/* 4. Hotels Selection (Direct Database Entities) */}
          <div className="rounded-2xl border border-border-subtle bg-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-small font-bold text-foreground">
                  فنادق الإقامة (من قاعدة بيانات الفنادق)
                </h2>
                <p className="text-caption text-muted-foreground">
                  اختر الفنادق المعتمدة مباشرة دون تكرار إدخال الأسماء والمواقع يدويًا
                </p>
              </div>
              <Button variant="ghost" size="xs" asChild className="text-primary">
                <Link to="/admin/hotels" target="_blank">
                  إدارة الفنادق <ExternalLink className="ms-1 h-3 w-3" />
                </Link>
              </Button>
            </div>

            {draft.category === "umrah" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Makkah Hotel */}
                <div className="space-y-1.5 rounded-xl border border-border-subtle bg-surface-sunken/40 p-3.5">
                  <Label
                    htmlFor="makkah-hotel"
                    className="font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <Building2 className="h-4 w-4 text-amber-500" />
                    فندق مكة المكرمة
                  </Label>
                  <Select
                    value={draft.makkah_hotel_id || "__none__"}
                    onValueChange={(val) => update("makkah_hotel_id", val === "__none__" ? "" : val)}
                  >
                    <SelectTrigger id="makkah-hotel" className="h-10 w-full">
                      <SelectValue placeholder="بدون تحديد فندق في مكة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون تحديد فندق في مكة</SelectItem>
                      {makkahHotels.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name} {h.stars ? `(${h.stars} نجوم)` : ""} {h.area ? `· ${h.area}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedMakkah && (
                    <p className="text-caption text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 text-primary" />
                      {selectedMakkah.name} · {selectedMakkah.stars} نجوم
                    </p>
                  )}
                </div>

                {/* Madinah Hotel */}
                <div className="space-y-1.5 rounded-xl border border-border-subtle bg-surface-sunken/40 p-3.5">
                  <Label
                    htmlFor="madinah-hotel"
                    className="font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <Building2 className="h-4 w-4 text-emerald-500" />
                    فندق المدينة المنورة
                  </Label>
                  <Select
                    value={draft.madinah_hotel_id || "__none__"}
                    onValueChange={(val) => update("madinah_hotel_id", val === "__none__" ? "" : val)}
                  >
                    <SelectTrigger id="madinah-hotel" className="h-10 w-full">
                      <SelectValue placeholder="بدون تحديد فندق في المدينة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون تحديد فندق في المدينة</SelectItem>
                      {madinahHotels.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name} {h.stars ? `(${h.stars} نجوم)` : ""} {h.area ? `· ${h.area}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedMadinah && (
                    <p className="text-caption text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 text-primary" />
                      {selectedMadinah.name} · {selectedMadinah.stars} نجوم
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="custom-hotel">فندق الإقامة (أو الإقامة المقترحة)</Label>
                <Input
                  id="custom-hotel"
                  value={draft.custom_hotel}
                  onChange={(e) => update("custom_hotel", e.target.value)}
                  placeholder="اسم الفندق ومستواه أو تصنيفه"
                />
              </div>
            )}
          </div>

          {/* 5. Flight Information */}
          <div className="rounded-2xl border border-border-subtle bg-card p-5 sm:p-6 space-y-4">
            <h2 className="text-small font-bold text-foreground">معلومات الطيران والنقل</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="airline">شركة الطيران الناقلة</Label>
                <Input
                  id="airline"
                  value={draft.airline}
                  onChange={(e) => update("airline", e.target.value)}
                  placeholder="الخطوط التونسية، الخطوط السعودية..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="flight-number">رقم الرحلة / مسار الطيران</Label>
                <Input
                  id="flight-number"
                  value={draft.flight_number}
                  onChange={(e) => update("flight_number", e.target.value)}
                  placeholder="رقم الرحلة أو مسار الطيران المباشر"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dep-airport">مطار الإقلاع (تونس)</Label>
                <Input
                  id="dep-airport"
                  value={draft.departure_airport}
                  onChange={(e) => update("departure_airport", e.target.value)}
                  placeholder="تونس قرطاج، صفاقس طينة، المنستير..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="arr-airport">مطار الوصول (السعودية)</Label>
                <Input
                  id="arr-airport"
                  value={draft.arrival_airport}
                  onChange={(e) => update("arrival_airport", e.target.value)}
                  placeholder="اسم مطار الوصول والرمز"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="flight-route">مسار الرحلة الظاهر (Flight Route)</Label>
                <Input
                  id="flight-route"
                  value={draft.flight_route}
                  onChange={(e) => update("flight_route", e.target.value)}
                  placeholder="مسار الرحلة"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="trip-notes">ملاحظات البرنامج والموسم</Label>
                <Input
                  id="trip-notes"
                  value={draft.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="الموسم أو المناسبة أو عطلة السفر"
                />
              </div>
            </div>
          </div>

          {/* 6. Multilingual Content (Title & Short Description) */}
          <div className="rounded-2xl border border-border-subtle bg-card p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-small font-bold text-foreground">نصوص ومحتوى الرحلة</h2>
                <p className="text-caption text-muted-foreground">
                  تُترجم النصوص فقط، بينما تبقى التواريخ والأسعار والفنادق مشتركة تلقائيًا
                </p>
              </div>

              {/* Language switcher tabs */}
              <div className="flex items-center gap-1 rounded-xl border border-border-subtle bg-surface-sunken p-1">
                <button
                  type="button"
                  onClick={() => setActiveLang("ar")}
                  className={cn(
                    "rounded-lg px-3 py-1 text-caption font-semibold transition-colors",
                    activeLang === "ar"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  العربية *
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLang("fr")}
                  className={cn(
                    "rounded-lg px-3 py-1 text-caption font-semibold transition-colors",
                    activeLang === "fr"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Français
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLang("en")}
                  className={cn(
                    "rounded-lg px-3 py-1 text-caption font-semibold transition-colors",
                    activeLang === "en"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  English
                </button>
              </div>
            </div>

            {/* Arabic Fields */}
            {activeLang === "ar" && (
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="title-ar">عنوان الرحلة (بالعربية) *</Label>
                  <Input
                    id="title-ar"
                    value={draft.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="اكتب عنوان البرنامج"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="short-desc-ar">الوصف المختصر (يظهر في البطاقة) *</Label>
                  <Textarea
                    id="short-desc-ar"
                    rows={2}
                    value={draft.short_description}
                    onChange={(e) => update("short_description", e.target.value)}
                    placeholder="رحلة عمرة متكاملة تشمل الإقامة في فنادق قريبة من الحرمين مع تأطير ديني وإرشادي متميز..."
                  />
                </div>
              </div>
            )}

            {/* French Fields */}
            {activeLang === "fr" && (
              <div className="space-y-4 pt-1" dir="ltr">
                <div className="space-y-1.5">
                  <Label htmlFor="title-fr">Titre du voyage (Français)</Label>
                  <Input
                    id="title-fr"
                    value={draft.title_fr}
                    onChange={(e) => update("title_fr", e.target.value)}
                    placeholder="Ex: Omra Septembre — Début de saison"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="short-desc-fr">Courte description (Français)</Label>
                  <Textarea
                    id="short-desc-fr"
                    rows={2}
                    value={draft.short_description_fr}
                    onChange={(e) => update("short_description_fr", e.target.value)}
                    placeholder="Voyage Omra complet avec hébergement proche des Harams..."
                  />
                </div>
              </div>
            )}

            {/* English Fields */}
            {activeLang === "en" && (
              <div className="space-y-4 pt-1" dir="ltr">
                <div className="space-y-1.5">
                  <Label htmlFor="title-en">Trip Title (English)</Label>
                  <Input
                    id="title-en"
                    value={draft.title_en}
                    onChange={(e) => update("title_en", e.target.value)}
                    placeholder="Ex: September Umrah — Season Opening"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="short-desc-en">Short Description (English)</Label>
                  <Textarea
                    id="short-desc-en"
                    rows={2}
                    value={draft.short_description_en}
                    onChange={(e) => update("short_description_en", e.target.value)}
                    placeholder="Comprehensive Umrah package with prime hotels near Harams..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* 7. Advanced & Optional Options (Collapsible Disclosure) */}
          <Disclosure label="خيارات تسعير وتفاصيل إضافية (اختياري)">
            <div className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="discount-price">السعر بعد التخفيض (إن وجد)</Label>
                  <NumberInput
                    id="discount-price"
                    value={draft.discount_price === "" ? null : Number(draft.discount_price)}
                    onChange={(v) => update("discount_price", v === null ? "" : String(v))}
                    placeholder="السعر بعد التخفيض"
                    showSteppers={false}
                    allowDecimal
                    allowEmpty
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="child-price">سعر الطفل</Label>
                  <NumberInput
                    id="child-price"
                    value={draft.child_price === "" ? null : Number(draft.child_price)}
                    onChange={(v) => update("child_price", v === null ? "" : String(v))}
                    placeholder="سعر الطفل"
                    showSteppers={false}
                    allowDecimal
                    allowEmpty
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="infant-price">سعر الرضيع</Label>
                  <NumberInput
                    id="infant-price"
                    value={draft.infant_price === "" ? null : Number(draft.infant_price)}
                    onChange={(v) => update("infant_price", v === null ? "" : String(v))}
                    placeholder="سعر الرضيع"
                    showSteppers={false}
                    allowDecimal
                    allowEmpty
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="full-description">الوصف التفصيلي الكامل</Label>
                <Textarea
                  id="full-description"
                  rows={4}
                  value={draft.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="معلومات شاملة عن برنامج الرحلة، الزيارات الميدانية، والخدمات الخاصة..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="custom-slug">الرابط المخصص (Slug)</Label>
                  <Input
                    id="custom-slug"
                    value={draft.slug}
                    onChange={(e) => update("slug", e.target.value)}
                    placeholder="يتم توليده تلقائيًا من العنوان"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-sunken/40 p-3.5 sm:col-span-2">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="trip-featured"
                      className="text-small font-semibold cursor-pointer"
                    >
                      عرض كرحلة مميزة على الصفحة الرئيسية ⭐
                    </Label>
                    <p className="text-caption text-muted-foreground">
                      الرحلات المميزة تظهر في مقدمة بطاقات العروض والصفحة الرئيسية.
                    </p>
                  </div>
                  <StatusSwitch
                    id="trip-featured"
                    checked={Boolean(draft.featured)}
                    onCheckedChange={(v) => update("featured", v)}
                    activeLabel="مميز"
                    inactiveLabel="عادي"
                  />
                </div>
              </div>
            </div>
          </Disclosure>
        </div>

        {/* Right Column: Live Customer Preview Card */}
        {showPreview && (
          <aside className="sticky top-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-caption font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-primary" /> معاينة مباشرة (ما يراه المسافر)
              </span>
              <span className="text-[11px] text-muted-foreground">مظهر البطاقة الفعلي</span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-sm transition-all">
              {/* Card Cover */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-sunken">
                {draft.cover ? (
                  <img
                    src={draft.cover}
                    alt={draft.title || "غلاف الرحلة"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/60">
                    <Building2 className="h-8 w-8" />
                    <span className="text-caption">لم تُحدّد صورة غلاف بعد</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                <div className="absolute top-3 start-3">
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-caption font-bold text-primary-foreground">
                    {draft.category === "umrah"
                      ? "عمرة"
                      : draft.category === "trip"
                        ? "رحلة سياحية"
                        : draft.category === "flight"
                          ? "طيران"
                          : "خدمة"}
                  </span>
                </div>

                {draft.destination && (
                  <div className="absolute bottom-2.5 start-3 flex items-center gap-1 text-white text-caption font-medium">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate max-w-[15rem]">{draft.destination}</span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <h3 className="font-bold text-foreground text-body line-clamp-2 leading-snug">
                  {draft.title || "عنوان الرحلة التجريبي"}
                </h3>

                {draft.short_description && (
                  <p className="line-clamp-2 text-caption text-muted-foreground leading-relaxed">
                    {draft.short_description}
                  </p>
                )}

                <div className="space-y-1.5 border-t border-border-subtle pt-2.5 text-caption text-muted-foreground">
                  {(draft.departure_date || draft.return_date) && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>
                        {[draft.departure_date, draft.return_date].filter(Boolean).join(" → ")}
                      </span>
                    </div>
                  )}

                  {draft.duration && (
                    <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>{draft.duration}</span>
                    </div>
                  )}

                  {/* Selected Hotels Preview */}
                  {(selectedMakkah || selectedMadinah || draft.custom_hotel) && (
                    <div className="flex items-start gap-1.5">
                      <Hotel className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="truncate">
                        {selectedMakkah && (
                          <span className="me-1.5">
                            {selectedMakkah.name} ({selectedMakkah.stars}★)
                          </span>
                        )}
                        {selectedMadinah && (
                          <span>
                            {selectedMadinah.name} ({selectedMadinah.stars}★)
                          </span>
                        )}
                        {draft.custom_hotel && <span>{draft.custom_hotel}</span>}
                      </div>
                    </div>
                  )}

                  {draft.airline && (
                    <div className="flex items-center gap-1.5">
                      <Plane className="h-3.5 w-3.5 text-primary" />
                      <span>{draft.airline}</span>
                    </div>
                  )}
                </div>

                {/* Price block */}
                <div className="flex items-baseline justify-between border-t border-border-subtle pt-3">
                  <span className="text-caption text-muted-foreground">ابتداءً من:</span>
                  <div className="text-end">
                    <span className="text-h4 font-extrabold text-primary">
                      {draft.price ? Number(draft.price).toLocaleString() : "—"}
                    </span>
                    <span className="ms-1 text-caption font-bold text-muted-foreground">
                      {draft.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* -------------------- Sticky Bottom Action Bar -------------------- */}
      <div className="sticky bottom-0 -mx-4 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-background/95 px-4 py-3.5 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2 text-caption text-muted-foreground">
          <span>الحالة الحالية:</span>
          <span className="font-semibold text-foreground">
            {draft.status === "published"
              ? "منشور"
              : draft.status === "draft"
                ? "مسودة"
                : draft.status === "sold_out"
                  ? "مكتمل الحجز"
                  : "مؤرشف"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving || !isValid}
            onClick={() => saveMutation.mutate("draft")}
          >
            {isSaving ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            حفظ كمسودة
          </Button>

          <Button
            type="button"
            disabled={isSaving || !isValid}
            onClick={() => saveMutation.mutate("published")}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSaving ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="me-2 h-4 w-4" />
            )}
            {isPublished ? "تحديث ونشر الرحلة" : "نشر الرحلة الآن"}
          </Button>
        </div>
      </div>
    </div>
  );
}
