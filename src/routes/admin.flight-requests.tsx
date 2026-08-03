import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlaneTakeoff, Download, Trash2, CheckCircle2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, AdminCard, EmptyState } from "@/components/admin/ui";
import { FLIGHT_REQUEST_STATUSES, STATUS_LABELS, CABIN_LABELS_AR } from "@/lib/flight-request.schema";

export const Route = createFileRoute("/admin/flight-requests")({ component: FlightRequestsPage });

type Row = {
  id: string;
  reference: string;
  status: string;
  name: string;
  phone: string;
  email: string;
  from_airport: string;
  to_airport: string;
  trip_type: string;
  departure_date: string;
  return_date: string | null;
  adults: number;
  children: number;
  infants: number;
  cabin_class: string;
  notes: string | null;
  internal_notes: string | null;
  assigned_to: string | null;
  admin_reply: string | null;
  completed_at: string | null;
  created_at: string;
};

const statusTone: Record<string, string> = {
  new: "bg-accent text-primary",
  contacted: "bg-secondary-muted text-brand-gold",
  waiting: "bg-muted text-muted-foreground",
  quoted: "bg-secondary-muted text-brand-gold",
  confirmed: "bg-mint-muted text-brand-green",
  cancelled: "bg-destructive/10 text-destructive",
};

function FlightRequestsPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");

  const list = useQuery({
    queryKey: ["admin-flight-requests"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Row[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-flight-requests"] });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Row> }) => {
      const { error } = await supabase.from("flight_requests").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flight_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list.data ?? []).filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return `${r.reference} ${r.name} ${r.phone} ${r.email} ${r.from_airport} ${r.to_airport}`
        .toLowerCase()
        .includes(q);
    });
  }, [list.data, query, status]);

  function exportCsv() {
    const headers = [
      "Reference",
      "Status",
      "Name",
      "Phone",
      "Email",
      "From",
      "To",
      "Trip type",
      "Departure",
      "Return",
      "Adults",
      "Children",
      "Infants",
      "Cabin",
      "Assigned to",
      "Notes",
      "Created",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.reference,
          r.status,
          r.name,
          r.phone,
          r.email,
          r.from_airport,
          r.to_airport,
          r.trip_type,
          r.departure_date,
          r.return_date,
          r.adults,
          r.children,
          r.infants,
          r.cabin_class,
          r.assigned_to,
          r.notes,
          r.created_at,
        ]
          .map(esc)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `flight-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Flight requests"
        description="Inbound flight inquiries — prepare offers and contact the customer."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <Download className="me-2 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <AdminCard>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reference, name, phone, route…"
              className="h-10 w-full rounded-md border border-border-subtle bg-background ps-9 pe-3 text-small focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-md border border-border-subtle bg-background px-3 text-small focus:border-primary focus:outline-none"
          >
            <option value="all">All statuses</option>
            {FLIGHT_REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {list.isLoading ? (
          <p className="text-small text-muted-foreground">Loading…</p>
        ) : !rows.length ? (
          <EmptyState title="No flight requests yet" icon={PlaneTakeoff} />
        ) : (
          <div className="-mx-4 divide-y divide-border sm:-mx-5">
            {rows.map((r) => (
              <RequestRow
                key={r.id}
                row={r}
                onPatch={(patch) => update.mutate({ id: r.id, patch })}
                onDelete={() => remove.mutate(r.id)}
              />
            ))}
          </div>
        )}
      </AdminCard>
    </>
  );
}

function RequestRow({
  row,
  onPatch,
  onDelete,
}: {
  row: Row;
  onPatch: (patch: Partial<Row>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [assigned, setAssigned] = useState(row.assigned_to ?? "");
  const [reply, setReply] = useState(row.admin_reply ?? "");

  return (
    <div className={`px-4 py-4 sm:px-5 ${row.status === "new" ? "bg-primary/5" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-2.5 py-1 text-caption font-semibold ${statusTone[row.status] ?? "bg-muted"}`}
        >
          {STATUS_LABELS[row.status as keyof typeof STATUS_LABELS] ?? row.status}
        </span>
        <span dir="ltr" className="text-small font-bold text-foreground">
          {row.reference}
        </span>
        <span className="text-small text-muted-foreground">
          {row.from_airport} → {row.to_airport}
        </span>
        <span className="text-caption text-muted-foreground">
          {row.departure_date}
          {row.return_date ? ` – ${row.return_date}` : ""} ·{" "}
          {row.adults + row.children + row.infants} pax ·{" "}
          {CABIN_LABELS_AR[row.cabin_class as keyof typeof CABIN_LABELS_AR] ?? row.cabin_class}
        </span>
        <div className="ms-auto flex items-center gap-2">
          <select
            value={row.status}
            onChange={(e) => onPatch({ status: e.target.value })}
            className="h-9 rounded-md border border-border-subtle bg-background px-2 text-caption"
          >
            {FLIGHT_REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Details"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 rounded-lg border border-border-subtle bg-muted/40 p-4 md:grid-cols-2">
          <div className="space-y-1 text-small">
            <p className="font-semibold text-foreground">{row.name}</p>
            <p dir="ltr" className="text-muted-foreground">
              {row.phone}
            </p>
            <p dir="ltr" className="text-muted-foreground">
              {row.email}
            </p>
            <p className="text-caption text-muted-foreground">
              Created {new Date(row.created_at).toLocaleString()}
              {row.completed_at ? ` · Completed ${new Date(row.completed_at).toLocaleString()}` : ""}
            </p>
            {row.notes && (
              <p className="mt-2 whitespace-pre-wrap rounded-md bg-background p-3 text-small">
                {row.notes}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-caption font-semibold text-muted-foreground">
                Assigned employee
              </label>
              <input
                value={assigned}
                onChange={(e) => setAssigned(e.target.value)}
                onBlur={() => assigned !== (row.assigned_to ?? "") && onPatch({ assigned_to: assigned || null })}
                placeholder="Employee name"
                className="mt-1 h-10 w-full rounded-md border border-border-subtle bg-background px-3 text-small focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-caption font-semibold text-muted-foreground">
                Reply / offer sent to customer
              </label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder="Offer details, airline, fare…"
                className="mt-1 w-full rounded-md border border-border-subtle bg-background p-3 text-small focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => onPatch({ admin_reply: reply || null, status: row.status === "new" ? "contacted" : row.status })}
              >
                Save reply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onPatch({ status: "confirmed", completed_at: new Date().toISOString() })
                }
              >
                <CheckCircle2 className="me-1.5 h-4 w-4" /> Mark completed
              </Button>
              <a
                href={`https://wa.me/${row.phone.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-md border border-border-subtle px-3 text-caption font-semibold hover:border-primary hover:text-primary"
              >
                WhatsApp
              </a>
              <Button size="sm" variant="ghost" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
