import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Layout,
  Palette,
  Search,
  Mail,
  MapPin,
  Share2,
  Eye,
  PanelBottom,
  ShieldCheck,
  Cpu,
  ExternalLink,
  ChevronLeft,
  AlertCircle,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GeneralSection } from "@/components/admin/settings/GeneralSection";
import { SectionsVisibilitySettings } from "@/components/admin/settings/SectionsVisibilitySettings";
import { HomepageContentSection } from "@/components/admin/settings/HomepageContentSection";
import { BrandSection } from "@/components/admin/settings/BrandSection";
import { CommunicationSection } from "@/components/admin/settings/CommunicationSection";
import { BranchesSettingsSection } from "@/components/admin/settings/BranchesSettingsSection";
import { SeoSection } from "@/components/admin/settings/SeoSection";
import { SocialSection } from "@/components/admin/settings/SocialSection";
import { FooterSettingsSection } from "@/components/admin/settings/FooterSettingsSection";
import { SecuritySection } from "@/components/admin/settings/SecuritySection";
import { SystemSettingsSection } from "@/components/admin/settings/SystemSettingsSection";
import {
  SettingsDirtyProvider,
  useSettingsDirty,
} from "@/components/admin/settings/SettingsDirtyContext";
import { siteSectionsQuery, branchesQuery } from "@/lib/queries";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { PermissionGate } from "@/components/admin/kit";

export type SettingsTabId =
  | "general"
  | "homepage"
  | "brand"
  | "seo"
  | "communication"
  | "branches"
  | "social"
  | "navigation"
  | "visibility"
  | "footer"
  | "security"
  | "system";

interface SettingsSearch {
  tab?: SettingsTabId;
}

export const Route = createFileRoute("/admin/settings")({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>): SettingsSearch => {
    const tab = raw.tab as SettingsTabId | undefined;
    const validTabs: SettingsTabId[] = [
      "general",
      "homepage",
      "brand",
      "seo",
      "communication",
      "branches",
      "social",
      "navigation",
      "visibility",
      "footer",
      "security",
      "system",
    ];
    return {
      tab: tab && validTabs.includes(tab) ? tab : "general",
    };
  },
  head: () => ({
    meta: [{ title: adminDocTitle("settings") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <SettingsDirtyProvider>
      <SettingsPage />
    </SettingsDirtyProvider>
  ),
});

interface NavCategory {
  id: SettingsTabId;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  badge?: string;
  badgeTone?: "emerald" | "default" | "primary";
}

interface NavGroup {
  id: string;
  title: string;
  items: NavCategory[];
}

function SettingsPage() {
  const search = useSearch({ from: "/admin/settings" });
  const navigate = useNavigate();
  const { isDirty, setIsDirty, lastSavedAt } = useSettingsDirty();

  const [pendingTab, setPendingTab] = useState<SettingsTabId | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // Normalize visibility alias to navigation
  const rawTab = search.tab || "general";
  const activeTab: SettingsTabId = rawTab === "visibility" ? "navigation" : rawTab;

  const { data: siteSections = [] } = useQuery(siteSectionsQuery("home"));
  const visibleSectionsCount = siteSections.filter((s) => s.enabled).length;
  const totalSectionsCount = siteSections.length;

  const { data: branches = [] } = useQuery(branchesQuery());
  const activeBranchesCount = branches.filter((b) => b.is_active).length;

  function performTabSwitch(target: SettingsTabId) {
    setIsDirty(false);
    navigate({
      to: "/admin/settings",
      search: { tab: target },
      replace: true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCategoryClick(tabId: SettingsTabId) {
    if (tabId === activeTab) return;
    if (isDirty) {
      setPendingTab(tabId);
      setShowUnsavedDialog(true);
      return;
    }
    performTabSwitch(tabId);
  }

  // Four Logical Groups aligned with product requirements
  const navGroups = useMemo<NavGroup[]>(
    () => [
      {
        id: "website",
        title: "الموقع العام (Website)",
        items: [
          {
            id: "general",
            label: "الهوية والمعلومات الأساسية",
            sublabel: "اسم الوكالة، الشعار، المقر، وأوقات العمل",
            icon: Building2,
          },
          {
            id: "homepage",
            label: "الصفحة الرئيسية والمحتوى",
            sublabel: "واجهة البداية، النبذة، الأرقام والإحصائيات",
            icon: Layout,
          },
          {
            id: "brand",
            label: "المظهر والهوية المرئية",
            sublabel: "الألوان المعتمدة ومعاينة الطابع البصري",
            icon: Palette,
          },
          {
            id: "seo",
            label: "محركات البحث (SEO)",
            sublabel: "العنوان، الوصف، الفهرسة وصور المشاركة",
            icon: Search,
          },
        ],
      },
      {
        id: "business",
        title: "بيانات الأعمال والاتصال (Business)",
        items: [
          {
            id: "communication",
            label: "التواصل والإشعارات",
            sublabel: "الهواتف، البريد، واتساب وقنوات الحجز",
            icon: Mail,
          },
          {
            id: "branches",
            label: "إدارة الفروع والمقرات",
            sublabel: "بيانات الفروع، المواقع الجغرافية والفرع الرئيسي",
            icon: MapPin,
            badge: `${activeBranchesCount} نشط`,
            badgeTone: "emerald",
          },
          {
            id: "social",
            label: "شبكات التواصل الاجتماعي",
            sublabel: "روابط حسابات فيسبوك، إنستغرام وتيك توك",
            icon: Share2,
          },
        ],
      },
      {
        id: "content",
        title: "تنظيم المحتوى والتذييل (Content)",
        items: [
          {
            id: "navigation",
            label: "أقسام الموقع والتنقل",
            sublabel: "التحكم في ظهور وترتيب أقسام الرئيسية",
            icon: Eye,
            badge:
              totalSectionsCount > 0 ? `${visibleSectionsCount}/${totalSectionsCount}` : undefined,
            badgeTone: "emerald",
          },
          {
            id: "footer",
            label: "تذييل الموقع والحقوق",
            sublabel: "محتوى التذييل، المزامنة، واعتماد SADA",
            icon: PanelBottom,
          },
        ],
      },
      {
        id: "system",
        title: "النظام والأمان (System)",
        items: [
          {
            id: "security",
            label: "الأمان وصلاحيات الوصول",
            sublabel: "الجلسة النشطة، كلمة المرور وفريق الإدارة",
            icon: ShieldCheck,
          },
          {
            id: "system",
            label: "النظام والبيئة التشغيلية",
            sublabel: "فحص استجابة قاعدة البيانات وتفريغ الذاكرة",
            icon: Cpu,
          },
        ],
      },
    ],
    [visibleSectionsCount, totalSectionsCount, activeBranchesCount],
  );

  // Flattened items for mobile carousel
  const allNavItems = useMemo(() => navGroups.flatMap((group) => group.items), [navGroups]);

  // Formatted last saved time string
  const lastSavedText = useMemo(() => {
    if (!lastSavedAt) return null;
    try {
      return lastSavedAt.toLocaleTimeString("ar-TN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return null;
    }
  }, [lastSavedAt]);

  return (
    <PermissionGate permission="settings.view" asPage pageTitle="إعدادات الموقع">
      <div className="mx-auto max-w-7xl pb-16">
        {/* ================================================================
            1. TOP HEADER & SYSTEM STATUS CONTROL CENTER
            ================================================================ */}
        <header className="mb-7 flex flex-col gap-4 border-b border-border-subtle pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-h4 font-bold tracking-tight text-foreground">إعدادات الموقع</h1>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-caption font-bold text-primary">
                Control Center
              </span>
            </div>
            <p className="mt-1 text-small text-muted-foreground">
              تحكم مركزي في هوية الموقع، المحتوى، التواصل، والخيارات التشغيلية.
            </p>
          </div>

          {/* Real Status Bar + Action Center */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Website Status Badge */}
            <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-sunken/60 px-3 py-1.5 text-caption font-medium text-foreground shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>الموقع: متصل (Online)</span>
            </div>

            {/* Dirty or Last Saved Timestamp indicator */}
            {isDirty ? (
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-caption font-semibold text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>لديك تغييرات غير محفوظة</span>
              </div>
            ) : lastSavedText ? (
              <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface-sunken/40 px-3 py-1.5 text-caption text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                <span>آخر حفظ: {lastSavedText}</span>
              </div>
            ) : null}

            {/* Portal slot for active section's SaveBar */}
            <div id="settings-save-slot" className="contents" />

            {/* View Live Public Website */}
            <Button
              asChild
              variant="outline"
              size="sm"
            >
              <a href="/" target="_blank" rel="noopener noreferrer">
                <span>عرض الموقع</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </header>

        {/* ================================================================
            2. MOBILE RESPONSIVE NAVIGATION (HORIZONTAL CATEGORY PILLS)
            ================================================================ */}
        <nav
          aria-label="أقسام الإعدادات"
          className="mb-6 lg:hidden overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none flex gap-2"
        >
          {allNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleCategoryClick(item.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-small font-semibold transition-all shrink-0 border",
                  active
                    ? "border-primary/50 bg-primary text-primary-foreground shadow-sm"
                    : "border-border-subtle bg-card text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ================================================================
            3. TWO-COLUMN DESKTOP CONTROL CENTER
            Visual Left: Main Content Workspace
            Visual Right: Categorized Navigation
            ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Workspace (Visual Left) */}
          <main className="lg:col-span-8 xl:col-span-9 min-w-0 order-2 lg:order-1">
            {activeTab === "general" && <GeneralSection />}
            {activeTab === "homepage" && <HomepageContentSection />}
            {activeTab === "brand" && <BrandSection />}
            {activeTab === "seo" && <SeoSection />}
            {activeTab === "communication" && <CommunicationSection />}
            {activeTab === "branches" && <BranchesSettingsSection />}
            {activeTab === "social" && <SocialSection />}
            {activeTab === "navigation" && (
              <SectionsVisibilitySettings
                onNavigateToTab={(tab) => handleCategoryClick(tab as SettingsTabId)}
              />
            )}
            {activeTab === "footer" && <FooterSettingsSection />}
            {activeTab === "security" && <SecuritySection />}
            {activeTab === "system" && <SystemSettingsSection />}
          </main>

          {/* Categorized Navigation Sidebar (Visual Right) */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-6 space-y-4 order-1 lg:order-2">
            <div className="rounded-card border border-border-subtle bg-card p-2.5 shadow-sm space-y-4">
              {navGroups.map((group) => (
                <div key={group.id} className="space-y-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    {group.title}
                  </div>

                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleCategoryClick(item.id)}
                          className={cn(
                            "group flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-start transition-all cursor-pointer",
                            active
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "text-foreground hover:bg-accent/60 hover:text-foreground",
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className={cn(
                                "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors",
                                active
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-small font-bold truncate block">
                                  {item.label}
                                </span>
                                {item.badge && (
                                  <span
                                    className={cn(
                                      "rounded-full px-1.5 py-0.5 text-[10px] font-mono shrink-0",
                                      active
                                        ? "bg-primary-foreground/25 text-primary-foreground"
                                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold",
                                    )}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <span
                                className={cn(
                                  "text-[11px] truncate block leading-tight mt-0.5",
                                  active ? "text-primary-foreground/80" : "text-muted-foreground",
                                )}
                              >
                                {item.sublabel}
                              </span>
                            </div>
                          </div>

                          <ChevronLeft
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform rtl:rotate-0 ltr:rotate-180",
                              active
                                ? "text-primary-foreground"
                                : "text-muted-foreground/50 group-hover:text-foreground",
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Guidance Callout */}
            <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-3.5 text-caption text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                <span>مركز إدارة الموقع:</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                كل خيار في هذا المركز متصل مباشرة بقاعدة البيانات ويؤثر فوراً على الموقع العام. يتم
                حفظ التعديلات بشكل صريح لمنع التعديلات العرضية.
              </p>
            </div>
          </aside>
        </div>

        {/* ================================================================
            4. UNSAVED CHANGES CONFIRMATION MODAL
            ================================================================ */}
        <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-h5 font-bold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <span>تغييرات غير محفوظة</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-small text-muted-foreground leading-relaxed pt-2">
                لديك تعديلات غير محفوظة في القسم الحالي. إذا قمت بالانتقال إلى قسم آخر الآن، فسيتم
                إلغاء هذه التعديلات وفقدان ما قمت بكتابته.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
              <AlertDialogCancel
                onClick={() => {
                  setShowUnsavedDialog(false);
                  setPendingTab(null);
                }}
              >
                إلغاء والبقاء هنا
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  setShowUnsavedDialog(false);
                  if (pendingTab) {
                    performTabSwitch(pendingTab);
                    setPendingTab(null);
                  }
                }}
              >
                متابعة بدون حفظ
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionGate>
  );
}
