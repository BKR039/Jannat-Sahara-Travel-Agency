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
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
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
  | "security";

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
      { id: "notifications", label: "Notifications", icon: Bell, hint: "Dashboard alerts" },
    ],
  },
  {
    group: "System",
    items: [
      { id: "security", label: "Security", icon: ShieldCheck, hint: "Team access and policies" },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);

const SECTIONS: Record<SectionId, () => JSX.Element> = {
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
};

function SettingsPage() {
  const [active, setActive] = useState<SectionId>("general");
  const current = ALL_ITEMS.find((i) => i.id === active)!;
  const Section = SECTIONS[active];

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your agency, website content and communication channels. Every change auto-saves."
      />

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Settings categories" className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border-subtle bg-card p-2 shadow-sm">
            {NAV.map((group) => (
              <div key={group.group} className="mb-2 last:mb-0">
                <p className="px-3 pb-1 pt-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.group}
                </p>
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
                        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-small transition-colors",
                        isActive
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-foreground/75 hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-opacity",
                          isActive ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          <p className="mb-4 flex items-center gap-1.5 text-caption text-muted-foreground lg:hidden">
            Settings <ChevronRight className="h-3 w-3" /> {current.label}
          </p>
          <Section />
        </div>
      </div>
    </>
  );
}
