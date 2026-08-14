import { createFileRoute } from "@tanstack/react-router";
import i18n from "@/lib/i18n";
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
import { useServerFn } from "@tanstack/react-start";
import { submitContactMessage } from "@/lib/public.functions";
import { contactInfoQuery } from "@/lib/queries";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: i18n.t("seo.contact.title") },
      { name: "description", content: i18n.t("seo.contact.description") },
      { property: "og:title", content: i18n.t("seo.contact.title") },
      { property: "og:description", content: i18n.t("seo.contact.ogDescription") },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const { data: info } = useQuery(contactInfoQuery());
  const [loading, setLoading] = useState(false);
  const sendMessage = useServerFn(submitContactMessage);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      await sendMessage({
        data: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          subject: String(form.get("subject") ?? ""),
          message: String(form.get("message") ?? ""),
        },
      });
      toast.success(t("contact.success"));
      formEl.reset();
    } catch (err) {
      console.error(err);
      toast.error(t("contact.error"));
    } finally {
      setLoading(false);
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
                className="flex items-start gap-4 rounded-lg border border-border-subtle bg-card p-5 ds-reveal"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  <DynamicIcon name={c.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                    {L(c, "label", "base")}
                  </div>
                  <div
                    className="mt-1 break-words font-semibold text-foreground"
                    dir={["phone", "mobile", "email"].includes(c.key) ? "ltr" : undefined}
                  >
                    {L(c, "value", "base")}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border-subtle bg-card p-6 shadow-sm">
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
