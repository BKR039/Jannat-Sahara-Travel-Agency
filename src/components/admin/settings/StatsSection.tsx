import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { IconPicker, SaveBar, SettingsCard, SettingsSection, useLastSaved } from "./parts";
import { cn } from "@/lib/utils";

interface StatDraft {
  id: string | null;
  tempId: string;
  label: string;
  value: string;
  icon: string;
}

export function StatsSection() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-site-stats"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_stats")
        .select("id,label,value,icon,sort_order")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const remote = useMemo<StatDraft[]>(
    () =>
      (query.data ?? []).map((r) => ({
        id: r.id,
        tempId: r.id,
        label: r.label ?? "",
        value: r.value ?? "",
        icon: r.icon ?? "",
      })),
    [query.data],
  );

  const [items, setItems] = useState<StatDraft[]>(remote);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  useEffect(() => setItems(remote), [remote]);

  const dirty = JSON.stringify(items) !== JSON.stringify(remote);

  const save = useMutation({
    mutationFn: async () => {
      const removed = remote.filter((r) => !items.some((i) => i.id === r.id));
      for (const r of removed) {
        const { error } = await supabase.from("site_stats").delete().eq("id", r.id!);
        if (error) throw error;
      }
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.label.trim() || !it.value.trim()) continue;
        const payload = {
          label: it.label.trim(),
          value: it.value.trim(),
          icon: it.icon || null,
          sort_order: i,
        };
        if (it.id) {
          const { error } = await supabase.from("site_stats").update(payload).eq("id", it.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("site_stats").insert(payload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success("Statistics updated");
      qc.invalidateQueries({ queryKey: ["admin-site-stats"] });
      qc.invalidateQueries({ queryKey: ["site_stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lastSaved = useLastSaved(save.isPending, save.isSuccess);

  function patch(tempId: string, p: Partial<StatDraft>) {
    setItems((list) => list.map((i) => (i.tempId === tempId ? { ...i, ...p } : i)));
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    setItems((list) => {
      const next = [...list];
      const [row] = next.splice(from, 1);
      next.splice(to, 0, row);
      return next;
    });
  }

  if (query.isLoading) return <Skeleton className="h-72 w-full rounded-2xl" />;

  return (
    <SettingsSection
      title="Statistics"
      description="The achievement counters on your homepage. Drag the cards to change the order travellers see them in."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((it, index) => (
          <div
            key={it.tempId}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) move(dragIndex, index);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={cn(
              "group rounded-2xl border border-border-subtle bg-card p-5 shadow-sm transition-all",
              dragIndex === index && "opacity-60 ring-2 ring-primary/40",
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/70" /> Card{" "}
                {index + 1}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                aria-label="Remove statistic"
                onClick={() => setItems((l) => l.filter((x) => x.tempId !== it.tempId))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-sunken/50 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-primary">
                <DynamicIcon name={it.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-h5 font-bold tabular-nums">{it.value || "0"}</p>
                <p className="truncate text-caption text-muted-foreground">{it.label || "Label"}</p>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-caption">Icon</Label>
                <IconPicker value={it.icon} onChange={(v) => patch(it.tempId, { icon: v })} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-caption">Label</Label>
                <Input
                  value={it.label}
                  onChange={(e) => patch(it.tempId, { label: e.target.value })}
                  placeholder="Happy travellers"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-caption">Value</Label>
                <Input
                  value={it.value}
                  onChange={(e) => patch(it.tempId, { value: e.target.value })}
                  placeholder="12 000+"
                />
              </div>
            </div>

            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            setItems((l) => [
              ...l,
              { id: null, tempId: `new-${Date.now()}`, label: "", value: "", icon: "sparkles" },
            ])
          }
          className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-sunken/30 text-small text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-5 w-5" /> Add statistic card
        </button>
      </div>

      <SettingsCard title="Tip">
        <p className="text-small leading-relaxed text-muted-foreground">
          Keep values short and human — “12 000+” reads better than “12034”. Three to four cards
          work best on mobile.
        </p>
      </SettingsCard>

      <SaveBar
        dirty={dirty}
        saving={save.isPending}
        lastSaved={lastSaved}
        onSave={() => save.mutate()}
        onDiscard={() => setItems(remote)}
      />
    </SettingsSection>
  );
}
