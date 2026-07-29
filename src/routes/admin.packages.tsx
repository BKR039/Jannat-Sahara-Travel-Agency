import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  Star,
  Copy,
  Archive,
  Trash2,
  Edit3,
  Upload,
  X,
  Package as PackageIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader, AdminCard, EmptyState, StatusBadge } from "@/components/admin/ui";
import { uploadMedia } from "@/lib/admin/media";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/packages")({
  component: PackagesAdminPage,
});

type Package = Database["public"]["Tables"]["packages"]["Row"];
type Category = Database["public"]["Enums"]["package_category"];
type Status = Database["public"]["Enums"]["package_status"];

const CATEGORIES: Category[] = ["umrah", "trip", "flight", "visa"];
const STATUSES: Status[] = ["draft", "published", "archived", "sold_out"];

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function PackagesAdminPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [editing, setEditing] = useState<Package | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useQuery({
    queryKey: ["admin-packages", { search, cat, status }] as const,
    queryFn: async () => {
      let q = supabase.from("packages").select("*").order("sort_order").order("created_at", { ascending: false });
      if (cat !== "all") q = q.eq("category", cat as Category);
      if (status !== "all") q = q.eq("status", status as Status);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`title.ilike.${s},slug.ilike.${s},destination.ilike.${s},country.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Package[];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-packages"] });
    qc.invalidateQueries({ queryKey: ["packages"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
  }

  const duplicate = useMutation({
    mutationFn: async (pkg: Package) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at, updated_at, ...copy } = pkg;
      const newSlug = `${copy.slug}-copy-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase.from("packages").insert({
        ...copy,
        slug: newSlug,
        title: `${copy.title} (copy)`,
        status: "draft",
        featured: false,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Package duplicated"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFeatured = useMutation({
    mutationFn: async (p: Package) => {
      const { error } = await supabase.from("packages").update({ featured: !p.featured }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("packages").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Package deleted"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Packages"
        description="Umrah, Trips, Flights, and Visa services."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="me-2 h-4 w-4" /> New package
          </Button>
        }
      />

      <AdminCard className="mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search title, slug, destination…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
          </div>
          <Filter className="h-4 w-4 mt-2.5 text-muted-foreground" />
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </AdminCard>

      <AdminCard>
        {list.isLoading ? (
          <p className="text-small text-muted-foreground">Loading…</p>
        ) : !list.data?.length ? (
          <EmptyState title="No packages yet" description="Create your first package to get started." icon={PackageIcon} />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-small">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 sm:px-5 py-2 font-semibold">Title</th>
                  <th className="px-4 py-2 font-semibold">Category</th>
                  <th className="px-4 py-2 font-semibold">Destination</th>
                  <th className="px-4 py-2 font-semibold">Price</th>
                  <th className="px-4 py-2 font-semibold">Seats</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Featured</th>
                  <th className="px-4 sm:px-5 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="px-4 sm:px-5 py-3">
                      <div className="font-medium">{p.title}</div>
                      <div className="text-caption text-muted-foreground">/{p.slug}</div>
                    </td>
                    <td className="px-4 py-3 uppercase text-caption">{p.category}</td>
                    <td className="px-4 py-3">{p.destination ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {p.price} {p.currency}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {p.seats ?? "—"}
                      {p.total_seats ? <span className="text-muted-foreground">/{p.total_seats}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <Select value={p.status} onValueChange={(v) => changeStatus.mutate({ id: p.id, status: v as Status })}>
                        <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleFeatured.mutate(p)} title="Toggle featured">
                        <Star className={`h-4 w-4 ${p.featured ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      </button>
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" title="Edit" onClick={() => setEditing(p)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Duplicate" onClick={() => duplicate.mutate(p)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Archive" onClick={() => changeStatus.mutate({ id: p.id, status: "archived" })}>
                          <Archive className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-destructive" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete package?</AlertDialogTitle>
                              <AlertDialogDescription>This will remove "{p.title}" permanently.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove.mutate(p.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {(editing || creating) && (
        <PackageEditor
          initial={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { invalidate(); setEditing(null); setCreating(false); }}
        />
      )}
    </>
  );
}

type PackageFormState = {
  title: string;
  slug: string;
  category: Category;
  status: Status;
  country: string;
  city: string;
  destination: string;
  short_description: string;
  description: string;
  duration: string;
  departure_date: string;
  return_date: string;
  hotel: string;
  hotel_rating: string;
  airline: string;
  transport: string;
  meeting_point: string;
  price: string;
  discount_price: string;
  currency: string;
  seats: string;
  total_seats: string;
  cover: string;
  brochure_pdf: string;
  gallery: string; // one URL per line
  included: string; // one per line
  excluded: string;
  required_documents: string;
  timeline: string; // "Day / Title / Description" per line separated by ;
  featured: boolean;
  sort_order: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string; // comma separated
};

function toForm(p: Package | null): PackageFormState {
  return {
    title: p?.title ?? "",
    slug: p?.slug ?? "",
    category: (p?.category ?? "umrah") as Category,
    status: (p?.status ?? "draft") as Status,
    country: p?.country ?? "",
    city: p?.city ?? "",
    destination: p?.destination ?? "",
    short_description: p?.short_description ?? "",
    description: p?.description ?? "",
    duration: p?.duration ?? "",
    departure_date: p?.departure_date ?? "",
    return_date: p?.return_date ?? "",
    hotel: p?.hotel ?? "",
    hotel_rating: p?.hotel_rating != null ? String(p.hotel_rating) : "",
    airline: p?.airline ?? "",
    transport: p?.transport ?? "",
    meeting_point: p?.meeting_point ?? "",
    price: p?.price != null ? String(p.price) : "0",
    discount_price: p?.discount_price != null ? String(p.discount_price) : "",
    currency: p?.currency ?? "TND",
    seats: p?.seats != null ? String(p.seats) : "",
    total_seats: p?.total_seats != null ? String(p.total_seats) : "",
    cover: p?.cover ?? "",
    brochure_pdf: p?.brochure_pdf ?? "",
    gallery: Array.isArray(p?.gallery) ? (p!.gallery as string[]).join("\n") : "",
    included: Array.isArray(p?.included) ? (p!.included as string[]).join("\n") : "",
    excluded: Array.isArray(p?.excluded) ? (p!.excluded as string[]).join("\n") : "",
    required_documents: Array.isArray(p?.required_documents) ? (p!.required_documents as string[]).join("\n") : "",
    timeline: Array.isArray(p?.timeline)
      ? (p!.timeline as Array<{ day?: string; title?: string; description?: string }>)
          .map((t) => `${t.day ?? ""} | ${t.title ?? ""} | ${t.description ?? ""}`)
          .join("\n")
      : "",
    featured: p?.featured ?? false,
    sort_order: p?.sort_order != null ? String(p.sort_order) : "0",
    seo_title: p?.seo_title ?? "",
    seo_description: p?.seo_description ?? "",
    seo_keywords: Array.isArray(p?.seo_keywords) ? (p!.seo_keywords as string[]).join(", ") : "",
  };
}

function parseLines(s: string): string[] {
  return s.split("\n").map((l) => l.trim()).filter(Boolean);
}

function PackageEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Package | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PackageFormState>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  function update<K extends keyof PackageFormState>(key: K, value: PackageFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadMedia(file, "packages");
      update("cover", url);
      toast.success("Cover uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function handleBrochureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadMedia(file, "packages/brochures");
      update("brochure_pdf", url);
      toast.success("Brochure uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const uploaded: string[] = [];
    for (const f of Array.from(files)) {
      try {
        uploaded.push(await uploadMedia(f, "packages/gallery"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    }
    if (uploaded.length) {
      update("gallery", [form.gallery.trim(), ...uploaded].filter(Boolean).join("\n"));
      toast.success(`${uploaded.length} image(s) uploaded`);
    }
  }

  async function save() {
    if (!form.title.trim()) return toast.error("Title required");
    if (!form.slug.trim()) return toast.error("Slug required");
    const priceN = Number(form.price);
    if (Number.isNaN(priceN) || priceN < 0) return toast.error("Price must be a number");

    const timeline = parseLines(form.timeline).map((l) => {
      const [day, title, description] = l.split("|").map((s) => s.trim());
      return { day: day ?? "", title: title ?? "", description: description ?? "" };
    });

    const payload = {
      title: form.title.trim(),
      slug: slugify(form.slug || form.title),
      category: form.category,
      status: form.status,
      country: form.country.trim() || null,
      city: form.city.trim() || null,
      destination: form.destination.trim() || null,
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      duration: form.duration.trim() || null,
      departure_date: form.departure_date || null,
      return_date: form.return_date || null,
      hotel: form.hotel.trim() || null,
      hotel_rating: form.hotel_rating ? Number(form.hotel_rating) : null,
      airline: form.airline.trim() || null,
      transport: form.transport.trim() || null,
      meeting_point: form.meeting_point.trim() || null,
      price: priceN,
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      currency: form.currency.trim() || "TND",
      seats: form.seats ? Number(form.seats) : null,
      total_seats: form.total_seats ? Number(form.total_seats) : null,
      cover: form.cover.trim() || null,
      brochure_pdf: form.brochure_pdf.trim() || null,
      gallery: parseLines(form.gallery),
      included: parseLines(form.included),
      excluded: parseLines(form.excluded),
      required_documents: parseLines(form.required_documents),
      timeline,
      featured: form.featured,
      sort_order: form.sort_order ? Number(form.sort_order) : 0,
      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
      seo_keywords: form.seo_keywords
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    setSaving(true);
    try {
      if (isEdit && initial) {
        const { error } = await supabase.from("packages").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success("Package updated");
      } else {
        const { error } = await supabase.from("packages").insert(payload);
        if (error) throw error;
        toast.success("Package created");
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
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit package" : "New package"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Title *"><Input value={form.title} onChange={(e) => update("title", e.target.value)} /></FormField>
          <FormField label="Slug *"><Input value={form.slug} onChange={(e) => update("slug", e.target.value)} onBlur={() => update("slug", slugify(form.slug))} /></FormField>

          <FormField label="Category *">
            <Select value={form.category} onValueChange={(v) => update("category", v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onValueChange={(v) => update("status", v as Status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Country"><Input value={form.country} onChange={(e) => update("country", e.target.value)} /></FormField>
          <FormField label="City"><Input value={form.city} onChange={(e) => update("city", e.target.value)} /></FormField>
          <FormField label="Destination" className="sm:col-span-2"><Input value={form.destination} onChange={(e) => update("destination", e.target.value)} /></FormField>

          <FormField label="Short description" className="sm:col-span-2"><Textarea rows={2} value={form.short_description} onChange={(e) => update("short_description", e.target.value)} /></FormField>
          <FormField label="Full description" className="sm:col-span-2"><Textarea rows={5} value={form.description} onChange={(e) => update("description", e.target.value)} /></FormField>

          <FormField label="Duration"><Input placeholder="e.g., 10 days" value={form.duration} onChange={(e) => update("duration", e.target.value)} /></FormField>
          <FormField label="Departure date"><Input type="date" value={form.departure_date} onChange={(e) => update("departure_date", e.target.value)} /></FormField>
          <FormField label="Return date"><Input type="date" value={form.return_date} onChange={(e) => update("return_date", e.target.value)} /></FormField>
          <FormField label="Meeting point"><Input value={form.meeting_point} onChange={(e) => update("meeting_point", e.target.value)} /></FormField>

          <FormField label="Hotel"><Input value={form.hotel} onChange={(e) => update("hotel", e.target.value)} /></FormField>
          <FormField label="Hotel rating (1-5)"><Input type="number" min={1} max={5} value={form.hotel_rating} onChange={(e) => update("hotel_rating", e.target.value)} /></FormField>
          <FormField label="Airline"><Input value={form.airline} onChange={(e) => update("airline", e.target.value)} /></FormField>
          <FormField label="Transport"><Input value={form.transport} onChange={(e) => update("transport", e.target.value)} /></FormField>

          <FormField label="Price *"><Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} /></FormField>
          <FormField label="Discounted price"><Input type="number" min={0} step="0.01" value={form.discount_price} onChange={(e) => update("discount_price", e.target.value)} /></FormField>
          <FormField label="Currency"><Input value={form.currency} onChange={(e) => update("currency", e.target.value)} /></FormField>
          <FormField label="Sort order"><Input type="number" value={form.sort_order} onChange={(e) => update("sort_order", e.target.value)} /></FormField>

          <FormField label="Available seats"><Input type="number" min={0} value={form.seats} onChange={(e) => update("seats", e.target.value)} /></FormField>
          <FormField label="Total seats"><Input type="number" min={0} value={form.total_seats} onChange={(e) => update("total_seats", e.target.value)} /></FormField>

          <FormField label="Cover image URL" className="sm:col-span-2">
            <div className="flex gap-2">
              <Input value={form.cover} onChange={(e) => update("cover", e.target.value)} placeholder="https://…" />
              <label className="inline-flex items-center gap-1 rounded-md border border-input px-3 text-small cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4" />
                <input type="file" accept="image/*" className="sr-only" onChange={handleCoverUpload} />
              </label>
            </div>
            {form.cover && <img src={form.cover} alt="cover" className="mt-2 h-24 rounded-md object-cover" />}
          </FormField>

          <FormField label="Brochure PDF" className="sm:col-span-2">
            <div className="flex gap-2">
              <Input value={form.brochure_pdf} onChange={(e) => update("brochure_pdf", e.target.value)} placeholder="https://…/brochure.pdf" />
              <label className="inline-flex items-center gap-1 rounded-md border border-input px-3 text-small cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4" />
                <input type="file" accept="application/pdf" className="sr-only" onChange={handleBrochureUpload} />
              </label>
            </div>
          </FormField>

          <FormField label="Gallery URLs (one per line)" className="sm:col-span-2">
            <Textarea rows={3} value={form.gallery} onChange={(e) => update("gallery", e.target.value)} />
            <label className="mt-2 inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-small cursor-pointer hover:bg-accent">
              <Upload className="h-4 w-4" /> Upload images
              <input type="file" accept="image/*" multiple className="sr-only" onChange={handleGalleryUpload} />
            </label>
          </FormField>

          <FormField label="Includes (one per line)"><Textarea rows={4} value={form.included} onChange={(e) => update("included", e.target.value)} /></FormField>
          <FormField label="Excludes (one per line)"><Textarea rows={4} value={form.excluded} onChange={(e) => update("excluded", e.target.value)} /></FormField>
          <FormField label="Required documents (one per line)" className="sm:col-span-2">
            <Textarea rows={3} value={form.required_documents} onChange={(e) => update("required_documents", e.target.value)} />
          </FormField>

          <FormField label="Itinerary (Day | Title | Description — one per line)" className="sm:col-span-2">
            <Textarea rows={4} value={form.timeline} onChange={(e) => update("timeline", e.target.value)} placeholder="Day 1 | Arrival | Airport welcome" />
          </FormField>

          <FormField label="SEO title"><Input value={form.seo_title} onChange={(e) => update("seo_title", e.target.value)} /></FormField>
          <FormField label="SEO description"><Input value={form.seo_description} onChange={(e) => update("seo_description", e.target.value)} /></FormField>
          <FormField label="SEO keywords (comma separated)" className="sm:col-span-2"><Input value={form.seo_keywords} onChange={(e) => update("seo_keywords", e.target.value)} /></FormField>

          <div className="sm:col-span-2 flex items-center gap-3">
            <Switch checked={form.featured} onCheckedChange={(v) => update("featured", v)} id="featured" />
            <Label htmlFor="featured">Featured on homepage</Label>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-1 ${className}`}>
      <Label className="text-caption font-semibold">{label}</Label>
      {children}
    </div>
  );
}
