import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
  useLastSaved,
} from "./parts";
import { useTranslation } from "react-i18next";
import { LocalizedField } from "@/components/admin/LocalizedField";

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
  /* Comma-separated in the editor, stored as a string[] inside `data`. */
  badges: string;
  badges_fr: string;
  badges_en: string;
  /* Everything else in `data`, carried through untouched on save. */
  data: Record<string, unknown>;
}

/** `data.badges` is a list; the editor takes it as one comma-separated line. */
const badgeList = (v: unknown): string =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").join(", ") : "";

const toBadges = (v: string): string[] =>
  v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const BLOCK_META: Record<string, { name: string; help: string }> = {
  hero: {
    name: "Hero",
    help: "The first thing visitors see. Keep the headline under 60 characters and use a wide, bright background image.",
  },
  about: {
    name: "About the agency",
    help: "A short story about your agency, shown on the homepage and About page.",
  },
  cta: {
    name: "Closing call to action",
    help: "The final nudge before the footer. One clear action performs best.",
  },
};

const ORDER = ["hero", "about", "cta"];

function rank(key: string) {
  const i = ORDER.indexOf(key);
  return i === -1 ? ORDER.length : i;
}

function metaFor(key: string) {
  return (
    BLOCK_META[key] ?? {
      name: key.replace(/[-_]/g, " "),
      help: "Content block rendered on the public website.",
    }
  );
}

export function ContentSection() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();
  const query = useQuery({
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

  const remote = useMemo<Block[]>(
    () =>
      [...(query.data ?? [])]
        .sort((a, b) => rank(a.key) - rank(b.key))
        .map((r) => ({
          id: r.id,
          key: r.key,
          title: r.title ?? "",
          title_fr: r.title_fr ?? "",
          title_en: r.title_en ?? "",
          subtitle: r.subtitle ?? "",
          subtitle_fr: r.subtitle_fr ?? "",
          subtitle_en: r.subtitle_en ?? "",
          body: r.body ?? "",
          body_fr: r.body_fr ?? "",
          body_en: r.body_en ?? "",
          image: r.image ?? "",
          cta_label: r.cta_label ?? "",
          cta_href: r.cta_href ?? "",
          badges: badgeList((r.data as Record<string, unknown> | null)?.badges),
          badges_fr: badgeList((r.data as Record<string, unknown> | null)?.badges_fr),
          badges_en: badgeList((r.data as Record<string, unknown> | null)?.badges_en),
          data: ((r.data as Record<string, unknown> | null) ?? {}) as Record<string, unknown>,
        })),
    [query.data],
  );

  const [blocks, setBlocks] = useState<Block[]>(remote);
  const [open, setOpen] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  useEffect(() => {
    setBlocks(remote);
    setOpen((o) => o ?? remote[0]?.key ?? null);
  }, [remote]);

  const dirty = JSON.stringify(blocks) !== JSON.stringify(remote);

  const save = useMutation({
    mutationFn: async () => {
      for (const b of blocks) {
        const before = remote.find((r) => r.id === b.id);
        if (before && JSON.stringify(before) === JSON.stringify(b)) continue;
        const { error } = await supabase
          .from("site_content")
          .update({
            title: b.title || null,
            // Empty stays NULL so the documented public fallback applies.
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
            /*
             * Spread first so keys this editor does not know about survive.
             * An empty list is removed rather than stored as [], so the public
             * fallback ("no badge in this language") stays the same shape as a
             * missing key.
             */
            data: {
              ...b.data,
              badges: toBadges(b.badges),
              badges_fr: toBadges(b.badges_fr),
              badges_en: toBadges(b.badges_en),
            },
          })
          .eq("id", b.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("content.settings.homepage.published"));
      qc.invalidateQueries({ queryKey: ["admin-site-content"] });
      qc.invalidateQueries({ queryKey: ["content"] });
      setPreviewKey((k) => k + 1);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lastSaved = useLastSaved(save.isPending, save.isSuccess);

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!dirty || query.isLoading) return;
    const t = setTimeout(() => saveRef.current.mutate(), 1500);
    return () => clearTimeout(t);
  }, [blocks, dirty, query.isLoading]);

  function patch(id: string, p: Partial<Block>) {
    setBlocks((list) => list.map((b) => (b.id === id ? { ...b, ...p } : b)));
  }

  if (query.isLoading) return <Skeleton className="h-72 w-full rounded-card" />;

  return (
    <SettingsSection
      title={t("content.settings.homepage.title")}
      description={t("content.settings.homepage.description")}
    >
      <div className="space-y-3">
        {blocks.map((b) => {
          const meta = metaFor(b.key);
          const expanded = open === b.key;
          const changed = JSON.stringify(remote.find((r) => r.id === b.id)) !== JSON.stringify(b);
          return (
            <div
              key={b.id}
              className="overflow-hidden rounded-card border border-border-subtle bg-card"
            >
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : b.key)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-4 px-5 py-4 text-start transition-colors hover:bg-accent/40"
              >
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-surface-sunken/60">
                  {b.image ? (
                    <img
                      src={b.image}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-caption text-muted-foreground">
                      —
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-body font-semibold capitalize">
                    {meta.name}
                    {changed && (
                      <span
                        className="h-2 w-2 rounded-full bg-warning"
                        aria-label={t("content.settings.homepage.unsaved")}
                      />
                    )}
                  </p>
                  <p className="truncate text-caption text-muted-foreground">
                    {b.title || "Untitled block"}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </button>

              {expanded && (
                <div className="border-t border-border-subtle p-5 sm:p-6">
                  <p className="mb-5 rounded-xl bg-surface-sunken/50 px-4 py-3 text-caption leading-relaxed text-muted-foreground">
                    {meta.help}
                  </p>
                  <FieldGrid>
                    <div className="md:col-span-2">
                      <LocalizedField
                        label={t("content.settings.homepage.titleField")}
                        values={{ base: b.title, fr: b.title_fr, en: b.title_en }}
                        onChange={(v) =>
                          patch(b.id, { title: v.base, title_fr: v.fr, title_en: v.en })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <LocalizedField
                        label={t("content.settings.homepage.subtitleField")}
                        values={{ base: b.subtitle, fr: b.subtitle_fr, en: b.subtitle_en }}
                        onChange={(v) =>
                          patch(b.id, { subtitle: v.base, subtitle_fr: v.fr, subtitle_en: v.en })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <LocalizedField
                        label={t("content.settings.homepage.bodyField")}
                        rows={3}
                        values={{ base: b.body, fr: b.body_fr, en: b.body_en }}
                        onChange={(v) =>
                          patch(b.id, { body: v.base, body_fr: v.fr, body_en: v.en })
                        }
                      />
                    </div>
                    {b.key === "hero" && (
                      <div className="md:col-span-2">
                        <LocalizedField
                          label={t("content.settings.homepage.badgesField")}
                          values={{ base: b.badges, fr: b.badges_fr, en: b.badges_en }}
                          onChange={(v) =>
                            patch(b.id, { badges: v.base, badges_fr: v.fr, badges_en: v.en })
                          }
                        />
                        <p className="mt-1 text-caption text-muted-foreground">
                          {t("content.settings.homepage.badgesHint")}
                        </p>
                      </div>
                    )}
                    <ImageField
                      label={t("content.settings.homepage.imageField")}
                      hint={t("content.settings.homepage.hints.heroImage")}
                      folder={`site-content/${b.key}`}
                      value={b.image}
                      onChange={(v) => patch(b.id, { image: v })}
                    />
                    <TextField
                      label={t("content.settings.homepage.buttonLabel")}
                      value={b.cta_label}
                      onChange={(v) => patch(b.id, { cta_label: v })}
                    />
                    <TextField
                      label={t("content.settings.homepage.buttonLink")}
                      hint={t("content.settings.homepage.hints.ctaLink")}
                      value={b.cta_href}
                      onChange={(v) => patch(b.id, { cta_href: v })}
                    />
                  </FieldGrid>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <LivePreview path="/" reloadKey={previewKey} />

      <SaveBar
        dirty={dirty}
        saving={save.isPending}
        lastSaved={lastSaved}
        onSave={() => save.mutate()}
        onDiscard={() => setBlocks(remote)}
      />
    </SettingsSection>
  );
}
