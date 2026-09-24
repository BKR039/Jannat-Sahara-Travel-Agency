import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Layout,
  LayoutGrid,
  Sparkles,
  MapPin,
  Camera,
  Newspaper,
  Star,
  HelpCircle,
  BarChart3,
  Building2,
  Phone,
  ExternalLink,
  Eye,
  EyeOff,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { siteSectionsQuery, type SiteSection } from "@/lib/queries";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SettingsCard, SettingsSection } from "./parts";

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  hero: Layout,
  services: LayoutGrid,
  features: Sparkles,
  branches: MapPin,
  gallery: Camera,
  blog: Newspaper,
  testimonials: Star,
  faq: HelpCircle,
  stats: BarChart3,
  about: Building2,
  cta: Phone,
};

const SECTION_CMS_LINKS: Record<string, { label: string; href: string }> = {
  services: { label: "إدارة الخدمات", href: "/admin/services" },
  features: { label: "إدارة المزايا", href: "/admin/features" },
  branches: { label: "إدارة الفروع", href: "/admin/branches" },
  gallery: { label: "إدارة الصور", href: "/admin/gallery" },
  blog: { label: "إدارة المقالات", href: "/admin/blog" },
  testimonials: { label: "إدارة التقييمات", href: "/admin/testimonials" },
  faq: { label: "إدارة الأسئلة", href: "/admin/faq" },
};

interface Props {
  onNavigateToTab?: (tabId: string) => void;
}

export function SectionsVisibilitySettings({ onNavigateToTab }: Props) {
  const qc = useQueryClient();
  const { data: sections = [], isLoading, error } = useQuery(siteSectionsQuery("home"));

  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const toggleMutation = useMutation({
    mutationFn: async ({
      sectionKey,
      nextEnabled,
    }: {
      sectionKey: string;
      nextEnabled: boolean;
    }) => {
      setTogglingKey(sectionKey);
      const { error: updErr } = await supabase
        .from("site_sections")
        .update({
          enabled: nextEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq("section_key", sectionKey);

      if (updErr) throw updErr;
      return { sectionKey, nextEnabled };
    },
    onMutate: async ({ sectionKey, nextEnabled }) => {
      await qc.cancelQueries({ queryKey: ["site_sections", "home"] });
      const previous = qc.getQueryData<SiteSection[]>(["site_sections", "home"]);

      qc.setQueryData<SiteSection[]>(["site_sections", "home"], (old) =>
        (old ?? []).map((s) => (s.section_key === sectionKey ? { ...s, enabled: nextEnabled } : s)),
      );

      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["site_sections", "home"], context.previous);
      }
      toast.error(err instanceof Error ? err.message : "فشل تحديث حالة القسم في قاعدة البيانات");
    },
    onSuccess: ({ nextEnabled }) => {
      toast.success(
        nextEnabled
          ? "تم تفعيل عرض القسم في الموقع العام بنجاح"
          : "تم إخفاء القسم من الموقع العام بنجاح",
      );
    },
    onSettled: () => {
      setTogglingKey(null);
      qc.invalidateQueries({ queryKey: ["site_sections"] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
        <h3 className="mt-2 text-body font-semibold text-foreground">تعذر تحميل أقسام الموقع</h3>
        <p className="mt-1 text-caption text-muted-foreground">
          {error instanceof Error ? error.message : "حدث خطأ غير متوقع أثناء قراءة جدول الأقسام"}
        </p>
      </div>
    );
  }

  const visibleCount = sections.filter((s) => s.enabled).length;
  const hiddenCount = sections.filter((s) => !s.enabled).length;

  return (
    <SettingsSection
      title="أقسام الموقع العام (Public Website Visibility)"
      description="التحكم المركزي في إظهار أو إخفاء الأقسام الرئيسية على الصفحة الرئيسية للموقع العام."
    >
      {/* Top Status & Metrics Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border-subtle bg-surface-sunken/40 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-small font-semibold text-foreground">
              {visibleCount} قسم معروض
            </span>
          </div>
          <span className="text-border-subtle">|</span>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
            <span className="text-small font-medium text-muted-foreground">
              {hiddenCount} قسم مخفي
            </span>
          </div>
        </div>

        <Button asChild variant="outline" size="sm">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <span>معاينة الموقع العام مباشرة</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>

      {/* Visibility List Card */}
      <SettingsCard
        title="أقسام الصفحة الرئيسية (Homepage Sections)"
        description="تفعيل أو تعطيل ظهور كل قسم في الصفحة الرئيسية. تعطيل القسم يخفيه فقط دون مسح أي بيانات أو محتوى مخزن."
      >
        <div className="divide-y divide-border-subtle">
          {sections.map((section, idx) => {
            const Icon = SECTION_ICONS[section.section_key] ?? Layout;
            const cmsLink = SECTION_CMS_LINKS[section.section_key];
            const isToggling = togglingKey === section.section_key;

            return (
              <div
                key={section.id}
                className={cn(
                  "flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 transition-colors",
                  idx === 0 && "pt-1",
                  idx === sections.length - 1 && "pb-1",
                  !section.enabled && "opacity-90",
                )}
              >
                {/* Left (or RTL right): Section Info & Status */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors",
                      section.enabled
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-small font-bold text-foreground truncate">
                        {section.label}
                      </h4>
                      <span className="rounded-md border border-border-subtle bg-surface-sunken px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                        {section.section_key}
                      </span>
                    </div>

                    <p className="mt-1 text-caption text-muted-foreground leading-relaxed">
                      {section.description}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {/* Live Visibility Status Badge */}
                      {section.enabled ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[12px] font-medium text-emerald-700 dark:text-emerald-400">
                          <Eye className="h-3.5 w-3.5" />
                          معروض للزوار
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[12px] font-medium text-amber-700 dark:text-amber-400">
                          <EyeOff className="h-3.5 w-3.5" />
                          مخفي حالياً
                        </span>
                      )}

                      <span className="text-[11px] text-muted-foreground">
                        الترتيب: {section.sort_order}
                      </span>
                    </div>

                    {!section.enabled && (
                      <p className="mt-1.5 text-[12px] text-amber-700/80 dark:text-amber-400/80">
                        ملاحظة: هذا القسم مخفي حالياً عن زوار الموقع العام. تفعيله يعيد إظهاره
                        فوراً.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right (or RTL left): Switch & CMS Action Link */}
                <div className="flex items-center justify-end gap-3 self-end md:self-center shrink-0">
                  {cmsLink && (
                    <Button
                      asChild
                      variant="ghost"
                      size="xs"
                      className="text-primary hover:text-primary"
                    >
                      <Link to={cmsLink.href}>
                        <span>{cmsLink.label}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}

                  {!cmsLink &&
                    onNavigateToTab &&
                    ["hero", "about", "stats", "cta"].includes(section.section_key) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigateToTab("homepage")}
                        className="text-caption text-primary hover:text-primary gap-1"
                      >
                        <span>تعديل المحتوى</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Button>
                    )}

                  <div className="flex items-center gap-2 border-s border-border-subtle ps-3">
                    <Switch
                      checked={section.enabled}
                      disabled={isToggling}
                      onCheckedChange={(checked) => {
                        toggleMutation.mutate({
                          sectionKey: section.section_key,
                          nextEnabled: checked,
                        });
                      }}
                      aria-label={`تفعيل أو إخفاء قسم ${section.label}`}
                    />
                    <span className="text-caption font-medium text-foreground w-12 text-center">
                      {section.enabled ? "ظاهر" : "مخفي"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}
