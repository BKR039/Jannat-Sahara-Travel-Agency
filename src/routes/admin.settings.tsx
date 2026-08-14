import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Building2,
  Contact,
  Layout,
  Share2,
  BarChart3,
  Search,
  Mail,
  Bell,
  ShieldCheck,
  Palette,
  MapPin,
  Users,
  ChevronRight,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/common/Logo";
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
  | "seo"
  | "email"
  | "notifications"
  | "security"
  | "team";

interface NavGroup {
  group: string;
  items: { id: SectionId; label: string; icon: LucideIcon; hint: string }[];
}

const NAV: NavGroup[] = [
  {
    group: "Agency",
    items: [
      { id: "general", label: "General", icon: Building2, hint: "Name, address, opening hours" },
      { id: "brand", label: "Brand", icon: Palette, hint: "Logo, colours, tagline" },
    ],
  },
  {
    group: "Website",
    items: [
      { id: "homepage", label: "Homepage", icon: Layout, hint: "Hero, about and CTA blocks" },
      { id: "statistics", label: "Statistics", icon: BarChart3, hint: "Achievement counters" },
      { id: "seo", label: "SEO", icon: Search, hint: "Search and social appearance" },
    ],
  },
  {
    group: "Communication",
    items: [
      { id: "contact", label: "Contact", icon: Contact, hint: "Phone, email, WhatsApp" },
      { id: "branches", label: "Branches", icon: MapPin, hint: "Offices shown on the map" },
      { id: "social", label: "Social media", icon: Share2, hint: "Channels and links" },
      { id: "email", label: "Email", icon: Mail, hint: "Booking notification delivery" },
    ],
  },
  {
    group: "System",
    items: [
      { id: "notifications", label: "Notifications", icon: Bell, hint: "Dashboard alerts" },
      { id: "team", label: "Team", icon: Users, hint: "Admins and roles" },
      { id: "security", label: "Security", icon: ShieldCheck, hint: "Access policies" },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);

const SECTIONS: Record<SectionId, () => React.JSX.Element> = {
  general: GeneralSection,
  brand: BrandSection,
  homepage: ContentSection,
  statistics: StatsSection,
  contact: ContactSection,
  branches: BranchesSection,
  social: SocialSection,
  seo: SeoSection,
  email: EmailSection,
  notifications: NotificationsSection,
  security: SecuritySection,
  team: TeamSection,
};

function SettingsPage() {
  const [active, setActive] = useState<SectionId>("general");
  const current = ALL_ITEMS.find((i) => i.id === active)!;
  const Section = SECTIONS[active];
  const currentGroup = NAV.find((g) => g.items.some((i) => i.id === active))!.group;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Editorial masthead — quiet, branded, no oversized heading */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border-subtle pb-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-caption font-medium text-primary">
            <SettingsIcon className="h-3.5 w-3.5" />
            Agency settings
          </p>
          <h1 className="mt-2 text-h3 tracking-tight text-foreground">
            Everything that shapes your website
          </h1>
          <p className="mt-1.5 max-w-xl text-small text-muted-foreground">
            Update your agency details, website content and contact channels. Changes are saved as
            you work.
          </p>
        </div>
        <div className="hidden shrink-0 sm:block">
          <Logo />
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* Mobile / tablet: horizontal section selector */}
        <div className="-mx-4 overflow-x-auto px-4 pb-1 lg:hidden">
          <div className="flex w-max gap-2">
            {ALL_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-small transition-colors",
                    isActive
                      ? "border-primary/30 bg-primary/10 font-semibold text-primary"
                      : "border-border-subtle bg-card text-foreground/70",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop: grouped sidebar */}
        <nav
          aria-label="Settings categories"
          className="hidden lg:sticky lg:top-20 lg:block lg:self-start"
        >
          {NAV.map((group) => (
            <div key={group.group} className="mb-6 last:mb-0">
              <p className="mb-2 px-3 text-caption font-semibold tracking-wide text-muted-foreground">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === active;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActive(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-small transition-colors",
                        isActive
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-foreground/70 hover:bg-accent/60 hover:text-foreground",
                      )}
                    >
                      {isActive && (
                        <span className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-primary" />
                      )}
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="min-w-0">
          <p className="mb-4 flex items-center gap-1.5 text-caption text-muted-foreground">
            {currentGroup}
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-foreground">{current.label}</span>
          </p>
          <Section />
        </div>
      </div>
    </div>
  );
}
