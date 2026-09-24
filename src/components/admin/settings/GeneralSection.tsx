import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Building2,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { branchesQuery } from "@/lib/queries";
import { uploadMedia } from "@/lib/admin/media";
import { cn } from "@/lib/utils";
import { SaveBar, FieldGrid, SettingsCard, SettingsSection, TextField } from "./parts";
import { localeKey, useContactSettings, type ContactFieldSpec } from "./useContactSettings";
import {
  combine,
  email,
  maxLen,
  required,
  url,
  useSiteSettings,
  type SettingSpec,
} from "./useSiteSettings";
import { LocalizedField } from "@/components/admin/LocalizedField";

const GENERAL_CONTACT_FIELDS: ContactFieldSpec[] = [
  {
    key: "agency_name",
    localized: true,
    label: "اسم الوكالة الرسمي",
    icon: "building-2",
    sort_order: 0,
    hint: "يظهر في الفواتير، تذييل الموقع، ورسائل البريد.",
    validate: combine(required, maxLen(60)),
  },
  {
    key: "address",
    localized: true,
    label: "عنوان المقر الرئيسي",
    icon: "map-pin",
    sort_order: 1,
    wide: true,
    multiline: true,
    validate: required,
  },
  {
    key: "hours",
    localized: true,
    label: "ساعات وأيام العمل",
    icon: "clock",
    sort_order: 5,
    placeholder: "الإثنين – السبت: 09:00 – 18:00",
  },
  {
    key: "maps_url",
    label: "رابط خرائط جوجل للمقر",
    icon: "map",
    sort_order: 10,
    hint: "رابط مشاركة الموقع الجغرافي للمقر على Google Maps.",
    validate: url,
  },
  {
    key: "phone",
    label: "الهاتف القار الرئيسي",
    icon: "phone",
    sort_order: 2,
    placeholder: "+216 71 234 567",
  },
  {
    key: "email",
    label: "البريد الإلكتروني الرسمي",
    icon: "mail",
    sort_order: 4,
    validate: email,
    placeholder: "contact@janatsahara.tn",
  },
];

const BRAND_IDENTITY_SPECS: SettingSpec[] = [
  { key: "brand_tagline", label: "الشعار اللفظي (Tagline)", validate: maxLen(80) },
  { key: "brand_logo_url", label: "شعار الوكالة (Logo)" },
  { key: "brand_favicon_url", label: "أيقونة المتصفح (Favicon)" },
];

function BrandAssetPicker({
  label,
  hint,
  value,
  onChange,
  aspect = "square",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  aspect?: "square" | "rect";
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadMedia(file, "brand");
      onChange(publicUrl);
      toast.success("تم رفع الصورة وتحديث الرابط بنجاح");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  const boxClass = aspect === "rect" ? "h-20 w-36" : "h-20 w-20";

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className={cn(
          "relative grid place-items-center rounded-xl border border-border-subtle bg-surface-sunken/60 overflow-hidden transition-colors hover:border-primary/50 shrink-0",
          boxClass,
        )}
        aria-label={`تعديل أو رفع ${label}`}
      >
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-contain p-2" />
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
        )}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-background/80">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-small font-semibold text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-caption text-muted-foreground">{hint}</p>}
        <div className="mt-2 flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/svg+xml,image/jpeg,image/webp,image/x-icon"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="h-7 px-2.5 text-[11px] gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>{value ? "استبدال" : "رفع ملف"}</span>
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
              disabled={uploading}
              className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>إزالة</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function GeneralSection() {
  const contact = useContactSettings(GENERAL_CONTACT_FIELDS);
  const brand = useSiteSettings("brand", BRAND_IDENTITY_SPECS);
  const { data: branches = [] } = useQuery(branchesQuery());

  if (contact.loading || brand.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full rounded-card" />
        <Skeleton className="h-48 w-full rounded-card" />
      </div>
    );
  }

  const dirty = contact.dirty || brand.dirty;
  const saving = contact.saving || brand.saving;
  const hasErrors = contact.hasErrors || brand.hasErrors;
  const lastSaved = contact.lastSaved || brand.lastSaved;

  async function handleSaveAll() {
    try {
      if (contact.dirty) await contact.saveNow();
      if (brand.dirty) await brand.saveNow();
      toast.success("تم حفظ معلومات الوكالة والهوية بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء حفظ بعض الإعدادات");
    }
  }

  function handleDiscardAll() {
    contact.discard();
    brand.discard();
  }

  return (
    <SettingsSection
      title="الهوية والمعلومات الأساسية (General Information)"
      description="بيانات الوكالة الرسمية، المقر الرئيسي، وأوقات العمل المعتمدة."
    >
      {/* 1. Core Identity & Multilingual Name */}
      <SettingsCard
        title="الهوية المؤسسية (Agency Identity)"
        description="اسم الوكالة الرسمي باللغات المعتمدة، الشعار اللفظي، والشعار المعتمد."
      >
        <FieldGrid>
          <div className="md:col-span-2">
            <LocalizedField
              label="اسم الوكالة الرسمي (Agency Name)"
              values={{
                base: contact.form.agency_name ?? "",
                fr: contact.form[localeKey("agency_name", "fr")] ?? "",
                en: contact.form[localeKey("agency_name", "en")] ?? "",
              }}
              onChange={(v) => {
                contact.set("agency_name", v.base);
                contact.set(localeKey("agency_name", "fr"), v.fr);
                contact.set(localeKey("agency_name", "en"), v.en);
              }}
            />
          </div>

          <div className="md:col-span-2">
            <TextField
              label="الشعار اللفظي للوكالة (Tagline)"
              placeholder="رحلتك تبدأ من هنا — جودة، أمان، وراحة بال"
              hint="جملة الوصف المختصرة التي تعبر عن رسالة الوكالة."
              error={brand.errors.brand_tagline}
              wide
              value={brand.form.brand_tagline ?? ""}
              onChange={(v) => brand.set("brand_tagline", v)}
            />
          </div>

          <div className="md:col-span-2 pt-2 border-t border-border-subtle grid gap-6 sm:grid-cols-2">
            <BrandAssetPicker
              label="شعار الوكالة الرسمي (Logo)"
              hint="صيغة PNG أو SVG بخلفية شفافة (عرض مثالي 200px+)."
              value={brand.form.brand_logo_url ?? ""}
              onChange={(v) => brand.set("brand_logo_url", v)}
              aspect="rect"
            />

            <BrandAssetPicker
              label="أيقونة المتصفح (Favicon)"
              hint="تظهر في تبويب المتصفح بجانب عنوان الموقع (صيغة ICO أو PNG مربعة)."
              value={brand.form.brand_favicon_url ?? ""}
              onChange={(v) => brand.set("brand_favicon_url", v)}
              aspect="square"
            />
          </div>
        </FieldGrid>
      </SettingsCard>

      {/* 2. Head Office Address & Hours */}
      <SettingsCard
        title="المقر الرئيسي وأوقات الدوام (Head Office & Working Hours)"
        description="عنوان المقر الرئيسي وساعات العمل المعتمدة في تذييل الموقع وصفحات التواصل."
      >
        <FieldGrid>
          <div className="md:col-span-2">
            <LocalizedField
              label="عنوان المقر الرئيسي (Head Office Address)"
              rows={2}
              values={{
                base: contact.form.address ?? "",
                fr: contact.form[localeKey("address", "fr")] ?? "",
                en: contact.form[localeKey("address", "en")] ?? "",
              }}
              onChange={(v) => {
                contact.set("address", v.base);
                contact.set(localeKey("address", "fr"), v.fr);
                contact.set(localeKey("address", "en"), v.en);
              }}
            />
          </div>

          <div className="md:col-span-2">
            <LocalizedField
              label="ساعات وأيام العمل (Working Hours)"
              values={{
                base: contact.form.hours ?? "",
                fr: contact.form[localeKey("hours", "fr")] ?? "",
                en: contact.form[localeKey("hours", "en")] ?? "",
              }}
              onChange={(v) => {
                contact.set("hours", v.base);
                contact.set(localeKey("hours", "fr"), v.fr);
                contact.set(localeKey("hours", "en"), v.en);
              }}
            />
          </div>

          <TextField
            label="رابط خرائط جوجل للمقر (Google Maps Link)"
            hint="رابط مشاركة الموقع الجغرافي للمقر على خرائط Google."
            error={contact.errors.maps_url}
            wide
            value={contact.form.maps_url ?? ""}
            onChange={(v) => contact.set("maps_url", v)}
          />
        </FieldGrid>
      </SettingsCard>

      {/* 3. Primary Operational Contacts */}
      <SettingsCard
        title="وسائل الاتصال التشغيلية الرسمية"
        description="أرقام وقنوات التواصل الأساسية المنشورة في رأس الموقع وتذييل الصفحات."
      >
        <FieldGrid>
          <TextField
            label="الهاتف القار الرئيسي"
            placeholder="+216 71 000 000"
            error={contact.errors.phone}
            value={contact.form.phone ?? ""}
            onChange={(v) => contact.set("phone", v)}
          />
          <TextField
            label="البريد الإلكتروني الرسمي"
            placeholder="contact@janatsahara.tn"
            error={contact.errors.email}
            value={contact.form.email ?? ""}
            onChange={(v) => contact.set("email", v)}
          />
        </FieldGrid>
      </SettingsCard>

      <SaveBar
        dirty={dirty}
        saving={saving}
        hasErrors={hasErrors}
        lastSaved={lastSaved}
        onSave={handleSaveAll}
        onDiscard={handleDiscardAll}
      />
    </SettingsSection>
  );
}
