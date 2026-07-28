import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { supabase } from "@/integrations/supabase/client";
import { contactInfoQuery } from "@/lib/queries";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "اتصل بنا — جنة الصحراء" },
      { name: "description", content: "تواصل مع فريق جنة الصحراء للأسفار عبر الهاتف أو البريد أو تعبئة النموذج." },
      { property: "og:title", content: "اتصل بنا — جنة الصحراء" },
      { property: "og:description", content: "نحن هنا لخدمتكم على مدار الساعة." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useTranslation();
  const { data: info } = useQuery(contactInfoQuery());
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      subject: String(form.get("subject") ?? ""),
      message: String(form.get("message") ?? ""),
    };
    const { error } = await supabase.from("contact_messages").insert(payload);
    setLoading(false);
    if (error) {
      toast.error(t("contact.error"));
    } else {
      toast.success(t("contact.success"));
      (e.target as HTMLFormElement).reset();
    }
  };

  const details = info?.filter((c) => ["address", "phone", "mobile", "email", "hours"].includes(c.key)) ?? [];

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <SectionHeading eyebrow="✉" title={t("contact.title")} description={t("contact.subtitle")} />

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            {details.map((c, i) => (
              <div
                key={c.id}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  <DynamicIcon name={c.icon} className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</div>
                  <div className="mt-1 font-semibold text-foreground" dir={["phone", "mobile", "email"].includes(c.key) ? "ltr" : undefined}>
                    {c.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="name" required placeholder={t("contact.name")} />
              <Input name="email" type="email" required placeholder={t("contact.email")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="phone" placeholder={t("contact.phone")} />
              <Input name="subject" placeholder={t("contact.subject")} />
            </div>
            <Textarea name="message" required rows={6} placeholder={t("contact.message")} />
            <Button type="submit" size="lg" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? t("common.loading") : t("contact.send")}
            </Button>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
