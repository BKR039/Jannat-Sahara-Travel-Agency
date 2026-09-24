import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Layout,
  Building2,
  Phone,
  BarChart3,
  ArrowUpRight,
  Plus,
  Trash2,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { LocalizedField } from "@/components/admin/LocalizedField";
import { cn } from "@/lib/utils";
import {
  FieldGrid,
  ImageField,
  LivePreview,
  SaveBar,
  SettingsCard,
  SettingsSection,
  TextAreaField,
  TextField,
  IconPicker,
  useLastSaved,
} from "./parts";

/* ----------------------------- Types & Helpers ---------------------------- */

interface Block {
  id: string;
  key: string;
  title: string;
  title_fr: string;
  title_en: string;
  subtitle: string;
  subtitle_fr: string;
  subtitle_en: string;
  body: string;
  body_fr: string;
  body_en: string;
  image: string;
  cta_label: string;
  cta_href: string;
  badges: string;
  badges_fr: string;
  badges_en: string;
  data: Record<string, unknown>;
}

interface StatDraft {
  id: string | null;
  tempId: string;
  label: string;
  label_fr: string;
  label_en: string;
  value: string;
  icon: string;
}

const badgeList = (v: unknown): string =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").join(", ") : "";

const toBadges = (v: string): string[] =>
  v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const CMS_SHORTCUTS = [
  { label: "إدارة باقات العمرة", href: "/admin/packages" },
  { label: "إدارة الخدمات", href: "/admin/services" },
  { label: "إدارة المزايا (Why Us)", href: "/admin/features" },
  { label: "إدارة معرض الصور", href: "/admin/gallery" },
  { label: "إدارة المقالات والأخبار", href: "/admin/blog" },
  { label: "إدارة آراء المسافرين", href: "/admin/testimonials" },
  { label: "إدارة الأسئلة الشائعة", href: "/admin/faq" },
  { label: "إدارة الفروع", href: "/admin/branches" },
];

export function HomepageContentSection() {
  const qc = useQueryClient();

  /* 1. Content Blocks Query (hero, about, cta) */
  const contentQuery = useQuery({
    queryKey: ["admin-site-content"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select(
          "id,key,title,title_fr,title_en,subtitle,subtitle_fr,subtitle_en,body,body_fr,body_en,image,cta_label,cta_href,data",
        )
        .order("key");
      if (error) throw error;
      return data;
    },
  });

  /* 2. Stats Query */
  const statsQuery = useQuery({
    queryKey: ["admin-site-stats"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_stats")
        .select("id,label,label_fr,label_en,value,icon,sort_order")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const remoteBlocks = useMemo<Block[]>(() => {
    const list = contentQuery.data ?? [];
    return ["hero", "about", "cta"].map((key) => {
      const found = list.find((r) => r.key === key);
      return {
        id: found?.id ?? key,
        key,
        title: found?.title ?? "",
        title_fr: found?.title_fr ?? "",
        title_en: found?.title_en ?? "",
        subtitle: found?.subtitle ?? "",
        subtitle_fr: found?.subtitle_fr ?? "",
        subtitle_en: found?.subtitle_en ?? "",
        body: found?.body ?? "",
        body_fr: found?.body_fr ?? "",
        body_en: found?.body_en ?? "",
        image: found?.image ?? "",
        cta_label: found?.cta_label ?? "",
        cta_href: found?.cta_href ?? "",
        badges: badgeList((found?.data as Record<string, unknown> | null)?.badges),
        badges_fr: badgeList((found?.data as Record<string, unknown> | null)?.badges_fr),
        badges_en: badgeList((found?.data as Record<string, unknown> | null)?.badges_en),
        data: ((found?.data as Record<string, unknown> | null) ?? {}) as Record<string, unknown>,
      };
    });
  }, [contentQuery.data]);

  const remoteStats = useMemo<StatDraft[]>(
    () =>
      (statsQuery.data ?? []).map((r) => ({
        id: r.id,
        tempId: r.id,
        label: r.label ?? "",
        label_fr: r.label_fr ?? "",
        label_en: r.label_en ?? "",
        value: r.value ?? "",
        icon: r.icon ?? "trophy",
      })),
    [statsQuery.data],
  );

  const [blocks, setBlocks] = useState<Block[]>(remoteBlocks);
  const [stats, setStats] = useState<StatDraft[]>(remoteStats);
  const [openBlock, setOpenBlock] = useState<string>("hero");
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => setBlocks(remoteBlocks), [remoteBlocks]);
  useEffect(() => setStats(remoteStats), [remoteStats]);

  const blocksDirty = JSON.stringify(blocks) !== JSON.stringify(remoteBlocks);
  const statsDirty = JSON.stringify(stats) !== JSON.stringify(remoteStats);
  const isDirty = blocksDirty || statsDirty;

  /* Save Mutation */
  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Save Content Blocks
      if (blocksDirty) {
        for (const b of blocks) {
          const before = remoteBlocks.find((r) => r.key === b.key);
          if (before && JSON.stringify(before) === JSON.stringify(b)) continue;

          const { error } = await supabase
            .from("site_content")
            .update({
              title: b.title || null,
              title_fr: b.title_fr || null,
              title_en: b.title_en || null,
              subtitle: b.subtitle || null,
              subtitle_fr: b.subtitle_fr || null,
              subtitle_en: b.subtitle_en || null,
              body: b.body || null,
              body_fr: b.body_fr || null,
              body_en: b.body_en || null,
              image: b.image || null,
              cta_label: b.cta_label || null,
              cta_href: b.cta_href || null,
              data: {
                ...b.data,
                badges: toBadges(b.badges),
                badges_fr: toBadges(b.badges_fr),
                badges_en: toBadges(b.badges_en),
              },
            })
            .eq("key", b.key);
          if (error) throw error;
        }
      }

      // 2. Save Stats
      if (statsDirty) {
        const toDelete = remoteStats
          .filter((r) => r.id && !stats.some((s) => s.id === r.id))
          .map((r) => r.id as string);

        if (toDelete.length > 0) {
          const { error: delErr } = await supabase.from("site_stats").delete().in("id", toDelete);
          if (delErr) throw delErr;
        }

        for (let i = 0; i < stats.length; i++) {
          const s = stats[i];
          const payload = {
            label: s.label.trim(),
            label_fr: s.label_fr.trim() || null,
            label_en: s.label_en.trim() || null,
            value: s.value.trim(),
            icon: s.icon || "trophy",
            sort_order: i,
          };

          if (s.id) {
            const { error } = await supabase.from("site_stats").update(payload).eq("id", s.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from("site_stats").insert(payload);
            if (error) throw error;
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("تم نشر وحفظ محتوى الصفحة الرئيسية بنجاح");
      qc.invalidateQueries({ queryKey: ["admin-site-content"] });
      qc.invalidateQueries({ queryKey: ["content"] });
      qc.invalidateQueries({ queryKey: ["admin-site-stats"] });
      qc.invalidateQueries({ queryKey: ["site_stats"] });
      setPreviewKey((k) => k + 1);
    },
    onError: (e: Error) => toast.error(e.message || "حدث خطأ أثناء حفظ المحتوى"),
  });

  const lastSaved = useLastSaved(saveMutation.isPending, saveMutation.isSuccess);

  if (contentQuery.isLoading || statsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  const heroBlock = blocks.find((b) => b.key === "hero")!;
  const aboutBlock = blocks.find((b) => b.key === "about")!;
  const ctaBlock = blocks.find((b) => b.key === "cta")!;

  function patchBlock(key: string, patch: Partial<Block>) {
    setBlocks((list) => list.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  }

  function addStat() {
    setStats((list) => [
      ...list,
      {
        id: null,
        tempId: `temp_${Date.now()}`,
        label: "إحصائية جديدة",
        label_fr: "",
        label_en: "",
        value: "+1,000",
        icon: "trophy",
      },
    ]);
  }

  function updateStat(tempId: string, patch: Partial<StatDraft>) {
    setStats((list) => list.map((s) => (s.tempId === tempId ? { ...s, ...patch } : s)));
  }

  function removeStat(tempId: string) {
    setStats((list) => list.filter((s) => s.tempId !== tempId));
  }

  return (
    <SettingsSection
      title="محتوى الصفحة الرئيسية (Homepage Content)"
      description="تعديل نصوص وصور الواجهة الترحيبية، نبذة الوكالة، أرقام الإنجازات، والنداء الختامي."
    >
      {/* CMS Management Router Banner */}
      <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-small font-bold text-foreground">
            إدارة المحتوى المتخصص (Dedicated Content Modules)
          </h4>
          <span className="text-[12px] text-muted-foreground">
            تدار الخدمات، المقالات، المعرض، الفروع والتقييمات من صفحاتها المخصصة:
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CMS_SHORTCUTS.map((item) => (
            <Button
              key={item.href}
              asChild
              variant="outline"
              size="xs"
            >
              <Link to={item.href}>
                <span>{item.label}</span>
                <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {/* 1. Hero Block */}
      <SettingsCard
        title="الواجهة الرئيسية (Hero Section)"
        description="العنوان الرئيسي، النص التعريفي، زر الحجز، وصورة الخلفية للواجهة الترحيبية."
      >
        <FieldGrid>
          <div className="md:col-span-2">
            <LocalizedField
              label="العنوان الترحيبي العريض (Headline)"
              values={{
                base: heroBlock.title,
                fr: heroBlock.title_fr,
                en: heroBlock.title_en,
              }}
              onChange={(v) =>
                patchBlock("hero", {
                  title: v.base,
                  title_fr: v.fr,
                  title_en: v.en,
                })
              }
            />
          </div>
          <div className="md:col-span-2">
            <LocalizedField
              label="النص الفرعي التوضيحي (Subtitle)"
              values={{
                base: heroBlock.subtitle,
                fr: heroBlock.subtitle_fr,
                en: heroBlock.subtitle_en,
              }}
              onChange={(v) =>
                patchBlock("hero", {
                  subtitle: v.base,
                  subtitle_fr: v.fr,
                  subtitle_en: v.en,
                })
              }
            />
          </div>
          <div className="md:col-span-2">
            <ImageField
              label="صورة خلفية الواجهة (Hero Image)"
              hint="صورة أفقية عريضة بدقة عالية (يوصى بـ 1920x1080)."
              folder="content"
              value={heroBlock.image}
              onChange={(v) => patchBlock("hero", { image: v })}
            />
          </div>
          <TextField
            label="نص زر الحجز الرئيسي (CTA Button Label)"
            value={heroBlock.cta_label}
            onChange={(v) => patchBlock("hero", { cta_label: v })}
          />
          <TextField
            label="وجهة زر الحجز (CTA Destination URL)"
            value={heroBlock.cta_href}
            placeholder="#programmes أو /umrah"
            onChange={(v) => patchBlock("hero", { cta_href: v })}
          />
          <div className="md:col-span-2">
            <LocalizedField
              label="شارات التميز (Badges — مفصولة بفواصل)"
              values={{
                base: heroBlock.badges,
                fr: heroBlock.badges_fr,
                en: heroBlock.badges_en,
              }}
              onChange={(v) =>
                patchBlock("hero", {
                  badges: v.base,
                  badges_fr: v.fr,
                  badges_en: v.en,
                })
              }
            />
          </div>
        </FieldGrid>
      </SettingsCard>

      {/* 2. About Agency Block */}
      <SettingsCard
        title="عن الوكالة (About Agency Block)"
        description="نبذة تعريفية مختصرة عن مسيرة جنة الصحراء ورسالتها في خدمة المعتمرين والمسافرين."
      >
        <FieldGrid>
          <div className="md:col-span-2">
            <LocalizedField
              label="عنوان قسم عن الوكالة"
              values={{
                base: aboutBlock.title,
                fr: aboutBlock.title_fr,
                en: aboutBlock.title_en,
              }}
              onChange={(v) =>
                patchBlock("about", {
                  title: v.base,
                  title_fr: v.fr,
                  title_en: v.en,
                })
              }
            />
          </div>
          <div className="md:col-span-2">
            <LocalizedField
              label="الشعار أو النص التعريفي الفرعي"
              values={{
                base: aboutBlock.subtitle,
                fr: aboutBlock.subtitle_fr,
                en: aboutBlock.subtitle_en,
              }}
              onChange={(v) =>
                patchBlock("about", {
                  subtitle: v.base,
                  subtitle_fr: v.fr,
                  subtitle_en: v.en,
                })
              }
            />
          </div>
          <div className="md:col-span-2">
            <LocalizedField
              label="نص النبذة التعريفية (Description)"
              rows={3}
              values={{
                base: aboutBlock.body,
                fr: aboutBlock.body_fr,
                en: aboutBlock.body_en,
              }}
              onChange={(v) =>
                patchBlock("about", {
                  body: v.base,
                  body_fr: v.fr,
                  body_en: v.en,
                })
              }
            />
          </div>
          <div className="md:col-span-2">
            <ImageField
              label="صورة القسم التعريفية"
              folder="content"
              value={aboutBlock.image}
              onChange={(v) => patchBlock("about", { image: v })}
            />
          </div>
        </FieldGrid>
      </SettingsCard>

      {/* 3. Statistics KPIs Block */}
      <SettingsCard
        title="أرقام وإحصائيات الوكالة (Statistics KPIs)"
        description="أرقام الإنجازات والخبرة المعروضة على الموقع لإبراز موثوقية الوكالة وحجم نشاطها."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={addStat}>
            <Plus className="h-3.5 w-3.5" />
            <span>إضافة إحصائية</span>
          </Button>
        }
      >
        {stats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-subtle p-8 text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-2 text-small font-medium text-foreground">
              لا توجد إحصائيات معروضة حالياً
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              يمكنك إضافة أرقام سنوات الخبرة، عدد المعتمرين، ونسبة رضا المسافرين.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStat}
              className="mt-4"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة بطاقة إحصائية</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {stats.map((s, idx) => (
              <div
                key={s.tempId}
                className="flex flex-col md:flex-row items-start md:items-center gap-4 rounded-xl border border-border-subtle bg-surface-sunken/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-caption font-mono text-muted-foreground w-5 text-center">
                    #{idx + 1}
                  </span>
                  <IconPicker value={s.icon} onChange={(icon) => updateStat(s.tempId, { icon })} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 flex-1 w-full">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">القيمة / الرقم</Label>
                    <Input
                      value={s.value}
                      placeholder="+15"
                      onChange={(e) => updateStat(s.tempId, { value: e.target.value })}
                      className="mt-1 font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <LocalizedField
                      label="الوصف / التصنيف"
                      values={{
                        base: s.label,
                        fr: s.label_fr,
                        en: s.label_en,
                      }}
                      onChange={(v) =>
                        updateStat(s.tempId, {
                          label: v.base,
                          label_fr: v.fr,
                          label_en: v.en,
                        })
                      }
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStat(s.tempId)}
                  className="text-destructive hover:bg-destructive/10 self-end md:self-center"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>

      {/* 4. Closing CTA Block */}
      <SettingsCard
        title="دعوة الحجز الختامية (Closing CTA)"
        description="القسم التحفيزي الأخير قبل تذييل الصفحة لدعوة المسافر للتواصل أو الحجز المباشر."
      >
        <FieldGrid>
          <div className="md:col-span-2">
            <LocalizedField
              label="العنوان التحفيزي الرئيسي"
              values={{
                base: ctaBlock.title,
                fr: ctaBlock.title_fr,
                en: ctaBlock.title_en,
              }}
              onChange={(v) =>
                patchBlock("cta", {
                  title: v.base,
                  title_fr: v.fr,
                  title_en: v.en,
                })
              }
            />
          </div>
          <div className="md:col-span-2">
            <LocalizedField
              label="النص التشجيعي المرافق"
              rows={2}
              values={{
                base: ctaBlock.body,
                fr: ctaBlock.body_fr,
                en: ctaBlock.body_en,
              }}
              onChange={(v) =>
                patchBlock("cta", {
                  body: v.base,
                  body_fr: v.fr,
                  body_en: v.en,
                })
              }
            />
          </div>
          <TextField
            label="نص زر الاتصال / الحجز"
            value={ctaBlock.cta_label}
            placeholder="اتصل بنا الآن"
            onChange={(v) => patchBlock("cta", { cta_label: v })}
          />
          <TextField
            label="وجهة الزر"
            value={ctaBlock.cta_href}
            placeholder="/contact أو https://wa.me/..."
            onChange={(v) => patchBlock("cta", { cta_href: v })}
          />
        </FieldGrid>
      </SettingsCard>

      {/* Live Preview */}
      <LivePreview path="/" reloadKey={previewKey} />

      <SaveBar
        dirty={isDirty}
        saving={saveMutation.isPending}
        lastSaved={lastSaved}
        onSave={() => saveMutation.mutate()}
        onDiscard={() => {
          setBlocks(remoteBlocks);
          setStats(remoteStats);
        }}
      />
    </SettingsSection>
  );
}
