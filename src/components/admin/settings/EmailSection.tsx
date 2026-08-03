import { Skeleton } from "@/components/ui/skeleton";
import { Mail } from "lucide-react";
import {
  AutoSaveBar,
  FieldGrid,
  SettingsCard,
  SettingsSection,
  SwitchField,
  TextField,
} from "./parts";
import {
  combine,
  email,
  emailList,
  maxLen,
  required,
  useSiteSettings,
  type SettingSpec,
} from "./useSiteSettings";

const SPECS: SettingSpec[] = [
  { key: "email_owner_recipient", label: "Owner recipient", validate: combine(required, email) },
  { key: "email_cc_recipient", label: "CC recipients", validate: emailList },
  { key: "email_from_name", label: "From name", validate: maxLen(50) },
  { key: "email_reply_to", label: "Reply-to address", validate: email },
  { key: "email_subject_prefix", label: "Subject prefix", validate: maxLen(20) },
  { key: "email_booking_enabled", label: "Booking emails" },
];

export function EmailSection() {
  const s = useSiteSettings("email", SPECS);

  if (s.loading) return <Skeleton className="h-72 w-full rounded-2xl" />;

  const prefix = s.form.email_subject_prefix ?? "";
  const from = s.form.email_from_name || "Janat Sahara Travel";

  return (
    <SettingsSection
      title="Email"
      description="Where booking notifications are delivered and how they are labelled."
    >
      <SettingsCard title="Recipients" description="Who receives every new booking.">
        <FieldGrid>
          <TextField
            label="Owner recipient"
            hint="Primary inbox for booking notifications."
            placeholder="owner@janatsahara.tn"
            error={s.errors.email_owner_recipient}
            value={s.form.email_owner_recipient ?? ""}
            onChange={(v) => s.set("email_owner_recipient", v)}
          />
          <TextField
            label="CC recipients"
            hint="Optional. Separate several addresses with commas."
            error={s.errors.email_cc_recipient}
            value={s.form.email_cc_recipient ?? ""}
            onChange={(v) => s.set("email_cc_recipient", v)}
          />
        </FieldGrid>
      </SettingsCard>

      <SettingsCard title="Sender identity" description="How the notification appears in the inbox.">
        <FieldGrid>
          <TextField
            label="From name"
            error={s.errors.email_from_name}
            value={s.form.email_from_name ?? ""}
            onChange={(v) => s.set("email_from_name", v)}
          />
          <TextField
            label="Reply-to address"
            hint="Replies from your team go here."
            error={s.errors.email_reply_to}
            value={s.form.email_reply_to ?? ""}
            onChange={(v) => s.set("email_reply_to", v)}
          />
          <TextField
            label="Subject prefix"
            hint="Helps filter emails, e.g. [Booking]."
            error={s.errors.email_subject_prefix}
            value={prefix}
            onChange={(v) => s.set("email_subject_prefix", v)}
          />
        </FieldGrid>
      </SettingsCard>

      <SettingsCard title="Live preview" description="Inbox row preview of a new booking email.">
        <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-card p-4 shadow-sm">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-primary">
            <Mail className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-small font-semibold">{from}</p>
            <p className="truncate text-small">
              {prefix ? `${prefix} ` : ""}New booking — Umrah Ramadan Premium
            </p>
            <p className="truncate text-caption text-muted-foreground">
              To: {s.form.email_owner_recipient || "not configured"}
              {s.form.email_cc_recipient ? ` · CC: ${s.form.email_cc_recipient}` : ""}
            </p>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Delivery" description="Temporarily pause outgoing notifications.">
        <SwitchField
          label="Send an email for every new booking"
          hint="When off, bookings are still saved and shown in the dashboard."
          checked={s.bool("email_booking_enabled")}
          onChange={(v) => s.setBool("email_booking_enabled", v)}
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
