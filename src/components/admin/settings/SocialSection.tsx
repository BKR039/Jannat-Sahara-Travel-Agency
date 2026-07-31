import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { Field, SaveBar, SettingsCard, SettingsSection, useLastSaved } from "./parts";
import { useContactSettings, type ContactFieldSpec } from "./useContactSettings";

const SOCIALS: (ContactFieldSpec & { placeholder: string })[] = [
  { key: "facebook", label: "Facebook", icon: "facebook", sort_order: 6, placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram", icon: "instagram", sort_order: 7, placeholder: "https://instagram.com/yourpage" },
  { key: "tiktok", label: "TikTok", icon: "music", sort_order: 11, placeholder: "https://tiktok.com/@yourpage" },
  { key: "youtube", label: "YouTube", icon: "youtube", sort_order: 12, placeholder: "https://youtube.com/@yourchannel" },
  { key: "linkedin", label: "LinkedIn", icon: "linkedin", sort_order: 13, placeholder: "https://linkedin.com/company/yourpage" },
  { key: "telegram", label: "Telegram", icon: "send", sort_order: 14, placeholder: "https://t.me/yourchannel" },
  { key: "whatsapp", label: "WhatsApp", icon: "message-circle", sort_order: 8, placeholder: "https://wa.me/21655123456" },
];

function isValid(url: string) {
  if (!url) return true;
  return /^https?:\/\/\S+$/i.test(url.trim());
}

export function SocialSection() {
  const s = useContactSettings(SOCIALS);
  const lastSaved = useLastSaved(s.save.isPending, s.save.isSuccess);
  const invalid = SOCIALS.some((f) => !isValid(s.form[f.key] ?? ""));

  if (s.loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const active = SOCIALS.filter((f) => (s.form[f.key] ?? "").trim());

  return (
    <SettingsSection
      title="Social media"
      description="Connect your channels once — they appear in the site footer, contact section and structured data automatically."
    >
      <SettingsCard title="Channels" description="Leave a field empty to hide that channel from the website.">
        <div className="grid gap-5 md:grid-cols-2">
          {SOCIALS.map((f) => {
            const value = s.form[f.key] ?? "";
            const bad = !isValid(value);
            return (
              <Field
                key={f.key}
                label={f.label}
                error={bad ? "Enter a full link starting with https://" : null}
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
                    aria-invalid={bad}
                  />
                </div>
              </Field>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard title="Preview" description="How your channel buttons will look and where they point.">
        {active.length === 0 ? (
          <p className="text-small text-muted-foreground">Add at least one link to see the preview.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {active.map((f) => (
              <Button key={f.key} asChild variant="outline" size="sm">
                <a href={s.form[f.key]} target="_blank" rel="noreferrer noopener">
                  <DynamicIcon name={f.icon} className="me-2 h-4 w-4" />
                  {f.label}
                  <ExternalLink className="ms-2 h-3.5 w-3.5 opacity-60" />
                </a>
              </Button>
            ))}
          </div>
        )}
      </SettingsCard>

      <SaveBar
        dirty={s.dirty && !invalid}
        saving={s.save.isPending}
        lastSaved={lastSaved}
        onSave={() => s.save.mutate()}
        onDiscard={s.discard}
      />
    </SettingsSection>
  );
}
