import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Phone,
  MessageSquare,
  Bell,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaveBar, FieldGrid, SettingsCard, SettingsSection, SwitchField, TextField } from "./parts";
import { useContactSettings, type ContactFieldSpec } from "./useContactSettings";
import {
  combine,
  email as emailValidator,
  emailList,
  maxLen,
  required,
  url as urlValidator,
  useSiteSettings,
  type SettingSpec,
} from "./useSiteSettings";

const CHANNELS: ContactFieldSpec[] = [
  {
    key: "phone",
    label: "الهاتف القار الرئيسي (Landline)",
    icon: "phone",
    sort_order: 2,
    placeholder: "رقم الهاتف القار الرسمي",
    hint: "يظهر في ترويسة وتذييل الموقع العام للمسافرين.",
  },
  {
    key: "mobile",
    label: "رقم الجوال المعتمد (Mobile)",
    icon: "smartphone",
    sort_order: 3,
    placeholder: "رقم الجوال المعتمد",
    hint: "للاتصال السريع والمباشر بفريق العمل.",
  },
  {
    key: "email",
    label: "البريد الإلكتروني العام (Public Contact Email)",
    icon: "mail",
    sort_order: 4,
    placeholder: "contact@janatsahara.tn",
    hint: "البريد المنشور رسمياً في الموقع لتواصل العملاء.",
    validate: emailValidator,
  },
  {
    key: "whatsapp",
    label: "رابط واتساب المباشر (Direct WhatsApp Link)",
    icon: "message-circle",
    sort_order: 8,
    placeholder: "https://wa.me/216XXXXXXXX",
    hint: "زر واتساب العائم والمباشر على الموقع العام.",
    validate: urlValidator,
  },
  {
    key: "emergency",
    label: "رقم الطوارئ والخدمة المستمرة 24/7 (Emergency)",
    icon: "phone-call",
    sort_order: 9,
    placeholder: "+216 98 000 000",
    hint: "رقم متاح للحالات العاجلة والمسافرين في البقاع المقدسة أو المطارات.",
  },
];

const EMAIL_SPECS: SettingSpec[] = [
  {
    key: "email_owner_recipient",
    label: "بريد الاستلام الرئيسي",
    validate: combine(required, emailValidator),
  },
  { key: "email_cc_recipient", label: "نسخة إضافية (CC)", validate: emailList },
  { key: "email_from_name", label: "اسم المرسل", validate: maxLen(50) },
  { key: "email_reply_to", label: "عنوان الرد", validate: emailValidator },
  { key: "email_subject_prefix", label: "بادئة العنوان", validate: maxLen(20) },
  { key: "email_booking_enabled", label: "تفعيل إشعارات الحجز" },
  { key: "notify_new_message", label: "تنبيهات رسائل التواصل" },
];

export function CommunicationSection() {
  const contact = useContactSettings(CHANNELS);
  const emailSettings = useSiteSettings("email", EMAIL_SPECS);

  if (contact.loading || emailSettings.loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  const isDirty = contact.dirty || emailSettings.dirty;
  const isSaving = contact.saving || emailSettings.saving;
  const hasErrors = contact.hasErrors || emailSettings.hasErrors;

  async function handleSaveAll() {
    try {
      if (contact.dirty) await contact.saveNow();
      if (emailSettings.dirty) await emailSettings.saveNow();
      toast.success("تم حفظ إعدادات التواصل والإشعارات بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء حفظ بعض إعدادات التواصل");
    }
  }

  function handleDiscardAll() {
    if (contact.dirty) contact.discard();
    if (emailSettings.dirty) emailSettings.discard();
  }

  return (
    <SettingsSection
      title="التواصل والإشعارات (Contact & Communication)"
      description="إدارة أرقام وقنوات التواصل المنشورة في الموقع، وضبط توجيه تنبيهات الحجوزات والرسائل الواردة."
    >
      {/* 1. Direct Public Contact Channels */}
      <SettingsCard
        title="قنوات الاتصال المباشرة (Direct Channels)"
        description="تظهر هذه القنوات في ترويسة الموقع، التذييل، صفحة اتصل بنا، وأزرار التواصل السريع للمسافرين."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {CHANNELS.map((c) => {
            const rawVal = (contact.form[c.key] ?? "").trim();
            let actionHref: string | null = null;
            let actionLabel: string | null = null;

            if (rawVal) {
              if (c.key === "whatsapp") {
                actionHref = rawVal.startsWith("http")
                  ? rawVal
                  : `https://wa.me/${rawVal.replace(/[^\d]/g, "")}`;
                actionLabel = "فتح واتساب";
              } else if (c.key === "email") {
                actionHref = `mailto:${rawVal}`;
                actionLabel = "إرسال بريد";
              } else if (c.key === "phone" || c.key === "mobile" || c.key === "emergency") {
                actionHref = `tel:${rawVal.replace(/[^\d+]/g, "")}`;
                actionLabel = "اتصال";
              }
            }

            return (
              <div key={c.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-small font-medium text-foreground">{c.label}</span>
                  {actionHref && (
                    <Button
                      asChild
                      variant="ghost"
                      size="xs"
                      className="text-primary hover:text-primary"
                    >
                      <a href={actionHref} target="_blank" rel="noopener noreferrer">
                        <span>{actionLabel}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
                <Input
                  dir="ltr"
                  placeholder={c.placeholder}
                  value={contact.form[c.key] ?? ""}
                  onChange={(e) => contact.set(c.key, e.target.value)}
                  className="font-mono text-small"
                />
                {contact.errors[c.key] ? (
                  <p className="text-caption text-destructive">{contact.errors[c.key]}</p>
                ) : c.hint ? (
                  <p className="text-caption leading-relaxed text-muted-foreground">{c.hint}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </SettingsCard>

      {/* 2. Email Routing & Notification Recipients */}
      <SettingsCard
        title="توجيه الإشعارات والبريد الإلكتروني (Notification Routing)"
        description="تحديد العناوين البريدية للوكالة التي تتلقى تنبيهات الحجوزات الجديدة واستفسارات المسافرين."
      >
        <FieldGrid>
          <TextField
            label="بريد استلام تنبيهات الحجوزات (Primary Recipient)"
            hint="يستلم تفاصيل الحجوزات الجديدة المسجلة عبر الموقع فور تأكيدها."
            placeholder="booking@janatsahara.tn"
            error={emailSettings.errors.email_owner_recipient}
            value={emailSettings.form.email_owner_recipient ?? ""}
            onChange={(v) => emailSettings.set("email_owner_recipient", v)}
          />
          <TextField
            label="نسخة إضافية (CC Recipients)"
            hint="عناوين إضافية مفصولة بفواصل لاستلام نسخة، مثل: ops@janatsahara.tn"
            placeholder="management@janatsahara.tn"
            error={emailSettings.errors.email_cc_recipient}
            value={emailSettings.form.email_cc_recipient ?? ""}
            onChange={(v) => emailSettings.set("email_cc_recipient", v)}
          />
          <TextField
            label="اسم المرسل الظاهر (Sender Name)"
            hint="الاسم الذي يظهر للمستلم في صندوق الوارد (افتراضي: Janat Sahara Travel)."
            placeholder="Janat Sahara Travel"
            error={emailSettings.errors.email_from_name}
            value={emailSettings.form.email_from_name ?? ""}
            onChange={(v) => emailSettings.set("email_from_name", v)}
          />
          <TextField
            label="عنوان الرد التلقائي (Reply-To)"
            hint="العنوان الذي ستصله ردود المسافرين عند الضغط على زر «رد» في رسائلهم."
            placeholder="support@janatsahara.tn"
            error={emailSettings.errors.email_reply_to}
            value={emailSettings.form.email_reply_to ?? ""}
            onChange={(v) => emailSettings.set("email_reply_to", v)}
          />
          <TextField
            label="بادئة عنوان الرسائل (Subject Prefix)"
            hint="بادئة تضاف تلقائياً في بداية عنوان الرسائل، مثل: [حجز جديد]."
            placeholder="[Janat Sahara]"
            error={emailSettings.errors.email_subject_prefix}
            value={emailSettings.form.email_subject_prefix ?? ""}
            onChange={(v) => emailSettings.set("email_subject_prefix", v)}
          />
        </FieldGrid>
      </SettingsCard>

      {/* 3. Automated Notification Switches */}
      <SettingsCard
        title="تفعيل التنبيهات الآلية (Alert Triggers)"
        description="التحكم في تشغيل أو تعطيل إرسال التنبيهات عبر البريد عند حدوث عمليات حقيقية في النظام."
      >
        <div className="space-y-4">
          <SwitchField
            label="إرسال إشعارات الحجوزات الجديدة (New Booking Notifications)"
            hint="عند التفعيل، يتلقى بريد الاستلام المعتمد رسالة فورية بكافة تفاصيل المسافرين والباقة المختارة عند إرسال أي حجز."
            checked={emailSettings.bool("email_booking_enabled")}
            onChange={(v) => emailSettings.setBool("email_booking_enabled", v)}
          />
          <div className="border-t border-border-subtle pt-4">
            <SwitchField
              label="تنبيهات رسائل اتصل بنا الجديدة (Contact Message Alerts)"
              hint="إشعار الفريق عند قيام زائر بإرسال رسالة أو استفسار جديد عبر صفحة اتصل بنا."
              checked={emailSettings.bool("notify_new_message")}
              onChange={(v) => emailSettings.setBool("notify_new_message", v)}
            />
          </div>
        </div>
      </SettingsCard>

      <SaveBar
        dirty={isDirty}
        saving={isSaving}
        hasErrors={hasErrors}
        lastSaved={contact.lastSaved || emailSettings.lastSaved}
        onSave={handleSaveAll}
        onDiscard={handleDiscardAll}
      />
    </SettingsSection>
  );
}
