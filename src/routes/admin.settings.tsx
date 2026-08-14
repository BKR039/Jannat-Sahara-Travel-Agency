import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

export const Route = createFileRoute("/admin/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Settings — Janat Sahara Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
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

const GROUPS: Group[] = [
  {
    group: "Agency",
    caption: "Who you are",
    items: [
      {
        id: "general",
        label: "General",
        summary: "Your agency information",
        detail: "Name, address and working hours",
        icon: Building2,
        component: GeneralSection,
      },
      {
        id: "brand",
        label: "Brand",
        summary: "Your visual identity",
        detail: "Logo, tagline and colours",
        icon: Palette,
        component: BrandSection,
      },
    ],
  },
  {
    group: "Website",
    caption: "What visitors see",
    items: [
      {
        id: "homepage",
        label: "Homepage",
        summary: "What visitors see first",
        detail: "Hero, about and call to action",
        icon: Layout,
        component: ContentSection,
      },
      {
        id: "statistics",
        label: "Statistics",
        summary: "Your achievements",
        detail: "Counters shown on the homepage",
        icon: BarChart3,
        component: StatsSection,
      },
      {
        id: "seo",
        label: "Search appearance",
        summary: "How you appear on Google",
        detail: "Titles, description and sharing image",
        icon: Search,
        component: SeoSection,
      },
    ],
  },
  {
    group: "Communication",
    caption: "How travellers reach you",
    items: [
      {
        id: "contact",
        label: "Contact",
        summary: "Phone, email and WhatsApp",
        detail: "Shown across the website",
        icon: Contact,
        component: ContactSection,
      },
      {
        id: "branches",
        label: "Branches",
        summary: "Offices and locations",
        detail: "Displayed on the contact map",
        icon: MapPin,
        component: BranchesSection,
      },
      {
        id: "social",
        label: "Social media",
        summary: "Instagram, Facebook and more",
        detail: "Channels linked in the footer",
        icon: Share2,
        component: SocialSection,
      },
      {
        id: "email",
        label: "Email",
        summary: "Booking notifications",
        detail: "Where new requests are delivered",
        icon: Mail,
        component: EmailSection,
      },
    ],
  },
  {
    group: "System",
    caption: "Access and alerts",
    items: [
      {
        id: "notifications",
        label: "Notifications",
        summary: "How you receive alerts",
        detail: "Dashboard and email alerts",
        icon: Bell,
        component: NotificationsSection,
      },
      {
        id: "team",
        label: "Team",
        summary: "Manage team access",
        detail: "Admins and their roles",
        icon: Users,
        component: TeamSection,
      },
      {
        id: "security",
        label: "Security",
        summary: "Account protection",
        detail: "Access policies and sessions",
        icon: ShieldCheck,
        component: SecuritySection,
      },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

function SettingsPage() {
  const [open, setOpen] = useState<SectionId | null>(null);
  const entry = open ? ALL.find((i) => i.id === open) ?? null : null;

  useEffect(() => {
    if (entry) window.scrollTo({ top: 0 });
  }, [entry]);

  if (entry) return <FocusedSetting entry={entry} onBack={() => setOpen(null)} />;

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <header className="pb-8">
        <h1 className="text-h4 font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1.5 text-small text-muted-foreground">
          Manage your agency, website and communication.
        </p>
      </header>

      <div className="space-y-9">
        {GROUPS.map((group) => (
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
        "group flex w-full items-start gap-3.5 rounded-2xl border border-border-subtle bg-card p-4 text-start",
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
        Settings
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
