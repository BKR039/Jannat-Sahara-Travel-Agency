import { Skeleton } from "@/components/ui/skeleton";
import { SaveBar, SettingsCard, SettingsSection, SwitchField, TextField } from "./parts";
import { numberRange, useSiteSettings, type SettingSpec } from "./useSiteSettings";
import { useTranslation } from "react-i18next";

const SPECS: SettingSpec[] = [
  { key: "notify_new_booking", label: "New booking" },
  { key: "notify_new_message", label: "New message" },
  { key: "notify_newsletter", label: "Newsletter" },
  { key: "notify_daily_digest", label: "Daily digest" },
  { key: "notify_retention_days", label: "Retention", validate: numberRange(1, 365) },
];

export function NotificationsSection() {
  const { t } = useTranslation("admin");
  const s = useSiteSettings("notifications", SPECS);

  if (s.loading) return <Skeleton className="h-64 w-full rounded-card" />;

  const enabled = SPECS.slice(0, 4).filter((x) => s.bool(x.key)).length;

  return (
    <SettingsSection
      title={t("content.settings.nav.notifications.label")}
      description={t("content.settings.notifications.description")}
    >
      <SettingsCard
        title={t("content.settings.notifications.dashboardAlertsTitle")}
        description={`${enabled} of 4 alert types enabled.`}
      >
        <div className="grid gap-3">
          <SwitchField
            label={t("content.settings.notifications.newBooking")}
            hint={t("content.settings.notifications.hints.newBooking")}
            checked={s.bool("notify_new_booking")}
            onChange={(v) => s.setBool("notify_new_booking", v)}
          />
          <SwitchField
            label={t("content.settings.notifications.newMessage")}
            hint={t("content.settings.notifications.hints.newMessage")}
            checked={s.bool("notify_new_message")}
            onChange={(v) => s.setBool("notify_new_message", v)}
          />
          <SwitchField
            label={t("content.settings.notifications.newsletter")}
            hint={t("content.settings.notifications.hints.newsletter")}
            checked={s.bool("notify_newsletter")}
            onChange={(v) => s.setBool("notify_newsletter", v)}
          />
          <SwitchField
            label={t("content.settings.notifications.dailyDigest")}
            hint={t("content.settings.notifications.hints.dailyDigest")}
            checked={s.bool("notify_daily_digest")}
            onChange={(v) => s.setBool("notify_daily_digest", v)}
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("content.settings.notifications.housekeepingTitle")}
        description={t("content.settings.notifications.housekeepingDescription")}
      >
        <TextField
          label={t("content.settings.notifications.retentionLabel")}
          hint={t("content.settings.notifications.hints.retention")}
          type="number"
          error={s.errors.notify_retention_days}
          value={s.form.notify_retention_days ?? ""}
          onChange={(v) => s.set("notify_retention_days", v)}
        />
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
