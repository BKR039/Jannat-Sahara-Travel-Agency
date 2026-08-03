import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { AutoSaveBar, Field, SettingsCard, SettingsSection } from "./parts";
import { useContactSettings, type ContactFieldSpec } from "./useContactSettings";
import { url as urlValidator } from "./useSiteSettings";

const SOCIALS: (ContactFieldSpec & { placeholder: string })[] = [
  {
    key: "facebook",
    label: "Facebook",
    icon: "facebook",
    sort_order: 6,
    placeholder: "https://facebook.com/yourpage",
    validate: urlValidator,
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: "instagram",
    sort_order: 7,
    placeholder: "https://instagram.com/yourpage",
    validate: urlValidator,
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: "music",
    sort_order: 11,
    placeholder: "https://tiktok.com/@yourpage",
    validate: urlValidator,
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: "youtube",
    sort_order: 12,
    placeholder: "https://youtube.com/@yourchannel",
    validate: urlValidator,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: "linkedin",
    sort_order: 13,
    placeholder: "https://linkedin.com/company/yourpage",
    validate: urlValidator,
  },
  {
    key: "telegram",
    label: "Telegram",
    icon: "send",
    sort_order: 14,
    placeholder: "https://t.me/yourchannel",
    validate: urlValidator,
  },
];

export function SocialSection() {
  const s = useContactSettings(SOCIALS);

  if (s.loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const active = SOCIALS.filter((f) => (s.form[f.key] ?? "").trim());

  return (
    <SettingsSection
      title="Social media"
      description="Connect your channels once — they appear in the site footer, contact section and structured data automatically."
    >
      <SettingsCard
        title="Channels"
        description="Leave a field empty to hide that channel from the website."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {SOCIALS.map((f) => {
            const value = s.form[f.key] ?? "";
            return (
              <Field
                key={f.key}
                label={f.label}
                error={s.errors[f.key]}
                hint={`Example: ${f.placeholder}`}
              >
                <div className="flex gap-2">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border-subtle bg-surface-sunken/60 text-primary">
                    <DynamicIcon name={f.icon} className="h-4 w-4" />
                  </span>
                  <Input
                    value={value}
                    placeholder={f.placeholder}
                    onChange={(e) => s.set(f.key, e.target.value)}
                  />
                  {value && !s.errors[f.key] && (
                    <Button asChild variant="ghost" size="icon" aria-label={`Open ${f.label}`}>
                      <a href={value} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </Field>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard title="Live preview" description="How the footer social row will look.">
        {active.length ? (
          <div className="flex flex-wrap gap-3">
            {active.map((f) => (
              <span
                key={f.key}
                className="flex items-center gap-2 rounded-full border border-border-subtle bg-surface-sunken/50 px-4 py-2 text-small"
              >
                <DynamicIcon name={f.icon} className="h-4 w-4 text-primary" />
                {f.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-small text-muted-foreground">
            No channels connected yet — the social row stays hidden.
          </p>
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
