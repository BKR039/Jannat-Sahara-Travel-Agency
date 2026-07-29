import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit3, Trash2, Newspaper, Upload, Eye, EyeOff } from "lucide-react";
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

export const Route = createFileRoute("/admin/blog")({ component: BlogAdminPage });

type Article = Database["public"]["Tables"]["articles"]["Row"];

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

function BlogAdminPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useQuery({
    queryKey: ["admin-articles"] as const,
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*").order("published_at", { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-articles"] });
    qc.invalidateQueries({ queryKey: ["articles"] });
  }

  const togglePublish = useMutation({
    mutationFn: async (a: Article) => {
      const { error } = await supabase.from("articles").update({ published: !a.published, published_at: !a.published ? new Date().toISOString() : a.published_at }).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Blog" description="Articles shown on the public blog." actions={<Button onClick={() => setCreating(true)}><Plus className="me-2 h-4 w-4" /> New article</Button>} />
      <AdminCard>
        {list.isLoading ? <p className="text-small text-muted-foreground">Loading…</p> : !list.data?.length ? (
          <EmptyState title="No articles yet" icon={Newspaper} />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-small">
              <thead><tr className="border-b border-border text-left">
                <th className="px-4 sm:px-5 py-2 font-semibold">Title</th>
                <th className="px-4 py-2 font-semibold">Slug</th>
                <th className="px-4 py-2 font-semibold">Published</th>
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-4 sm:px-5 py-2 font-semibold text-right">Actions</th>
              </tr></thead>
              <tbody>
                {list.data.map((a) => (
                  <tr key={a.id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="px-4 sm:px-5 py-3">
                      <div className="flex items-center gap-3">
                        {a.cover && <img src={a.cover} alt="" className="h-10 w-10 rounded object-cover" />}
                        <div>
                          <div className="font-medium">{a.title}</div>
                          <div className="text-caption text-muted-foreground line-clamp-1">{a.excerpt}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-caption text-muted-foreground">/{a.slug}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => togglePublish.mutate(a)} title={a.published ? "Unpublish" : "Publish"}>
                        {a.published ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-caption">{a.published_at ? new Date(a.published_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 sm:px-5 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(a)}><Edit3 className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete article?</AlertDialogTitle><AlertDialogDescription>Delete "{a.title}"?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(a.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {(editing || creating) && (
        <ArticleEditor
          initial={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { invalidate(); setEditing(null); setCreating(false); }}
        />
      )}
    </>
  );
}

function ArticleEditor({ initial, onClose, onSaved }: { initial: Article | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    excerpt: initial?.excerpt ?? "",
    content: initial?.content ?? "",
    cover: initial?.cover ?? "",
    author: initial?.author ?? "",
    tags: Array.isArray(initial?.tags) ? (initial!.tags as string[]).join(", ") : "",
    published: initial?.published ?? true,
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await uploadMedia(file, "blog"); setF((s) => ({ ...s, cover: url })); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
  }

  async function save() {
    if (!f.title.trim() || !f.slug.trim()) return toast.error("Title and slug required");
    const payload = {
      title: f.title.trim(),
      slug: slugify(f.slug || f.title),
      excerpt: f.excerpt.trim() || null,
      content: f.content.trim() || null,
      cover: f.cover.trim() || null,
      author: f.author.trim() || null,
      tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean),
      published: f.published,
      published_at: f.published ? new Date().toISOString() : null,
    };
    setSaving(true);
    try {
      if (isEdit && initial) {
        const { error } = await supabase.from("articles").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("articles").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved"); onSaved();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Save failed"); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit article" : "New article"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1 sm:col-span-2"><Label>Title *</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Slug *</Label><Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} onBlur={() => setF({ ...f, slug: slugify(f.slug) })} /></div>
          <div className="grid gap-1"><Label>Author</Label><Input value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} /></div>
          <div className="grid gap-1 sm:col-span-2"><Label>Excerpt</Label><Textarea rows={2} value={f.excerpt} onChange={(e) => setF({ ...f, excerpt: e.target.value })} /></div>
          <div className="grid gap-1 sm:col-span-2"><Label>Content (Markdown/HTML)</Label><Textarea rows={12} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} /></div>
          <div className="grid gap-1 sm:col-span-2"><Label>Cover image</Label>
            <div className="flex gap-2">
              <Input value={f.cover} onChange={(e) => setF({ ...f, cover: e.target.value })} placeholder="https://…" />
              <label className="inline-flex items-center gap-1 rounded-md border border-input px-3 text-small cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4" /><input type="file" accept="image/*" className="sr-only" onChange={upload} />
              </label>
            </div>
            {f.cover && <img src={f.cover} alt="" className="mt-2 h-24 rounded-md object-cover" />}
          </div>
          <div className="grid gap-1 sm:col-span-2"><Label>Tags (comma separated)</Label><Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></div>
          <div className="flex items-center gap-2 sm:col-span-2"><Switch checked={f.published} onCheckedChange={(v) => setF({ ...f, published: v })} /><Label>Published</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
