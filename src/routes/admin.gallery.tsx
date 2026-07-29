import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Upload, ImageIcon, Edit3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader, AdminCard, EmptyState } from "@/components/admin/ui";
import { uploadMedia } from "@/lib/admin/media";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/gallery")({ component: GalleryAdminPage });

type Item = Database["public"]["Tables"]["gallery_items"]["Row"];

function GalleryAdminPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [category, setCategory] = useState("all");

  const list = useQuery({
    queryKey: ["admin-gallery", category] as const,
    queryFn: async () => {
      let q = supabase.from("gallery_items").select("*").order("sort_order").order("created_at", { ascending: false });
      if (category !== "all") q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return data as Item[];
    },
  });

  const categoriesQ = useQuery({
    queryKey: ["admin-gallery-categories"] as const,
    queryFn: async () => {
      const { data } = await supabase.from("gallery_items").select("category");
      return Array.from(new Set((data ?? []).map((r) => r.category).filter(Boolean))) as string[];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-gallery"] });
    qc.invalidateQueries({ queryKey: ["gallery"] });
  }

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gallery_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (i: Item) => {
      const { error } = await supabase.from("gallery_items").update({ active: !i.active }).eq("id", i.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  async function bulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        const url = await uploadMedia(file, "gallery");
        const { error } = await supabase.from("gallery_items").insert({
          image: url,
          title: file.name.replace(/\.[^.]+$/, ""),
          active: true,
          sort_order: 0,
        });
        if (error) throw error;
        ok++;
      } catch (err) {
        console.error(err);
      }
    }
    toast.success(`Uploaded ${ok} image(s)`);
    invalidate();
    e.target.value = "";
  }

  return (
    <>
      <PageHeader
        title="Gallery"
        description="Photos and videos shown on the public gallery."
        actions={
          <>
            <label className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-small text-primary-foreground hover:bg-primary/90 cursor-pointer">
              <Upload className="h-4 w-4" /> Bulk upload
              <input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={bulkUpload} />
            </label>
            <Button variant="outline" onClick={() => setCreating(true)}><Plus className="me-2 h-4 w-4" /> Add item</Button>
          </>
        }
      />

      <AdminCard className="mb-4">
        <div className="flex gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(categoriesQ.data ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </AdminCard>

      <AdminCard>
        {list.isLoading ? <p className="text-small text-muted-foreground">Loading…</p> : !list.data?.length ? (
          <EmptyState title="No gallery items yet" icon={ImageIcon} />
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {list.data.map((i) => (
              <div key={i.id} className="group relative overflow-hidden rounded-xl border border-border bg-card">
                <img src={i.image} alt={i.title ?? ""} className="aspect-square w-full object-cover" loading="lazy" />
                <div className="p-2">
                  <p className="text-caption font-medium truncate">{i.title ?? "—"}</p>
                  <p className="text-caption text-muted-foreground">{i.category ?? "—"}</p>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Switch checked={i.active} onCheckedChange={() => toggleActive.mutate(i)} />
                  <Button size="icon" variant="secondary" onClick={() => setEditing(i)}><Edit3 className="h-3.5 w-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete image?</AlertDialogTitle>
                        <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove.mutate(i.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {(editing || creating) && (
        <GalleryEditor
          initial={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { invalidate(); setEditing(null); setCreating(false); }}
        />
      )}
    </>
  );
}

function GalleryEditor({ initial, onClose, onSaved }: { initial: Item | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: initial?.title ?? "",
    image: initial?.image ?? "",
    category: initial?.category ?? "",
    sort_order: initial?.sort_order != null ? String(initial.sort_order) : "0",
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadMedia(file, "gallery");
      setF((s) => ({ ...s, image: url }));
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
  }

  async function save() {
    if (!f.image.trim()) return toast.error("Image required");
    const payload = { title: f.title.trim() || null, image: f.image.trim(), category: f.category.trim() || null, sort_order: Number(f.sort_order) || 0, active: f.active };
    setSaving(true);
    try {
      if (isEdit && initial) {
        const { error } = await supabase.from("gallery_items").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gallery_items").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved");
      onSaved();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Save failed"); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit item" : "Add gallery item"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Image *</Label>
            <div className="flex gap-2">
              <Input value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} />
              <label className="inline-flex items-center gap-1 rounded-md border border-input px-3 text-small cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4" /><input type="file" accept="image/*" className="sr-only" onChange={upload} />
              </label>
            </div>
            {f.image && <img src={f.image} alt="" className="h-24 rounded-md object-cover" />}
          </div>
          <div className="grid gap-1"><Label>Category</Label><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Sort order</Label><Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /><Label>Active</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
