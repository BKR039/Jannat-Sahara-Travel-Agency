import { Skeleton } from "@/components/ui/skeleton";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { AutoSaveBar, FieldGrid, SettingsCard, SettingsSection, TextField } from "./parts";
import { useContactSettings, type ContactFieldSpec } from "./useContactSettings";
import { email as emailValidator, url as urlValidator } from "./useSiteSettings";

const CHANNELS: ContactFieldSpec[] = [
  {
    key: "phone",
    label: "Landline",
    icon: "phone",
    sort_order: 2,
    placeholder: "+216 71 234 567",
  },
  {
    key: "mobile",
    label: "Mobile",
    icon: "smartphone",
    sort_order: 3,
    placeholder: "+216 55 123 456",
  },
  {
    key: "email",
    label: "Contact email",
    icon: "mail",
    sort_order: 4,
    hint: "Published on the website for travellers.",
    validate: emailValidator,
  },
  {
    key: "whatsapp",
    label: "WhatsApp link",
    icon: "message-circle",
    sort_order: 8,
    hint: "Full wa.me link, e.g. https://wa.me/21655123456",
    validate: urlValidator,
  },
  {
    key: "emergency",
    label: "Emergency contact",
    icon: "phone-call",
    sort_order: 9,
    hint: "Optional out-of-hours number for travellers.",
  },
];

export function ContactSection() {
  const s = useContactSettings(CHANNELS);

  if (s.loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const filled = CHANNELS.filter((c) => (s.form[c.key] ?? "").trim());

  return (
    <SettingsSection
      title="Contact"
      description="The channels travellers use to reach you. Empty channels are hidden from the public website."
    >
      <SettingsCard title="Contact channels" description="Phone, email and messaging.">
        <FieldGrid>
          {CHANNELS.map((c) => (
            <TextField
              key={c.key}
              label={c.label}
              hint={c.hint}
              placeholder={c.placeholder}
              error={s.errors[c.key]}
              value={s.form[c.key] ?? ""}
              onChange={(v) => s.set(c.key, v)}
            />
          ))}
        </FieldGrid>
      </SettingsCard>

      <SettingsCard
        title="Live preview"
        description="How the contact card renders on the website."
      >
        {filled.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filled.map((c) => (
              <li
                key={c.key}
                className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-sunken/40 px-4 py-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                  <DynamicIcon name={c.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-caption text-muted-foreground">{c.label}</span>
                  <span className="block truncate text-small font-medium">{s.form[c.key]}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-muted-foreground">Add at least one contact channel.</p>
        )}
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
