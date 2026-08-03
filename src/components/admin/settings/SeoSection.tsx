import { Skeleton } from "@/components/ui/skeleton";
import {
  AutoSaveBar,
  FieldGrid,
  ImageField,
  SerpPreview,
  SettingsCard,
  SettingsSection,
  SwitchField,
  TextAreaField,
  TextField,
} from "./parts";
import { combine, maxLen, required, url, useSiteSettings, type SettingSpec } from "./useSiteSettings";

const SPECS: SettingSpec[] = [
  { key: "seo_site_title", label: "Site title", validate: combine(required, maxLen(60)) },
  { key: "seo_meta_description", label: "Meta description", validate: combine(required, maxLen(160)) },
  { key: "seo_keywords", label: "Keywords" },
  { key: "seo_og_image", label: "Share image" },
  { key: "seo_canonical_base", label: "Canonical base URL", validate: url },
  { key: "seo_google_verification", label: "Google verification code" },
  { key: "seo_indexing_enabled", label: "Search indexing" },
];

export function SeoSection() {
  const s = useSiteSettings("seo", SPECS);

  if (s.loading) return <Skeleton className="h-72 w-full rounded-2xl" />;

  const base = (s.form.seo_canonical_base ?? "").replace(/^https?:\/\//, "") || "janatsahara.tn";

  return (
    <SettingsSection
      title="SEO"
      description="How your website appears in Google and when shared on social media."
    >
      <SettingsCard title="Search appearance" description="Title and description for the homepage.">
        <FieldGrid>
          <TextField
            label="Site title"
            hint="Under 60 characters performs best."
            maxCount={60}
            error={s.errors.seo_site_title}
            wide
            value={s.form.seo_site_title ?? ""}
            onChange={(v) => s.set("seo_site_title", v)}
          />
        </FieldGrid>
        <div className="mt-5 grid gap-5">
          <TextAreaField
            label="Meta description"
            hint="Under 160 characters. Describe your services and destinations."
            rows={3}
            value={s.form.seo_meta_description ?? ""}
            onChange={(v) => s.set("seo_meta_description", v)}
          />
          {s.errors.seo_meta_description && (
            <p className="-mt-3 text-caption text-destructive">{s.errors.seo_meta_description}</p>
          )}
          <TextField
            label="Keywords"
            hint="Comma separated. Used for internal search hints."
            wide
            value={s.form.seo_keywords ?? ""}
            onChange={(v) => s.set("seo_keywords", v)}
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Live preview" description="Updates as you type.">
        <SerpPreview
          title={s.form.seo_site_title ?? ""}
          description={s.form.seo_meta_description ?? ""}
          urlLabel={base}
        />
      </SettingsCard>

      <SettingsCard title="Social sharing" description="Image shown on Facebook, WhatsApp and X.">
        <ImageField
          label="Share image"
          hint="Recommended 1200×630."
          folder="seo"
          value={s.form.seo_og_image ?? ""}
          onChange={(v) => s.set("seo_og_image", v)}
        />
      </SettingsCard>

      <SettingsCard title="Technical" description="Canonical domain, indexing and verification.">
        <FieldGrid>
          <TextField
            label="Canonical base URL"
            placeholder="https://janatsahara.tn"
            error={s.errors.seo_canonical_base}
            value={s.form.seo_canonical_base ?? ""}
            onChange={(v) => s.set("seo_canonical_base", v)}
          />
          <TextField
            label="Google verification code"
            hint="The content value of the google-site-verification tag."
            value={s.form.seo_google_verification ?? ""}
            onChange={(v) => s.set("seo_google_verification", v)}
          />
        </FieldGrid>
        <div className="mt-5">
          <SwitchField
            label="Allow search engines to index the website"
            hint="Turn off only while the site is under construction."
            checked={s.bool("seo_indexing_enabled")}
            onChange={(v) => s.setBool("seo_indexing_enabled", v)}
          />
        </div>
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
