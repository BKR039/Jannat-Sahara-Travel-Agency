import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  Package as PackageIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader, AdminCard, EmptyState } from "@/components/admin/ui";
import { CATEGORIES, STATUSES, type PackageRow, type PackageCategory, type PackageStatus } from "@/components/admin/packages/model";

export const Route = createFileRoute("/admin/packages/")({
  component: PackagesAdminPage,
});

function PackagesAdminPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const list = useQuery({
    queryKey: ["admin-packages", { search, cat, status }] as const,
    queryFn: async () => {
      let q = supabase
        .from("packages")
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (cat !== "all") q = q.eq("category", cat as PackageCategory);
      if (status !== "all") q = q.eq("status", status as PackageStatus);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`title.ilike.${s},slug.ilike.${s},destination.ilike.${s},country.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as PackageRow[];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-packages"] });
    qc.invalidateQueries({ queryKey: ["packages"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
  }

  const duplicate = useMutation({
    mutationFn: async (pkg: PackageRow) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at, updated_at, ...copy } = pkg;
      const { error } = await supabase.from("packages").insert({
        ...copy,
        slug: `${copy.slug}-copy-${Math.random().toString(36).slice(2, 6)}`,
        title: `${copy.title} (copy)`,
        status: "draft",
        featured: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Package duplicated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFeatured = useMutation({
    mutationFn: async (p: PackageRow) => {
      const { error } = await supabase
        .from("packages")
        .update({ featured: !p.featured })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PackageStatus }) => {
      const { error } = await supabase.from("packages").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Package deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Packages"
        description="Umrah, Trips, Flights, and Visa services."
        actions={
          <Button asChild>
            <Link to="/admin/packages/$id" params={{ id: "new" }}>
              <Plus className="me-2 h-4 w-4" /> New package
            </Link>
          </Button>
        }
      />

      <AdminCard className="mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title, slug, destination…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Filter className="h-4 w-4 mt-2.5 text-muted-foreground" />
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AdminCard>

      <AdminCard>
        {list.isLoading ? (
          <p className="text-small text-muted-foreground">Loading…</p>
        ) : !list.data?.length ? (
          <EmptyState
            title="No packages yet"
            description="Create your first package to get started."
            icon={PackageIcon}
            action={
              <Button asChild size="sm">
                <Link to="/admin/packages/$id" params={{ id: "new" }}>
                  <Plus className="me-2 h-4 w-4" /> New package
                </Link>
              </Button>
            }
          />
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
                  <tr
                    key={p.id}
                    className="cursor-pointer border-b border-border/60 hover:bg-muted/30"
                    onClick={() => navigate({ to: "/admin/packages/$id", params: { id: p.id } })}
                  >
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
                      {p.total_seats ? (
                        <span className="text-muted-foreground">/{p.total_seats}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={p.status}
                        onValueChange={(v) =>
                          changeStatus.mutate({ id: p.id, status: v as PackageStatus })
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleFeatured.mutate(p)}
                        title="Toggle featured"
                        aria-label="Toggle featured"
                      >
                        <Star
                          className={`h-4 w-4 ${p.featured ? "fill-primary text-primary" : "text-muted-foreground"}`}
                        />
                      </button>
                    </td>
                    <td
                      className="px-4 sm:px-5 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" title="Edit" asChild>
                          <Link to="/admin/packages/$id" params={{ id: p.id }}>
                            <Edit3 className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Duplicate"
                          onClick={() => duplicate.mutate(p)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Archive"
                          onClick={() => changeStatus.mutate({ id: p.id, status: "archived" })}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete package?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove "{p.title}" permanently.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove.mutate(p.id)}>
                                Delete
                              </AlertDialogAction>
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
    </>
  );
}
