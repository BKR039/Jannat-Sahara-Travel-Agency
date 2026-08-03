import { Skeleton } from "@/components/ui/skeleton";
import { AutoSaveBar, SettingsCard, SettingsSection, SwitchField, TextField } from "./parts";
import { numberRange, useSiteSettings, type SettingSpec } from "./useSiteSettings";

const SPECS: SettingSpec[] = [
  { key: "notify_new_booking", label: "New booking" },
  { key: "notify_new_message", label: "New message" },
  { key: "notify_newsletter", label: "Newsletter" },
  { key: "notify_daily_digest", label: "Daily digest" },
  { key: "notify_retention_days", label: "Retention", validate: numberRange(1, 365) },
];

export function NotificationsSection() {
  const s = useSiteSettings("notifications", SPECS);

  if (s.loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const enabled = SPECS.slice(0, 4).filter((x) => s.bool(x.key)).length;

  return (
    <SettingsSection
      title="Notifications"
      description="Choose which activity creates an alert in the admin dashboard bell."
    >
      <SettingsCard
        title="Dashboard alerts"
        description={`${enabled} of 4 alert types enabled.`}
      >
        <div className="grid gap-3">
          <SwitchField
            label="New booking received"
            hint="Alerts the team as soon as a traveller reserves a package."
            checked={s.bool("notify_new_booking")}
            onChange={(v) => s.setBool("notify_new_booking", v)}
          />
          <SwitchField
            label="New contact message"
            hint="Alerts when someone submits the contact form."
            checked={s.bool("notify_new_message")}
            onChange={(v) => s.setBool("notify_new_message", v)}
          />
          <SwitchField
            label="New newsletter subscriber"
            hint="Useful while growing your mailing list."
            checked={s.bool("notify_newsletter")}
            onChange={(v) => s.setBool("notify_newsletter", v)}
          />
          <SwitchField
            label="Daily activity digest"
            hint="A single summary alert instead of individual pings."
            checked={s.bool("notify_daily_digest")}
            onChange={(v) => s.setBool("notify_daily_digest", v)}
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Housekeeping" description="How long read alerts stay in the bell.">
        <TextField
          label="Keep notifications for (days)"
          hint="Between 1 and 365 days."
          type="number"
          error={s.errors.notify_retention_days}
          value={s.form.notify_retention_days ?? ""}
          onChange={(v) => s.set("notify_retention_days", v)}
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
