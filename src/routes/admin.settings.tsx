import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  ChevronRight,
  Contact,
  Layout,
  Mail,
  MapPin,
  Palette,
  Search,
  Share2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GeneralSection } from "@/components/admin/settings/GeneralSection";
import { BrandSection } from "@/components/admin/settings/BrandSection";
import { ContentSection } from "@/components/admin/settings/ContentSection";
import { StatsSection } from "@/components/admin/settings/StatsSection";
import { ContactSection } from "@/components/admin/settings/ContactSection";
import { BranchesSection } from "@/components/admin/settings/BranchesSection";
import { SocialSection } from "@/components/admin/settings/SocialSection";
import { SeoSection } from "@/components/admin/settings/SeoSection";
import { EmailSection } from "@/components/admin/settings/EmailSection";
import { NotificationsSection } from "@/components/admin/settings/NotificationsSection";
import { SecuritySection } from "@/components/admin/settings/SecuritySection";
import { TeamSection } from "@/components/admin/settings/TeamSection";
import { adminDocTitle } from "@/lib/admin/doc-title";

export const Route = createFileRoute("/admin/settings")({
  ssr: false,
  head: () => ({
    meta: [{ title: adminDocTitle("settings") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SettingsPage,
});

type SectionId =
  | "general"
  | "brand"
  | "homepage"
  | "statistics"
  | "contact"
  | "branches"
  | "social"
  | "email"
  | "seo"
  | "notifications"
  | "security"
  | "team";

interface Entry {
  id: SectionId;
  label: string;
  summary: string;
  detail: string;
  icon: LucideIcon;
  component: () => React.JSX.Element;
}

interface Group {
  group: string;
  caption: string;
  items: Entry[];
}

function buildGroups(t: (key: string) => string): Group[] {
  return [
    {
      group: t("content.settings.groups.agency.title"),
      caption: t("content.settings.groups.agency.caption"),
      items: [
        {
          id: "general",
          label: t("content.settings.nav.general.label"),
          summary: t("content.settings.nav.general.summary"),
          detail: t("content.settings.nav.general.detail"),
          icon: Building2,
          component: GeneralSection,
        },
        {
          id: "brand",
          label: t("content.settings.nav.brand.label"),
          summary: t("content.settings.nav.brand.summary"),
          detail: t("content.settings.nav.brand.detail"),
          icon: Palette,
          component: BrandSection,
        },
      ],
    },
    {
      group: t("content.settings.groups.website.title"),
      caption: t("content.settings.groups.website.caption"),
      items: [
        {
          id: "homepage",
          label: t("content.settings.nav.homepage.label"),
          summary: t("content.settings.nav.homepage.summary"),
          detail: t("content.settings.nav.homepage.detail"),
          icon: Layout,
          component: ContentSection,
        },
        {
          id: "statistics",
          label: t("content.settings.nav.statistics.label"),
          summary: t("content.settings.nav.statistics.summary"),
          detail: t("content.settings.nav.statistics.detail"),
          icon: BarChart3,
          component: StatsSection,
        },
        {
          id: "seo",
          label: t("content.settings.nav.seo.label"),
          summary: t("content.settings.nav.seo.summary"),
          detail: t("content.settings.nav.seo.detail"),
          icon: Search,
          component: SeoSection,
        },
      ],
    },
    {
      group: t("content.settings.groups.communication.title"),
      caption: t("content.settings.groups.communication.caption"),
      items: [
        {
          id: "contact",
          label: t("content.settings.nav.contact.label"),
          summary: t("content.settings.nav.contact.summary"),
          detail: t("content.settings.nav.contact.detail"),
          icon: Contact,
          component: ContactSection,
        },
        {
          id: "branches",
          label: t("content.settings.nav.branches.label"),
          summary: t("content.settings.nav.branches.summary"),
          detail: t("content.settings.nav.branches.detail"),
          icon: MapPin,
          component: BranchesSection,
        },
        {
          id: "social",
          label: t("content.settings.nav.social.label"),
          summary: t("content.settings.nav.social.summary"),
          detail: t("content.settings.nav.social.detail"),
          icon: Share2,
          component: SocialSection,
        },
        {
          id: "email",
          label: t("content.settings.nav.email.label"),
          summary: t("content.settings.nav.email.summary"),
          detail: t("content.settings.nav.email.detail"),
          icon: Mail,
          component: EmailSection,
        },
      ],
    },
    {
      group: t("content.settings.groups.system.title"),
      caption: t("content.settings.groups.system.caption"),
      items: [
        {
          id: "notifications",
          label: t("content.settings.nav.notifications.label"),
          summary: t("content.settings.nav.notifications.summary"),
          detail: t("content.settings.nav.notifications.detail"),
          icon: Bell,
          component: NotificationsSection,
        },
        {
          id: "team",
          label: t("content.settings.nav.team.label"),
          summary: t("content.settings.nav.team.summary"),
          detail: t("content.settings.nav.team.detail"),
          icon: Users,
          component: TeamSection,
        },
        {
          id: "security",
          label: t("content.settings.nav.security.label"),
          summary: t("content.settings.nav.security.summary"),
          detail: t("content.settings.nav.security.detail"),
          icon: ShieldCheck,
          component: SecuritySection,
        },
      ],
    },
  ];
}

function SettingsPage() {
  const { t } = useTranslation("admin");
  const groups = useMemo(() => buildGroups(t), [t]);
  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const [open, setOpen] = useState<SectionId | null>(null);
  const entry = open ? (all.find((i) => i.id === open) ?? null) : null;

  useEffect(() => {
    if (entry) window.scrollTo({ top: 0 });
  }, [entry]);

  if (entry) return <FocusedSetting entry={entry} onBack={() => setOpen(null)} />;

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <header className="pb-8">
        <h1 className="text-h4 font-bold tracking-tight text-foreground">
          {t("content.settings.pageTitle")}
        </h1>
        <p className="mt-1.5 text-small text-muted-foreground">
          {t("content.settings.pageDescription")}
        </p>
      </header>

      <div className="space-y-9">
        {groups.map((group) => (
          <section key={group.group}>
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="text-body font-semibold tracking-tight text-foreground">
                {group.group}
              </h2>
              <span className="text-caption text-muted-foreground">{group.caption}</span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {group.items.map((item) => (
                <SettingTile key={item.id} item={item} onOpen={() => setOpen(item.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SettingTile({ item, onOpen }: { item: Entry; onOpen: () => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex w-full items-start gap-3.5 rounded-card border border-border-subtle bg-card p-4 text-start",
        "transition-colors hover:border-primary/40 hover:bg-accent/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-small font-semibold text-foreground">{item.label}</span>
        <span className="mt-0.5 block text-caption leading-relaxed text-muted-foreground">
          {item.summary}
        </span>
        <span className="mt-0.5 block text-caption leading-relaxed text-muted-foreground/70">
          {item.detail}
        </span>
      </span>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
    </button>
  );
}

function FocusedSetting({ entry, onBack }: { entry: Entry; onBack: () => void }) {
  const { t } = useTranslation("admin");
  const Section = entry.component;
  return (
    <div className="mx-auto max-w-3xl pb-16">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5 ltr:inline rtl:hidden" />
        <ArrowRight className="h-3.5 w-3.5 ltr:hidden rtl:inline" />
        {t("content.settings.pageTitle")}
      </button>

      <header className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle pb-5">
        <div className="min-w-0">
          <h1 className="text-h5 font-bold tracking-tight text-foreground">{entry.label}</h1>
          <p className="mt-1 text-small text-muted-foreground">{entry.summary}</p>
        </div>
        <div id="settings-save-slot" className="shrink-0" />
      </header>

      <Section />
    </div>
  );
}
