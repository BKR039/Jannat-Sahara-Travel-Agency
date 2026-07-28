import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader, AdminCard } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Agency-wide configuration: contact info, social links, hero content, and stats." />
      <div className="grid gap-6 lg:grid-cols-2">
        <ContactInfoSection />
        <SiteStatsSection />
      </div>
      <SiteContentSection />
    </>
  );
}

function ContactInfoSection() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-contact-info"] as const,
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_info").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  function invalidate() { qc.invalidateQueries({ queryKey: ["admin-contact-info"] }); qc.invalidateQueries({ queryKey: ["contact_info"] }); }

  const upsert = useMutation({
    mutationFn: async (row: { id?: string; key: string; label: string | null; value: string; icon: string | null; sort_order: number }) => {
      if (row.id) {
        const { error } = await supabase.from("contact_info").update(row).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contact_info").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("contact_info").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
  });

  const [draft, setDraft] = useState({ key: "", label: "", value: "", icon: "", sort_order: 0 });

  return (
    <AdminCard title="Contact info" description="Phone numbers, email, WhatsApp, social links.">
      <div className="space-y-3">
        {(list.data ?? []).map((c) => (
          <ContactInfoRow key={c.id} row={c} onSave={(patch) => upsert.mutate({ id: c.id, ...patch })} onDelete={() => remove.mutate(c.id)} />
        ))}
        <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Add new</p>
          <div className="grid gap-2 sm:grid-cols-5">
            <Input placeholder="key (phone, email, whatsapp, facebook…)" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
            <Input placeholder="Label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            <Input placeholder="Value" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} className="sm:col-span-2" />
            <Input placeholder="Icon" value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
          </div>
          <Button size="sm" onClick={() => { if (draft.key && draft.value) { upsert.mutate({ key: draft.key, label: draft.label || null, value: draft.value, icon: draft.icon || null, sort_order: draft.sort_order }); setDraft({ key: "", label: "", value: "", icon: "", sort_order: 0 }); } }}>
            <Plus className="me-2 h-4 w-4" /> Add
          </Button>
        </div>
      </div>
    </AdminCard>
  );
}

function ContactInfoRow({ row, onSave, onDelete }: { row: { key: string; label: string | null; value: string; icon: string | null; sort_order: number | null }; onSave: (patch: { key: string; label: string | null; value: string; icon: string | null; sort_order: number }) => void; onDelete: () => void }) {
  const [f, setF] = useState({ key: row.key, label: row.label ?? "", value: row.value, icon: row.icon ?? "", sort_order: row.sort_order ?? 0 });
  return (
    <div className="grid gap-2 sm:grid-cols-6 items-center">
      <Input value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} />
      <Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
      <Input value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} className="sm:col-span-2" />
      <Input value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} />
      <div className="flex gap-1">
        <Button size="icon" onClick={() => onSave({ key: f.key, label: f.label || null, value: f.value, icon: f.icon || null, sort_order: Number(f.sort_order) || 0 })}><Save className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function SiteStatsSection() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-site-stats"] as const,
    queryFn: async () => {
      const { data, error } = await supabase.from("site_stats").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  function invalidate() { qc.invalidateQueries({ queryKey: ["admin-site-stats"] }); qc.invalidateQueries({ queryKey: ["site_stats"] }); }

  const upsert = useMutation({
    mutationFn: async (row: { id?: string; label: string; value: string; icon: string | null; sort_order: number }) => {
      if (row.id) { const { error } = await supabase.from("site_stats").update(row).eq("id", row.id); if (error) throw error; }
      else { const { error } = await supabase.from("site_stats").insert(row); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("site_stats").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
  });

  const [draft, setDraft] = useState({ label: "", value: "", icon: "", sort_order: 0 });

  return (
    <AdminCard title="Impact stats" description="Numbers displayed in the homepage stats section.">
      <div className="space-y-2">
        {(list.data ?? []).map((s) => (
          <StatRow key={s.id} row={s} onSave={(p) => upsert.mutate({ id: s.id, ...p })} onDelete={() => remove.mutate(s.id)} />
        ))}
        <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-4">
            <Input placeholder="Label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            <Input placeholder="Value" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
            <Input placeholder="Icon" value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
            <Button size="sm" onClick={() => { if (draft.label && draft.value) { upsert.mutate({ label: draft.label, value: draft.value, icon: draft.icon || null, sort_order: draft.sort_order }); setDraft({ label: "", value: "", icon: "", sort_order: 0 }); } }}>
              <Plus className="me-2 h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </div>
    </AdminCard>
  );
}

function StatRow({ row, onSave, onDelete }: { row: { label: string; value: string; icon: string | null; sort_order: number | null }; onSave: (p: { label: string; value: string; icon: string | null; sort_order: number }) => void; onDelete: () => void }) {
  const [f, setF] = useState({ label: row.label, value: row.value, icon: row.icon ?? "", sort_order: row.sort_order ?? 0 });
  return (
    <div className="grid gap-2 sm:grid-cols-5 items-center">
      <Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
      <Input value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
      <Input value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} />
      <Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) || 0 })} />
      <div className="flex gap-1">
        <Button size="icon" onClick={() => onSave({ label: f.label, value: f.value, icon: f.icon || null, sort_order: Number(f.sort_order) || 0 })}><Save className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function SiteContentSection() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-site-content"] as const,
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("*").order("key");
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: { id: string; title: string | null; subtitle: string | null; body: string | null; image: string | null; cta_label: string | null; cta_href: string | null }) => {
      const { error } = await supabase.from("site_content").update(row).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-site-content"] }); qc.invalidateQueries({ queryKey: ["content"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminCard title="Site content" description="Hero, CTA and marketing content blocks." className="mt-6">
      <div className="space-y-4">
        {(list.data ?? []).map((c) => <SiteContentBlock key={c.id} row={c} onSave={(p) => upsert.mutate({ id: c.id, ...p })} />)}
      </div>
    </AdminCard>
  );
}

function SiteContentBlock({ row, onSave }: { row: { key: string; title: string | null; subtitle: string | null; body: string | null; image: string | null; cta_label: string | null; cta_href: string | null }; onSave: (p: { title: string | null; subtitle: string | null; body: string | null; image: string | null; cta_label: string | null; cta_href: string | null }) => void }) {
  const [f, setF] = useState({
    title: row.title ?? "",
    subtitle: row.subtitle ?? "",
    body: row.body ?? "",
    image: row.image ?? "",
    cta_label: row.cta_label ?? "",
    cta_href: row.cta_href ?? "",
  });
  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Block: {row.key}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="grid gap-1"><Label>Subtitle</Label><Input value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} /></div>
        <div className="grid gap-1 sm:col-span-2"><Label>Body</Label><Textarea rows={3} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
        <div className="grid gap-1"><Label>Image URL</Label><Input value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} /></div>
        <div className="grid gap-1"><Label>CTA label</Label><Input value={f.cta_label} onChange={(e) => setF({ ...f, cta_label: e.target.value })} /></div>
        <div className="grid gap-1 sm:col-span-2"><Label>CTA link</Label><Input value={f.cta_href} onChange={(e) => setF({ ...f, cta_href: e.target.value })} /></div>
      </div>
      <Button size="sm" onClick={() => onSave({ title: f.title || null, subtitle: f.subtitle || null, body: f.body || null, image: f.image || null, cta_label: f.cta_label || null, cta_href: f.cta_href || null })}>
        <Save className="me-2 h-4 w-4" /> Save
      </Button>
    </div>
  );
}
