import { Skeleton } from "@/components/ui/skeleton";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { SaveBar, FieldGrid, SettingsCard, SettingsSection, TextField } from "./parts";
import { useContactSettings, type ContactFieldSpec } from "./useContactSettings";
import { email as emailValidator, url as urlValidator } from "./useSiteSettings";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("admin");
  const s = useContactSettings(CHANNELS);

  if (s.loading) return <Skeleton className="h-64 w-full rounded-card" />;

  const filled = CHANNELS.filter((c) => (s.form[c.key] ?? "").trim());

  return (
    <SettingsSection
      title={t("content.settings.nav.contact.label")}
      description={t("content.settings.contact.description")}
    >
      <SettingsCard
        title={t("content.settings.contact.channelsTitle")}
        description={t("content.settings.contact.channelsDescription")}
      >
        <FieldGrid>
          {/*
           * `spec.label` is the English seed written to the `contact_info`
           * row, not operator-facing copy — rendering it directly meant an
           * Arabic operator read "Landline" and "WhatsApp link". The
           * dictionary answers first; the seed is only the fallback.
           */}
          {CHANNELS.map((c) => (
            <TextField
              key={c.key}
              label={t(`content.settings.fields.${c.key}.label`, c.label)}
              hint={c.hint ? t(`content.settings.fields.${c.key}.hint`, c.hint) : undefined}
              placeholder={c.placeholder}
              error={s.errors[c.key]}
              value={s.form[c.key] ?? ""}
              onChange={(v) => s.set(c.key, v)}
            />
          ))}
        </FieldGrid>
      </SettingsCard>

      <SettingsCard
        title={t("content.settings.livePreview.title")}
        description={t("content.settings.contact.livePreviewDescription")}
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
                  <span className="block text-caption text-muted-foreground">
                    {t(`content.settings.fields.${c.key}.label`, c.label)}
                  </span>
                  <span className="block truncate text-small font-medium">{s.form[c.key]}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-muted-foreground">
            {t("content.settings.contact.emptyHint")}
          </p>
        )}
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
