import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGrid,
  SaveBar,
  SettingsCard,
  SettingsSection,
  TextField,
  useLastSaved,
} from "./parts";
import { useContactSettings, type ContactFieldSpec } from "./useContactSettings";
import { Skeleton } from "@/components/ui/skeleton";

const IDENTITY: ContactFieldSpec[] = [
  {
    key: "agency_name",
    label: "Agency name",
    icon: "building-2",
    sort_order: 0,
    hint: "Shown in emails and structured data.",
  },
  {
    key: "email",
    label: "Contact email",
    icon: "mail",
    sort_order: 4,
    hint: "Where booking notifications are sent.",
  },
  { key: "phone", label: "Landline", icon: "phone", sort_order: 2, placeholder: "+216 71 234 567" },
  {
    key: "mobile",
    label: "Mobile",
    icon: "smartphone",
    sort_order: 3,
    placeholder: "+216 55 123 456",
  },
  {
    key: "whatsapp",
    label: "WhatsApp link",
    icon: "message-circle",
    sort_order: 8,
    hint: "Full wa.me link, e.g. https://wa.me/21655123456",
  },
  {
    key: "emergency",
    label: "Emergency contact",
    icon: "phone-call",
    sort_order: 9,
    hint: "Optional out-of-hours number for travellers.",
  },
];

const LOCATION: ContactFieldSpec[] = [
  {
    key: "address",
    label: "Head office address",
    icon: "map-pin",
    sort_order: 1,
    wide: true,
    multiline: true,
  },
  {
    key: "maps_url",
    label: "Google Maps link",
    icon: "map",
    sort_order: 10,
    wide: true,
    hint: "Paste the share link of your office location.",
  },
  {
    key: "hours",
    label: "Working hours",
    icon: "clock",
    sort_order: 5,
    wide: true,
    placeholder: "Mon – Sat: 9:00 – 18:00",
  },
];

const ALL = [...IDENTITY, ...LOCATION];

export function GeneralSection() {
  const s = useContactSettings(ALL);
  const lastSaved = useLastSaved(s.save.isPending, s.save.isSuccess);

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
      <SettingsCard
        title="Agency identity"
        description="Name and the channels travellers use to reach you."
      >
        <FieldGrid>
          {IDENTITY.map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              hint={f.hint}
              placeholder={f.placeholder}
              value={s.form[f.key] ?? ""}
              onChange={(v) => s.set(f.key, v)}
            />
          ))}
        </FieldGrid>
      </SettingsCard>

      <SettingsCard
        title="Location & availability"
        description="Where you are and when you are open."
      >
        <FieldGrid>
          <Field label="Head office address" hint="Street, city and country." wide>
            <Textarea
              rows={2}
              value={s.form.address ?? ""}
              onChange={(e) => s.set("address", e.target.value)}
            />
          </Field>
          <TextField
            label="Working hours"
            placeholder="Mon – Sat: 9:00 – 18:00"
            value={s.form.hours ?? ""}
            onChange={(v) => s.set("hours", v)}
          />
          <TextField
            label="Google Maps link"
            hint="Paste the share link of your office location."
            value={s.form.maps_url ?? ""}
            onChange={(v) => s.set("maps_url", v)}
          />
        </FieldGrid>
      </SettingsCard>

      <SaveBar
        dirty={s.dirty}
        saving={s.save.isPending}
        lastSaved={lastSaved}
        onSave={() => s.save.mutate()}
        onDiscard={s.discard}
      />
    </SettingsSection>
  );
}
