import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit3, Trash2, MapPin, Upload, ExternalLink, Star } from "lucide-react";
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

export const Route = createFileRoute("/admin/branches")({ component: BranchesAdminPage });

type Branch = Database["public"]["Tables"]["branches"]["Row"];

function BranchesAdminPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Branch | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useQuery({
    queryKey: ["admin-branches"] as const,
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("sort_order");
      if (error) throw error;
      return data as Branch[];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-branches"] });
    qc.invalidateQueries({ queryKey: ["branches"] });
  }

  const toggleActive = useMutation({
    mutationFn: async (b: Branch) => {
      const { error } = await supabase.from("branches").update({ is_active: !b.is_active }).eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const setMain = useMutation({
    mutationFn: async (id: string) => {
      const { error: e1 } = await supabase.from("branches").update({ is_main_branch: false }).neq("id", id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("branches").update({ is_main_branch: true }).eq("id", id);
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("Main branch updated"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Branch deleted"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Branches"
        description="Physical locations shown on the public site and map."
        actions={<Button onClick={() => setCreating(true)}><Plus className="me-2 h-4 w-4" /> New branch</Button>}
      />

      <AdminCard>
        {list.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !list.data?.length ? (
          <EmptyState title="No branches yet" icon={MapPin} action={<Button onClick={() => setCreating(true)}><Plus className="me-2 h-4 w-4" /> Add branch</Button>} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.data.map((b) => (
              <div key={b.id} className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                {b.image && <img src={b.image} alt={b.name} className="mb-3 h-32 w-full rounded-lg object-cover" />}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.city}</p>
                  </div>
                  {b.is_main_branch && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">Main</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{b.address}</p>
                {b.phone && <p className="mt-1 text-xs">{b.phone}</p>}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Switch checked={b.is_active} onCheckedChange={() => toggleActive.mutate(b)} />
                    <span className="text-muted-foreground">{b.is_active ? "Active" : "Hidden"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!b.is_main_branch && (
                      <button title="Set as main branch" onClick={() => setMain.mutate(b.id)} className="p-1.5 rounded-md hover:bg-accent">
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    {b.google_maps_url && (
                      <a href={b.google_maps_url} target="_blank" rel="noreferrer" className="p-1.5 rounded-md hover:bg-accent" title="Open in Maps">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => setEditing(b)}><Edit3 className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete branch?</AlertDialogTitle>
                          <AlertDialogDescription>Delete "{b.name}"?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(b.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
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
        <BranchEditor
          initial={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { invalidate(); setEditing(null); setCreating(false); }}
        />
      )}
    </>
  );
}

function BranchEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Branch | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    city: initial?.city ?? "",
    address: initial?.address ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    latitude: initial?.latitude != null ? String(initial.latitude) : "",
    longitude: initial?.longitude != null ? String(initial.longitude) : "",
    working_hours: initial?.working_hours ?? "",
    google_maps_url: initial?.google_maps_url ?? "",
    image: initial?.image ?? "",
    is_main_branch: initial?.is_main_branch ?? false,
    is_active: initial?.is_active ?? true,
    sort_order: initial?.sort_order != null ? String(initial.sort_order) : "0",
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadMedia(file, "branches");
      setF((s) => ({ ...s, image: url }));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function save() {
    if (!f.name.trim() || !f.city.trim() || !f.address.trim()) return toast.error("Name, city, address required");
    const lat = Number(f.latitude);
    const lon = Number(f.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return toast.error("Valid latitude & longitude required");

    const payload = {
      name: f.name.trim(),
      city: f.city.trim(),
      address: f.address.trim(),
      phone: f.phone.trim() || null,
      email: f.email.trim() || null,
      latitude: lat,
      longitude: lon,
      working_hours: f.working_hours.trim() || null,
      google_maps_url: f.google_maps_url.trim() || null,
      image: f.image.trim() || null,
      is_main_branch: f.is_main_branch,
      is_active: f.is_active,
      sort_order: Number(f.sort_order) || 0,
    };

    setSaving(true);
    try {
      if (isEdit && initial) {
        const { error } = await supabase.from("branches").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success("Branch updated");
      } else {
        const { error } = await supabase.from("branches").insert(payload);
        if (error) throw error;
        toast.success("Branch created");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit branch" : "New branch"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1"><Label>Name *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid gap-1"><Label>City *</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
          <div className="grid gap-1 sm:col-span-2"><Label>Address *</Label><Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Latitude *</Label><Input type="number" step="any" value={f.latitude} onChange={(e) => setF({ ...f, latitude: e.target.value })} /></div>
          <div className="grid gap-1"><Label>Longitude *</Label><Input type="number" step="any" value={f.longitude} onChange={(e) => setF({ ...f, longitude: e.target.value })} /></div>
          <div className="grid gap-1 sm:col-span-2"><Label>Working hours</Label><Input value={f.working_hours} onChange={(e) => setF({ ...f, working_hours: e.target.value })} /></div>
          <div className="grid gap-1 sm:col-span-2"><Label>Google Maps URL</Label><Input value={f.google_maps_url} onChange={(e) => setF({ ...f, google_maps_url: e.target.value })} /></div>
          <div className="grid gap-1 sm:col-span-2">
            <Label>Image</Label>
            <div className="flex gap-2">
              <Input value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} placeholder="https://…" />
              <label className="inline-flex items-center gap-1 rounded-md border border-input px-3 text-sm cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4" /><input type="file" accept="image/*" className="sr-only" onChange={uploadImage} />
              </label>
            </div>
            {f.image && <img src={f.image} alt="" className="mt-2 h-24 rounded-md object-cover" />}
          </div>
          <div className="grid gap-1"><Label>Sort order</Label><Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /><Label>Active</Label></div>
          <div className="flex items-center gap-2 sm:col-span-2"><Switch checked={f.is_main_branch} onCheckedChange={(v) => setF({ ...f, is_main_branch: v })} /><Label>Main branch</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
