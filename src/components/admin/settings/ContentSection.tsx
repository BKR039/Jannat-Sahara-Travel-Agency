import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface Block {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  body: string;
  image: string;
  cta_label: string;
  cta_href: string;
}

const BLOCK_META: Record<string, { name: string; help: string }> = {
  hero: {
    name: "Hero",
    help: "The first thing visitors see. Keep the headline under 60 characters and use a wide, bright background image.",
  },
  about: { name: "About the agency", help: "A short story about your agency, shown on the homepage and About page." },
  cta: { name: "Closing call to action", help: "The final nudge before the footer. One clear action performs best." },
};

function metaFor(key: string) {
  return BLOCK_META[key] ?? { name: key.replace(/[-_]/g, " "), help: "Content block rendered on the public website." };
}

export function ContentSection() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-site-content"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("id,key,title,subtitle,body,image,cta_label,cta_href")
        .order("key");
      if (error) throw error;
      return data;
    },
  });

  const remote = useMemo<Block[]>(
    () =>
      (query.data ?? []).map((r) => ({
        id: r.id,
        key: r.key,
        title: r.title ?? "",
        subtitle: r.subtitle ?? "",
        body: r.body ?? "",
        image: r.image ?? "",
        cta_label: r.cta_label ?? "",
        cta_href: r.cta_href ?? "",
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
            subtitle: b.subtitle || null,
            body: b.body || null,
            image: b.image || null,
            cta_label: b.cta_label || null,
            cta_href: b.cta_href || null,
          })
          .eq("id", b.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Content published");
      qc.invalidateQueries({ queryKey: ["admin-site-content"] });
      qc.invalidateQueries({ queryKey: ["content"] });
      setPreviewKey((k) => k + 1);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lastSaved = useLastSaved(save.isPending, save.isSuccess);

  function patch(id: string, p: Partial<Block>) {
    setBlocks((list) => list.map((b) => (b.id === id ? { ...b, ...p } : b)));
  }

  if (query.isLoading) return <Skeleton className="h-72 w-full rounded-2xl" />;

  return (
    <SettingsSection
      title="Homepage content"
      description="Every homepage section is an editable block. Expand a block to edit it, then publish once — no code, no database fields."
    >
      <div className="space-y-3">
        {blocks.map((b) => {
          const meta = metaFor(b.key);
          const expanded = open === b.key;
          const changed = JSON.stringify(remote.find((r) => r.id === b.id)) !== JSON.stringify(b);
          return (
            <div key={b.id} className="overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-sm">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : b.key)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/40"
              >
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-surface-sunken/60">
                  {b.image ? (
                    <img src={b.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-caption text-muted-foreground">—</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-body font-semibold capitalize">
                    {meta.name}
                    {changed && <span className="h-2 w-2 rounded-full bg-warning" aria-label="Unsaved" />}
                  </p>
                  <p className="truncate text-caption text-muted-foreground">{b.title || "Untitled block"}</p>
                </div>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
              </button>

              {expanded && (
                <div className="border-t border-border-subtle p-5 sm:p-6">
                  <p className="mb-5 rounded-xl bg-surface-sunken/50 px-4 py-3 text-caption leading-relaxed text-muted-foreground">
                    {meta.help}
                  </p>
                  <FieldGrid>
                    <TextField label="Title" maxCount={60} value={b.title} onChange={(v) => patch(b.id, { title: v })} />
                    <TextField label="Subtitle" maxCount={120} value={b.subtitle} onChange={(v) => patch(b.id, { subtitle: v })} />
                    <TextAreaField label="Body text" hint="Optional supporting paragraph." value={b.body} onChange={(v) => patch(b.id, { body: v })} />
                    <ImageField
                      label="Background / illustration"
                      hint="Upload directly — no need to paste URLs. Recommended 1920×1080."
                      folder={`site-content/${b.key}`}
                      value={b.image}
                      onChange={(v) => patch(b.id, { image: v })}
                    />
                    <TextField label="Button label" value={b.cta_label} onChange={(v) => patch(b.id, { cta_label: v })} />
                    <TextField
                      label="Button link"
                      hint="Internal path such as /umrah or a full https link."
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

      <SettingsCard
        title="Preview on the live site"
        description="Publish your changes first, then refresh the preview."
        actions={
          <Button variant="outline" size="sm" onClick={() => setPreviewKey((k) => k + 1)}>
            <Eye className="me-2 h-4 w-4" /> Refresh
          </Button>
        }
      >
        <LivePreview path="/" reloadKey={previewKey} />
      </SettingsCard>

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
