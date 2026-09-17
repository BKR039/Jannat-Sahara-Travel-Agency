import { Skeleton } from "@/components/ui/skeleton";
import {
  SaveBar,
  FieldGrid,
  ImageField,
  SerpPreview,
  SettingsCard,
  SettingsSection,
  SwitchField,
  TextAreaField,
  TextField,
} from "./parts";
import {
  combine,
  maxLen,
  required,
  url,
  useSiteSettings,
  type SettingSpec,
} from "./useSiteSettings";
import { useTranslation } from "react-i18next";

const SPECS: SettingSpec[] = [
  { key: "seo_site_title", label: "Site title", validate: combine(required, maxLen(60)) },
  {
    key: "seo_meta_description",
    label: "Meta description",
    validate: combine(required, maxLen(160)),
  },
  { key: "seo_keywords", label: "Keywords" },
  { key: "seo_og_image", label: "Share image" },
  { key: "seo_canonical_base", label: "Canonical base URL", validate: url },
  { key: "seo_google_verification", label: "Google verification code" },
  { key: "seo_indexing_enabled", label: "Search indexing" },
];

export function SeoSection() {
  const { t } = useTranslation("admin");
  const s = useSiteSettings("seo", SPECS);

  if (s.loading) return <Skeleton className="h-72 w-full rounded-card" />;

  const base = (s.form.seo_canonical_base ?? "").replace(/^https?:\/\//, "") || "janatsahara.tn";

  return (
    <SettingsSection
      title={t("content.settings.seo.title")}
      description={t("content.settings.seo.description")}
    >
      <SettingsCard
        title={t("content.settings.nav.seo.label")}
        description={t("content.settings.seo.searchAppearanceDescription")}
      >
        <FieldGrid>
          <TextField
            label={t("content.settings.seo.siteTitle")}
            hint={t("content.settings.seo.hints.siteTitle")}
            maxCount={60}
            error={s.errors.seo_site_title}
            wide
            value={s.form.seo_site_title ?? ""}
            onChange={(v) => s.set("seo_site_title", v)}
          />
        </FieldGrid>
        <div className="mt-5 grid gap-5">
          <TextAreaField
            label={t("content.settings.seo.metaDescription")}
            hint={t("content.settings.seo.hints.metaDescription")}
            rows={3}
            value={s.form.seo_meta_description ?? ""}
            onChange={(v) => s.set("seo_meta_description", v)}
          />
          {s.errors.seo_meta_description && (
            <p className="-mt-3 text-caption text-destructive">{s.errors.seo_meta_description}</p>
          )}
          <TextField
            label={t("content.settings.seo.keywords")}
            hint={t("content.settings.seo.hints.keywords")}
            wide
            value={s.form.seo_keywords ?? ""}
            onChange={(v) => s.set("seo_keywords", v)}
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("content.settings.livePreview.title")}
        description={t("content.settings.seo.livePreviewDescription")}
      >
        <SerpPreview
          title={s.form.seo_site_title ?? ""}
          description={s.form.seo_meta_description ?? ""}
          urlLabel={base}
        />
      </SettingsCard>

      <SettingsCard
        title={t("content.settings.seo.socialSharingTitle")}
        description={t("content.settings.seo.socialSharingDescription")}
      >
        <ImageField
          label={t("content.settings.seo.shareImage")}
          hint={t("content.settings.seo.hints.shareImage")}
          folder="seo"
          value={s.form.seo_og_image ?? ""}
          onChange={(v) => s.set("seo_og_image", v)}
        />
      </SettingsCard>

      <SettingsCard
        title={t("content.settings.seo.technicalTitle")}
        description={t("content.settings.seo.technicalDescription")}
      >
        <FieldGrid>
          <TextField
            label={t("content.settings.seo.canonicalBaseUrl")}
            placeholder="https://janatsahara.tn"
            error={s.errors.seo_canonical_base}
            value={s.form.seo_canonical_base ?? ""}
            onChange={(v) => s.set("seo_canonical_base", v)}
          />
          <TextField
            label={t("content.settings.seo.googleVerificationCode")}
            hint={t("content.settings.seo.hints.googleVerification")}
            value={s.form.seo_google_verification ?? ""}
            onChange={(v) => s.set("seo_google_verification", v)}
          />
        </FieldGrid>
        <div className="mt-5">
          <SwitchField
            label={t("content.settings.seo.allowIndexing")}
            hint={t("content.settings.seo.hints.indexing")}
            checked={s.bool("seo_indexing_enabled")}
            onChange={(v) => s.setBool("seo_indexing_enabled", v)}
          />
        </div>
      </SettingsCard>

      <SaveBar
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
