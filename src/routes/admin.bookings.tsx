import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  Phone,
  MessageCircle,
  Mail as MailIcon,
  Download,
  Trash2,
  Filter,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PageHeader, AdminCard, EmptyState, StatusBadge } from "@/components/admin/ui";
import { getPassportSignedUrl } from "@/lib/admin/admin.functions";

export const Route = createFileRoute("/admin/bookings")({
  component: BookingsPage,
});

type BookingStatus = "new" | "pending" | "contacted" | "confirmed" | "cancelled" | "completed";
const STATUSES: BookingStatus[] = ["new", "pending", "contacted", "confirmed", "cancelled", "completed"];
const PAGE_SIZE = 15;

function formatPhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function BookingsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<null | Booking>(null);

  const bookings = useQuery({
    queryKey: ["admin-bookings", { search, status, category, page }] as const,
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (status !== "all") q = q.eq("status", status);
      if (category !== "all") q = q.eq("package_category", category);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`name.ilike.${s},phone.ilike.${s},email.ilike.${s},package_title.ilike.${s}`);
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data as Booking[], total: count ?? 0 };
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking deleted");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getSigned = useServerFn(getPassportSignedUrl);
  async function openPassport(path: string) {
    try {
      const r = await getSigned({ data: { path } });
      window.open(r.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open passport");
    }
  }

  const total = bookings.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function exportCsv() {
    const rows = bookings.data?.rows ?? [];
    if (rows.length === 0) return toast.error("No rows to export");
    const cols = [
      "id",
      "created_at",
      "name",
      "phone",
      "email",
      "people",
      "package_title",
      "package_category",
      "status",
      "notes",
    ];
    const csv =
      cols.join(",") +
      "\n" +
      rows
        .map((r) =>
          cols
            .map((c) => {
              const v = (r as unknown as Record<string, unknown>)[c];
              if (v == null) return "";
              const s = String(v).replace(/"/g, '""');
              return /[",\n]/.test(s) ? `"${s}"` : s;
            })
            .join(","),
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Manage reservation requests and their lifecycle."
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <FileText className="me-2 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <AdminCard className="mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="ps-9"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All services</SelectItem>
                <SelectItem value="umrah">Umrah</SelectItem>
                <SelectItem value="trip">Trips</SelectItem>
                <SelectItem value="flight">Flights</SelectItem>
                <SelectItem value="visa">Visa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        {bookings.isLoading ? (
          <p className="text-small text-muted-foreground">Loading…</p>
        ) : !bookings.data?.rows.length ? (
          <EmptyState title="No bookings match your filters" icon={Users} />
        ) : (
          <>
            <div className="overflow-x-auto -mx-4 sm:-mx-5">
              <table className="w-full text-small">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 sm:px-5 py-2 font-semibold">Customer</th>
                    <th className="px-4 py-2 font-semibold">Package</th>
                    <th className="px-4 py-2 font-semibold">People</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2 font-semibold">Created</th>
                    <th className="px-4 sm:px-5 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.data.rows.map((b) => (
                    <tr key={b.id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="px-4 sm:px-5 py-3">
                        <div className="font-medium">{b.name}</div>
                        <div className="text-caption text-muted-foreground">{b.phone}</div>
                        {b.email && <div className="text-caption text-muted-foreground">{b.email}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-small">{b.package_title ?? "General"}</div>
                        <div className="text-caption text-muted-foreground uppercase">{b.package_category ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">{b.people}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={b.status}
                          onValueChange={(v) => updateStatus.mutate({ id: b.id, status: v as BookingStatus })}
                        >
                          <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-caption text-muted-foreground whitespace-nowrap">
                        {new Date(b.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="icon" title="View" onClick={() => setDetail(b)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <a href={`tel:${formatPhone(b.phone)}`} title="Call" className="p-2 rounded-md hover:bg-accent">
                            <Phone className="h-4 w-4" />
                          </a>
                          <a
                            href={`https://wa.me/${formatPhone(b.phone).replace(/^\+/, "")}?text=${encodeURIComponent(
                              `Hello ${b.name}, regarding your booking ${b.package_title ? "for " + b.package_title : ""} with Janat Sahara Travel…`,
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            title="WhatsApp"
                            className="p-2 rounded-md hover:bg-accent"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                          {b.email && (
                            <a href={`mailto:${b.email}`} title="Email" className="p-2 rounded-md hover:bg-accent">
                              <MailIcon className="h-4 w-4" />
                            </a>
                          )}
                          {b.passport_path && (
                            <button
                              onClick={() => openPassport(b.passport_path!)}
                              title="Download passport (30 min signed URL)"
                              className="p-2 rounded-md hover:bg-accent"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button title="Delete" className="p-2 rounded-md hover:bg-destructive/10 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete booking?</AlertDialogTitle>
                                <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteBooking.mutate(b.id)}>Delete</AlertDialogAction>
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

            <div className="mt-4 flex items-center justify-between text-caption text-muted-foreground">
              <span>
                {total} total · page {page + 1} / {totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </AdminCard>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>{detail.package_title ?? "General inquiry"}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 text-small sm:grid-cols-2">
                <Field label="Phone" value={detail.phone} />
                <Field label="Email" value={detail.email ?? "—"} />
                <Field label="People" value={String(detail.people)} />
                <Field label="Service" value={detail.package_category ?? "—"} />
                <Field label="Status" value={<StatusBadge status={detail.status} />} />
                <Field label="Created" value={new Date(detail.created_at).toLocaleString()} />
                <div className="sm:col-span-2">
                  <p className="text-caption font-semibold text-muted-foreground uppercase">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap">{detail.notes ?? "—"}</p>
                </div>
                {detail.passport_path && (
                  <div className="sm:col-span-2">
                    <Button variant="outline" size="sm" onClick={() => openPassport(detail.passport_path!)}>
                      <Download className="me-2 h-4 w-4" /> Open passport (30 min link)
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-caption font-semibold text-muted-foreground uppercase">{label}</p>
      <div className="mt-1">{value}</div>
    </div>
  );
}

interface Booking {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  people: number;
  notes: string | null;
  package_id: string | null;
  package_title: string | null;
  package_category: string | null;
  passport_path: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}
