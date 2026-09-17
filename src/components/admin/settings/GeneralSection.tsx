import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { SaveBar, Field, FieldGrid, SettingsCard, SettingsSection, TextField } from "./parts";
import { localeKey, useContactSettings, type ContactFieldSpec } from "./useContactSettings";
import { combine, maxLen, required, url } from "./useSiteSettings";
import { useTranslation } from "react-i18next";
import { LocalizedField } from "@/components/admin/LocalizedField";

const FIELDS: ContactFieldSpec[] = [
  {
    key: "agency_name",
    localized: true,
    label: "Agency name",
    icon: "building-2",
    sort_order: 0,
    hint: "Shown in emails, the footer and structured data.",
    validate: combine(required, maxLen(60)),
  },
  {
    key: "address",
    localized: true,
    label: "Head office address",
    icon: "map-pin",
    sort_order: 1,
    wide: true,
    multiline: true,
    validate: required,
  },
  {
    key: "hours",
    localized: true,
    label: "Working hours",
    icon: "clock",
    sort_order: 5,
    placeholder: "Mon – Sat: 9:00 – 18:00",
  },
  {
    key: "maps_url",
    label: "Google Maps link",
    icon: "map",
    sort_order: 10,
    hint: "Paste the share link of your office location.",
    validate: url,
  },
];

export function GeneralSection() {
  const { t } = useTranslation("admin");
  const s = useContactSettings(FIELDS);

  if (s.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  return (
    <SettingsSection
      title={t("content.settings.nav.general.label")}
      description={t("content.settings.general.description")}
    >
      <SettingsCard
        title={t("content.settings.general.identityTitle")}
        description={t("content.settings.general.identityDescription")}
      >
        <FieldGrid>
          <div className="md:col-span-2">
            <LocalizedField
              label={t("content.settings.general.agencyName")}
              values={{
                base: s.form.agency_name ?? "",
                fr: s.form[localeKey("agency_name", "fr")] ?? "",
                en: s.form[localeKey("agency_name", "en")] ?? "",
              }}
              onChange={(v) => {
                s.set("agency_name", v.base);
                s.set(localeKey("agency_name", "fr"), v.fr);
                s.set(localeKey("agency_name", "en"), v.en);
              }}
            />
          </div>
          <div className="md:col-span-2">
            <LocalizedField
              label={t("content.settings.general.workingHours")}
              values={{
                base: s.form.hours ?? "",
                fr: s.form[localeKey("hours", "fr")] ?? "",
                en: s.form[localeKey("hours", "en")] ?? "",
              }}
              onChange={(v) => {
                s.set("hours", v.base);
                s.set(localeKey("hours", "fr"), v.fr);
                s.set(localeKey("hours", "en"), v.en);
              }}
            />
          </div>
        </FieldGrid>
      </SettingsCard>

      <SettingsCard
        title={t("content.settings.general.locationTitle")}
        description={t("content.settings.general.locationDescription")}
      >
        <FieldGrid>
          <div className="md:col-span-2">
            <LocalizedField
              label={t("content.settings.general.headOfficeAddress")}
              rows={2}
              values={{
                base: s.form.address ?? "",
                fr: s.form[localeKey("address", "fr")] ?? "",
                en: s.form[localeKey("address", "en")] ?? "",
              }}
              onChange={(v) => {
                s.set("address", v.base);
                s.set(localeKey("address", "fr"), v.fr);
                s.set(localeKey("address", "en"), v.en);
              }}
            />
          </div>
          <TextField
            label={t("content.settings.general.googleMapsLink")}
            hint={t("content.settings.general.hints.mapsUrl")}
            error={s.errors.maps_url}
            wide
            value={s.form.maps_url ?? ""}
            onChange={(v) => s.set("maps_url", v)}
          />
        </FieldGrid>
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
