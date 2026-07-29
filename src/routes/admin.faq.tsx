import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit3, Trash2, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader, AdminCard, EmptyState } from "@/components/admin/ui";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/faq")({ component: FaqAdminPage });
type F = Database["public"]["Tables"]["faqs"]["Row"];

function FaqAdminPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<F | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useQuery({
    queryKey: ["admin-faqs"] as const,
    queryFn: async () => {
      const { data, error } = await supabase.from("faqs").select("*").order("sort_order");
      if (error) throw error;
      return data as F[];
    },
  });

  function invalidate() { qc.invalidateQueries({ queryKey: ["admin-faqs"] }); qc.invalidateQueries({ queryKey: ["faqs"] }); }

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("faqs").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
  });

  const toggle = useMutation({
    mutationFn: async (f: F) => { const { error } = await supabase.from("faqs").update({ active: !f.active }).eq("id", f.id); if (error) throw error; },
    onSuccess: invalidate,
  });

  return (
    <>
      <PageHeader title="FAQ" actions={<Button onClick={() => setCreating(true)}><Plus className="me-2 h-4 w-4" /> New FAQ</Button>} />
      <AdminCard>
        {list.isLoading ? <p className="text-small text-muted-foreground">Loading…</p> : !list.data?.length ? (
          <EmptyState title="No FAQs yet" icon={HelpCircle} />
        ) : (
          <div className="divide-y divide-border -mx-4 sm:-mx-5">
            {list.data.map((f) => (
              <div key={f.id} className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{f.question}</p>
                  <p className="mt-1 text-small text-muted-foreground line-clamp-2">{f.answer}</p>
                  {f.category && <p className="mt-1 text-caption text-muted-foreground">Category: {f.category}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={f.active} onCheckedChange={() => toggle.mutate(f)} />
                  <Button size="icon" variant="ghost" onClick={() => setEditing(f)}><Edit3 className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete FAQ?</AlertDialogTitle><AlertDialogDescription>{f.question}</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(f.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {(editing || creating) && (
        <FaqEditor initial={editing} onClose={() => { setEditing(null); setCreating(false); }} onSaved={() => { invalidate(); setEditing(null); setCreating(false); }} />
      )}
    </>
  );
}

function FaqEditor({ initial, onClose, onSaved }: { initial: F | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    question: initial?.question ?? "",
    answer: initial?.answer ?? "",
    category: initial?.category ?? "",
    sort_order: initial?.sort_order ?? 0,
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  async function save() {
    if (!f.question.trim() || !f.answer.trim()) return toast.error("Question and answer required");
    setSaving(true);
    const payload = { question: f.question.trim(), answer: f.answer.trim(), category: f.category.trim() || null, sort_order: Number(f.sort_order) || 0, active: f.active };
    try {
      if (isEdit && initial) {
        const { error } = await supabase.from("faqs").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faqs").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved"); onSaved();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Save failed"); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit FAQ" : "New FAQ"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1"><Label>Question *</Label><Input value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Answer *</Label><Textarea rows={5} value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Category</Label><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
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
