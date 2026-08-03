import { Skeleton } from "@/components/ui/skeleton";
import {
  AutoSaveBar,
  BrandPreview,
  ColorField,
  FieldGrid,
  ImageField,
  SettingsCard,
  SettingsSection,
  TextField,
} from "./parts";
import { hexColor, maxLen, url, useSiteSettings, type SettingSpec } from "./useSiteSettings";
import { useContactSettings } from "./useContactSettings";

const SPECS: SettingSpec[] = [
  { key: "brand_tagline", label: "Tagline", validate: maxLen(80) },
  { key: "brand_logo_url", label: "Logo" },
  { key: "brand_favicon_url", label: "Favicon" },
  { key: "brand_primary_color", label: "Primary colour", validate: hexColor },
  { key: "brand_accent_color", label: "Accent colour", validate: hexColor },
  { key: "brand_website_url", label: "Website URL", validate: url },
];

export function BrandSection() {
  const s = useSiteSettings("brand", SPECS);
  const contact = useContactSettings([
    { key: "agency_name", label: "Agency name", icon: "building-2", sort_order: 0 },
  ]);

  if (s.loading) return <Skeleton className="h-72 w-full rounded-2xl" />;

  return (
    <SettingsSection
      title="Brand"
      description="Logo, colours and voice. Changes preview instantly below and roll out to the public website."
    >
      <SettingsCard title="Identity" description="Tagline and canonical website address.">
        <FieldGrid>
          <TextField
            label="Tagline"
            hint="A single line under your logo. Keep it short."
            error={s.errors.brand_tagline}
            maxCount={80}
            value={s.form.brand_tagline ?? ""}
            onChange={(v) => s.set("brand_tagline", v)}
          />
          <TextField
            label="Website URL"
            hint="Used in emails and structured data."
            placeholder="https://janatsahara.tn"
            error={s.errors.brand_website_url}
            value={s.form.brand_website_url ?? ""}
            onChange={(v) => s.set("brand_website_url", v)}
          />
        </FieldGrid>
      </SettingsCard>

      <SettingsCard title="Logo & favicon" description="Upload square PNG or SVG files.">
        <ImageField
          label="Logo"
          hint="Transparent background works best. Recommended 512×512."
          folder="brand"
          aspect="aspect-square"
          value={s.form.brand_logo_url ?? ""}
          onChange={(v) => s.set("brand_logo_url", v)}
        />
        <ImageField
          label="Favicon"
          hint="Small browser-tab icon. Recommended 64×64."
          folder="brand"
          aspect="aspect-square"
          value={s.form.brand_favicon_url ?? ""}
          onChange={(v) => s.set("brand_favicon_url", v)}
        />
      </SettingsCard>

      <SettingsCard title="Colours" description="Brand palette used for buttons and highlights.">
        <FieldGrid>
          <ColorField
            label="Primary colour"
            hint="Main call-to-action colour."
            error={s.errors.brand_primary_color}
            value={s.form.brand_primary_color ?? ""}
            onChange={(v) => s.set("brand_primary_color", v)}
          />
          <ColorField
            label="Accent colour"
            hint="Used for premium badges and highlights."
            error={s.errors.brand_accent_color}
            value={s.form.brand_accent_color ?? ""}
            onChange={(v) => s.set("brand_accent_color", v)}
          />
        </FieldGrid>
      </SettingsCard>

      <SettingsCard title="Live preview" description="Your brand header and buttons in real time.">
        <BrandPreview
          logo={s.form.brand_logo_url ?? ""}
          name={contact.form.agency_name ?? ""}
          tagline={s.form.brand_tagline ?? ""}
          primary={s.form.brand_primary_color || "#EE5A24"}
          accent={s.form.brand_accent_color || "#C9982E"}
        />
      </SettingsCard>

      <AutoSaveBar
        dirty={s.dirty}
        saving={s.saving}
        hasErrors={s.hasErrors}
        lastSaved={s.lastSaved}
        onSave={s.saveNow}
        onDiscard={s.discard}
      />
    </SettingsSection>
  );
}
