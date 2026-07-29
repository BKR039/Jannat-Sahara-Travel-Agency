import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit3, Trash2, Star, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader, AdminCard, EmptyState } from "@/components/admin/ui";
import { uploadMedia } from "@/lib/admin/media";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/testimonials")({ component: TestimonialsAdminPage });
type T = Database["public"]["Tables"]["testimonials"]["Row"];

function TestimonialsAdminPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useQuery({
    queryKey: ["admin-testimonials"] as const,
    queryFn: async () => {
      const { data, error } = await supabase.from("testimonials").select("*").order("sort_order");
      if (error) throw error;
      return data as T[];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
    qc.invalidateQueries({ queryKey: ["testimonials"] });
  }

  const toggle = useMutation({
    mutationFn: async (t: T) => {
      const { error } = await supabase.from("testimonials").update({ active: !t.active }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Testimonials" actions={<Button onClick={() => setCreating(true)}><Plus className="me-2 h-4 w-4" /> New testimonial</Button>} />
      <AdminCard>
        {list.isLoading ? <p className="text-small text-muted-foreground">Loading…</p> : !list.data?.length ? (
          <EmptyState title="No testimonials yet" icon={Star} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.data.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  {t.avatar && <img src={t.avatar} alt={t.name} className="h-10 w-10 rounded-full object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{t.name}</p>
                    {t.role && <p className="text-caption text-muted-foreground">{t.role}</p>}
                    <div className="mt-1 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < t.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-small text-muted-foreground line-clamp-3">{t.content}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-caption"><Switch checked={t.active} onCheckedChange={() => toggle.mutate(t)} /><span>{t.active ? "Active" : "Hidden"}</span></div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(t)}><Edit3 className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>Delete testimonial by "{t.name}"?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(t.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {(editing || creating) && (
        <TestimonialEditor
          initial={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { invalidate(); setEditing(null); setCreating(false); }}
        />
      )}
    </>
  );
}

function TestimonialEditor({ initial, onClose, onSaved }: { initial: T | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    role: initial?.role ?? "",
    avatar: initial?.avatar ?? "",
    content: initial?.content ?? "",
    rating: initial?.rating ?? 5,
    sort_order: initial?.sort_order ?? 0,
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await uploadMedia(file, "testimonials"); setF((s) => ({ ...s, avatar: url })); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
  }

  async function save() {
    if (!f.name.trim() || !f.content.trim()) return toast.error("Name and content required");
    setSaving(true);
    const payload = { name: f.name.trim(), role: f.role.trim() || null, avatar: f.avatar.trim() || null, content: f.content.trim(), rating: Number(f.rating) || 5, sort_order: Number(f.sort_order) || 0, active: f.active };
    try {
      if (isEdit && initial) {
        const { error } = await supabase.from("testimonials").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("testimonials").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved"); onSaved();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Save failed"); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit testimonial" : "New testimonial"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1"><Label>Name *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Role</Label><Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Content *</Label><Textarea rows={4} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Avatar</Label>
            <div className="flex gap-2">
              <Input value={f.avatar} onChange={(e) => setF({ ...f, avatar: e.target.value })} />
              <label className="inline-flex items-center gap-1 rounded-md border border-input px-3 text-small cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4" /><input type="file" accept="image/*" className="sr-only" onChange={upload} />
              </label>
            </div>
          </div>
          <div className="grid gap-1"><Label>Rating (1-5)</Label><Input type="number" min={1} max={5} value={f.rating} onChange={(e) => setF({ ...f, rating: Number(e.target.value) || 5 })} /></div>
          <div className="grid gap-1"><Label>Sort order</Label><Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) || 0 })} /></div>
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
