import { Skeleton } from "@/components/ui/skeleton";
import { Mail } from "lucide-react";
import { SaveBar, FieldGrid, SettingsCard, SettingsSection, SwitchField, TextField } from "./parts";
import {
  combine,
  email,
  emailList,
  maxLen,
  required,
  useSiteSettings,
  type SettingSpec,
} from "./useSiteSettings";
import { useTranslation } from "react-i18next";

const SPECS: SettingSpec[] = [
  { key: "email_owner_recipient", label: "Owner recipient", validate: combine(required, email) },
  { key: "email_cc_recipient", label: "CC recipients", validate: emailList },
  { key: "email_from_name", label: "From name", validate: maxLen(50) },
  { key: "email_reply_to", label: "Reply-to address", validate: email },
  { key: "email_subject_prefix", label: "Subject prefix", validate: maxLen(20) },
  { key: "email_booking_enabled", label: "Booking emails" },
];

export function EmailSection() {
  const { t } = useTranslation("admin");
  const s = useSiteSettings("email", SPECS);

  if (s.loading) return <Skeleton className="h-72 w-full rounded-card" />;

  const prefix = s.form.email_subject_prefix ?? "";
  const from = s.form.email_from_name || "Janat Sahara Travel";

  return (
    <SettingsSection
      title={t("content.settings.nav.email.label")}
      description={t("content.settings.email.description")}
    >
      <SettingsCard
        title={t("content.settings.email.recipientsTitle")}
        description={t("content.settings.email.recipientsDescription")}
      >
        <FieldGrid>
          <TextField
            label={t("content.settings.email.ownerRecipient")}
            hint={t("content.settings.email.hints.ownerRecipient")}
            placeholder="owner@janatsahara.tn"
            error={s.errors.email_owner_recipient}
            value={s.form.email_owner_recipient ?? ""}
            onChange={(v) => s.set("email_owner_recipient", v)}
          />
          <TextField
            label={t("content.settings.email.ccRecipients")}
            hint={t("content.settings.email.hints.ccRecipients")}
            error={s.errors.email_cc_recipient}
            value={s.form.email_cc_recipient ?? ""}
            onChange={(v) => s.set("email_cc_recipient", v)}
          />
        </FieldGrid>
      </SettingsCard>

      <SettingsCard
        title={t("content.settings.email.senderIdentityTitle")}
        description={t("content.settings.email.senderIdentityDescription")}
      >
        <FieldGrid>
          <TextField
            label={t("content.settings.email.fromName")}
            error={s.errors.email_from_name}
            value={s.form.email_from_name ?? ""}
            onChange={(v) => s.set("email_from_name", v)}
          />
          <TextField
            label={t("content.settings.email.replyToAddress")}
            hint={t("content.settings.email.hints.replyTo")}
            error={s.errors.email_reply_to}
            value={s.form.email_reply_to ?? ""}
            onChange={(v) => s.set("email_reply_to", v)}
          />
          <TextField
            label={t("content.settings.email.subjectPrefix")}
            hint={t("content.settings.email.hints.subjectPrefix")}
            error={s.errors.email_subject_prefix}
            value={prefix}
            onChange={(v) => s.set("email_subject_prefix", v)}
          />
        </FieldGrid>
      </SettingsCard>

      <SettingsCard
        title={t("content.settings.livePreview.title")}
        description={t("content.settings.email.livePreviewDescription")}
      >
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

      <SettingsCard
        title={t("content.settings.email.deliveryTitle")}
        description={t("content.settings.email.deliveryDescription")}
      >
        <SwitchField
          label={t("content.settings.email.bookingEmailsToggle")}
          hint={t("content.settings.email.hints.bookingEmails")}
          checked={s.bool("email_booking_enabled")}
          onChange={(v) => s.setBool("email_booking_enabled", v)}
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
