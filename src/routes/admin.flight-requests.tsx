import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, PlaneTakeoff, Trash2 } from "lucide-react";
import { deleteRequest, listRequests } from "@/lib/admin/command.functions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/ui";
import {
  Drawer,
  EmptyState,
  ErrorState,
  SearchInput,
  SkeletonRows,
  Panel,
  shortDate,
  useDebounced,
} from "@/components/admin/kit";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { cabinLabel } from "@/lib/flight-request.labels";
import type { CabinClass } from "@/lib/flight-request.schema";
import { matchesStageFilter, stageOf, type StageFilter } from "@/lib/admin/request-workflow";
import {
  RequestDetail,
  StageBadge,
  type UnifiedRequest,
} from "@/components/admin/requests/RequestDetail";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/flight-requests")({
  head: () => ({
    meta: [{ title: adminDocTitle("flightRequests") }],
  }),
  component: FlightRequestsPage,
});

/**
 * Flight requests.
 *
 * This screen and the unified inbox used to be two different products over one
 * table: the inbox opened a drawer, this page expanded a row into a second
 * form with its own status `<select>` carrying all six raw statuses, its own
 * reply box, its own "mark completed" button and an assignee field — six
 * competing controls where the job has one decision. It now shows the list and
 * hands the request to the same `RequestDetail` the inbox uses, so an operator
 * learns the workflow once. What is genuinely particular to this screen — the
 * CSV export and deleting a request — stays here.
 *
 * Reads and writes still go through the server functions: `flight_requests`
 * grants authenticated admins no SELECT under RLS, so a browser query would
 * return nothing and a browser delete would silently match no row.
 */

const STAGE_FILTERS: StageFilter[] = ["all", "open", "confirmed", "declined"];

function FlightRequestsPage() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<StageFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UnifiedRequest | null>(null);
  const debounced = useDebounced(search);

  const fetchRequests = useServerFn(listRequests);
  const list = useQuery({
    queryKey: ["admin-flight-requests"] as const,
    queryFn: async () => {
      const rows = (await fetchRequests()) as unknown as UnifiedRequest[];
      return rows
        .filter((r) => r.kind === "flight")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });

  const removeRequest = useServerFn(deleteRequest);
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await removeRequest({ data: { id, kind: "flight" as const } });
    },
    onSuccess: () => {
      toast.success(t("ops.flightRequests.toastDeleted"));
      qc.invalidateQueries({ queryKey: ["admin-flight-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
    },
    onError: () => toast.error(t("ops.flightRequests.toastDeleteFailed")),
  });

  const rows = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return (list.data ?? []).filter((r) => {
      if (!matchesStageFilter(stage, "flight", r.status)) return false;
      if (!q) return true;
      return [r.reference, r.name, r.phone, r.email, r.summary]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [list.data, debounced, stage]);

  const active = (list.data ?? []).find((r) => r.id === openId) ?? null;

  function exportCsv() {
    const headers = [
      "reference",
      "status",
      "name",
      "phone",
      "email",
      "from",
      "to",
      "tripType",
      "departure",
      "return",
      "adults",
      "children",
      "infants",
      "cabin",
      "assignedTo",
      "notes",
      "created",
    ].map((k) => t(`ops.flightRequests.csvHeaders.${k}`));
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
          r.detail["from_airport"],
          r.detail["to_airport"],
          r.detail["trip_type"],
          r.detail["departure_date"],
          r.detail["return_date"],
          r.detail["adults"],
          r.detail["children"],
          r.detail["infants"],
          r.detail["cabin_class"],
          r.detail["assigned_to"],
          r.detail["notes"],
          r.created_at,
        ]
          .map(esc)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `flight-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title={t("ops.flightRequests.title")}
        description={t("ops.flightRequests.description")}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <Download className="me-2 h-4 w-4" aria-hidden="true" />
            {t("ops.flightRequests.exportCsv")}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {STAGE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={stage === f}
              onClick={() => setStage(f)}
              className={cn(
                "h-9 rounded-full border px-3.5 text-caption font-semibold transition-colors max-md:h-11",
                stage === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {f === "all"
                ? t("ops.requests.filters.allStatuses")
                : f === "open"
                  ? t("ops.requests.filters.stageOpen")
                  : t(`ops.stages.state.${f}`)}
            </button>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("ops.flightRequests.searchPlaceholder")}
          className="sm:ms-auto sm:max-w-sm"
        />
      </div>

      <Panel className="mt-4" bodyClassName="p-0 sm:p-0">
        {list.isLoading ? (
          <div className="p-4">
            <SkeletonRows rows={5} />
          </div>
        ) : list.isError ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : !rows.length ? (
          <div className="p-4">
            <EmptyState title={t("ops.flightRequests.emptyTitle")} icon={PlaneTakeoff} />
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 sm:px-5">
                <button
                  type="button"
                  onClick={() => setOpenId(r.id)}
                  aria-label={t("ops.requests.openRequest", {
                    name: r.name,
                    reference: r.reference ?? "",
                  })}
                  className="-mx-2 flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-3 text-start transition-colors hover:bg-accent focus-visible:bg-accent"
                >
                  <div className="min-w-0 flex-1 basis-44">
                    <p className="flex items-center gap-2 truncate text-small font-medium">
                      <span className="truncate">{r.name}</span>
                      {r.reference && (
                        <span className="shrink-0 text-caption text-muted-foreground" dir="ltr">
                          {r.reference}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-caption text-muted-foreground">
                      {String(r.detail["from_airport"] ?? "")} →{" "}
                      {String(r.detail["to_airport"] ?? "")}
                    </p>
                  </div>

                  {r.departureDate && (
                    <span className="whitespace-nowrap text-caption text-muted-foreground">
                      {shortDate(r.departureDate)}
                    </span>
                  )}
                  {r.travellers ? (
                    <span className="whitespace-nowrap text-caption text-muted-foreground">
                      {r.travellers} {t("ops.flightRequests.paxSuffix")}
                    </span>
                  ) : null}
                  <span className="hidden whitespace-nowrap text-caption text-muted-foreground md:inline">
                    {cabinLabel(String(r.detail["cabin_class"] ?? "economy") as CabinClass)}
                  </span>

                  <StageBadge stage={stageOf("flight", r.status)} />
                </button>

                {/* Irreversible, so it asks first — and the icon button says
                    what it does for anyone not looking at the icon. */}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("ops.flightRequests.deleteAria")}
                  onClick={() => setConfirmDelete(r)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Drawer
        open={!!active}
        onClose={() => setOpenId(null)}
        title={active?.name ?? ""}
        description={active ? t("ops.requests.kinds.flight") : undefined}
      >
        {active && <RequestDetail key={active.id} row={active} />}
      </Drawer>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ops.flightRequests.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("ops.flightRequests.deleteBody", { reference: confirmDelete?.reference ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("ops.flightRequests.deleteCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = confirmDelete;
                setConfirmDelete(null);
                if (target) remove.mutate(target.id);
              }}
            >
              {t("ops.flightRequests.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
