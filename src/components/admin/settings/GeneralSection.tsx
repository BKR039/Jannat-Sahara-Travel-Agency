import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AutoSaveBar,
  Field,
  FieldGrid,
  SettingsCard,
  SettingsSection,
  TextField,
} from "./parts";
import { useContactSettings, type ContactFieldSpec } from "./useContactSettings";
import { combine, maxLen, required, url } from "./useSiteSettings";

const FIELDS: ContactFieldSpec[] = [
  {
    key: "agency_name",
    label: "Agency name",
    icon: "building-2",
    sort_order: 0,
    hint: "Shown in emails, the footer and structured data.",
    validate: combine(required, maxLen(60)),
  },
  {
    key: "address",
    label: "Head office address",
    icon: "map-pin",
    sort_order: 1,
    wide: true,
    multiline: true,
    validate: required,
  },
  {
    key: "hours",
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
  const s = useContactSettings(FIELDS);

  if (s.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <SettingsSection
      title="General"
      description="The core identity of your agency. These details appear across the public website, booking confirmations and search engines."
    >
      <SettingsCard title="Agency identity" description="How your agency is named everywhere.">
        <FieldGrid>
          <TextField
            label="Agency name"
            hint={FIELDS[0].hint}
            error={s.errors.agency_name}
            maxCount={60}
            value={s.form.agency_name ?? ""}
            onChange={(v) => s.set("agency_name", v)}
          />
          <TextField
            label="Working hours"
            placeholder="Mon – Sat: 9:00 – 18:00"
            value={s.form.hours ?? ""}
            onChange={(v) => s.set("hours", v)}
          />
        </FieldGrid>
      </SettingsCard>

      <SettingsCard title="Location" description="Where travellers can find you.">
        <FieldGrid>
          <Field
            label="Head office address"
            hint="Street, city and country."
            error={s.errors.address}
            wide
          >
            <Textarea
              rows={2}
              value={s.form.address ?? ""}
              onChange={(e) => s.set("address", e.target.value)}
            />
          </Field>
          <TextField
            label="Google Maps link"
            hint="Paste the share link of your office location."
            error={s.errors.maps_url}
            wide
            value={s.form.maps_url ?? ""}
            onChange={(v) => s.set("maps_url", v)}
          />
        </FieldGrid>
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
