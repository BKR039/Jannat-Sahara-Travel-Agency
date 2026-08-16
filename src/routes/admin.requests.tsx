import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, Phone, Mail, MessageSquare, Plane, CalendarCheck } from "lucide-react";
import { listRequests, updateRequest } from "@/lib/admin/command.functions";
import {
  Page,
  Panel,
  FilterTabs,
  SearchInput,
  StatusBadge,
  EmptyState,
  SkeletonRows,
  Avatar,
  Drawer,
  relativeDate,
  useDebounced,
} from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/requests")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Requests — Janat Sahara Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RequestsPage,
});

type Kind = "all" | "booking" | "flight" | "contact" | "custom_package";

const KIND_ICON = {
  booking: CalendarCheck,
  flight: Plane,
  contact: MessageSquare,
  custom_package: Sparkles,
} as const;

function RequestsPage() {
  const fetchRequests = useServerFn(listRequests);
  const saveRequest = useServerFn(updateRequest);
  const queryClient = useQueryClient();

  const [kind, setKind] = useState<Kind>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const debounced = useDebounced(search);

  const q = useQuery({
    queryKey: ["admin-requests"] as const,
    queryFn: () => fetchRequests(),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: saveRequest,
    onSuccess: () => {
      toast.success("Request updated");
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-open-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-command-center"] });
    },
    onError: () => toast.error("Could not update this request"),
  });

  const rows = q.data ?? [];

  const filtered = useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (!needle) return true;
      return [r.name, r.phone, r.email, r.reference, r.summary]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, kind, debounced]);

  const active = filtered.find((r) => r.id === openId) ?? null;

  return (
    <Page
      title="Requests"
      description="Every incoming booking, flight enquiry and message in one inbox."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterTabs
          value={kind}
          onChange={setKind}
          tabs={[
            { value: "all", label: "All", count: rows.length },
            { value: "booking", label: "Bookings", count: rows.filter((r) => r.kind === "booking").length },
            { value: "flight", label: "Flights", count: rows.filter((r) => r.kind === "flight").length },
            { value: "contact", label: "Messages", count: rows.filter((r) => r.kind === "contact").length },
            {
              value: "custom_package",
              label: "Custom Umrah",
              count: rows.filter((r) => r.kind === "custom_package").length,
            },
          ]}
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, phone, email or reference…"
          className="sm:ms-auto sm:max-w-sm"
        />
      </div>

      <Panel className="mt-4" bodyClassName="p-0 sm:p-0">
        {q.isLoading ? (
          <div className="p-4">
            <SkeletonRows rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No requests found"
              description="Nothing matches the current filters."
              icon={Inbox}
            />
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {filtered.map((r) => {
              const Icon = KIND_ICON[r.kind];
              return (
                <li key={`${r.kind}-${r.id}`}>
                  <button
                    type="button"
                    onClick={() => setOpenId(r.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-accent sm:px-5"
                  >
                    <Avatar name={r.name} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-small font-medium">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                        {r.name}
                        {r.reference && (
                          <span className="text-caption text-muted-foreground">{r.reference}</span>
                        )}
                      </p>
                      <p className="truncate text-caption text-muted-foreground">{r.summary}</p>
                    </div>
                    <div className="hidden text-caption text-muted-foreground sm:block">
                      {relativeDate(r.created_at)}
                    </div>
                    <StatusBadge status={r.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Drawer
        open={!!active}
        onClose={() => setOpenId(null)}
        title={active?.name ?? ""}
        description={active?.summary}
      >
        {active && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {active.phone && (
                <Button asChild size="sm" variant="outline">
                  <a href={`tel:${active.phone}`}>
                    <Phone className="me-2 h-4 w-4" /> {active.phone}
                  </a>
                </Button>
              )}
              {active.email && (
                <Button asChild size="sm" variant="outline">
                  <a href={`mailto:${active.email}`}>
                    <Mail className="me-2 h-4 w-4" /> Email
                  </a>
                </Button>
              )}
            </div>

            <div className="rounded-2xl border border-border-subtle bg-surface-sunken/40 p-4">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(active.detail)
                  .filter(([, v]) => v !== null && v !== "" && v !== undefined)
                  .slice(0, 18)
                  .map(([k, v]) => (
                    <div key={k} className="min-w-0">
                      <dt className="text-caption uppercase tracking-wide text-muted-foreground">
                        {k.replace(/_/g, " ")}
                      </dt>
                      <dd className="truncate text-small">{String(v)}</dd>
                    </div>
                  ))}
              </dl>
            </div>

            <div className="flex flex-wrap gap-2">
              {["contacted", "confirmed", "resolved", "cancelled"].map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={status === "cancelled" ? "outline" : "default"}
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      data: {
                        id: active.id,
                        kind: active.kind,
                        status,
                        markContacted: status === "contacted",
                      },
                    })
                  }
                >
                  Mark {status}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Drawer>
    </Page>
  );
}
