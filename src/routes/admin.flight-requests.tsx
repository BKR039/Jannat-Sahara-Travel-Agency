import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Download,
  PlaneTakeoff,
  Trash2,
  Calendar,
  Users,
  Phone,
  MessageCircle,
  Mail,
  ArrowLeft,
  ArrowRight,
  Clock,
  X,
} from "lucide-react";
import i18n from "@/lib/i18n";
import { deleteRequest, listRequests } from "@/lib/admin/command.functions";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  Drawer,
  EmptyState,
  ErrorState,
  SearchInput,
  SkeletonRows,
  Panel,
  PageHeading,
  shortDate,
  relativeDate,
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
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    request?: string;
    stage?: string;
    q?: string;
  } => ({
    ...(typeof s.request === "string" && s.request ? { request: s.request } : {}),
    ...(typeof s.stage === "string" && s.stage !== "all" ? { stage: s.stage } : {}),
    ...(typeof s.q === "string" && s.q ? { q: s.q } : {}),
  }),
  head: () => ({
    meta: [{ title: adminDocTitle("flightRequests") }],
  }),
  component: FlightRequestsPage,
});

const STAGE_FILTERS: StageFilter[] = ["all", "new", "processing", "confirmed", "declined"];

function FlightRequestsPage() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();
  const isRtl = i18n.dir() === "rtl";
  const navigate = useNavigate();
  const { request: deepLinkId, stage: stageParam, q: qParam } = Route.useSearch();

  const stage = (stageParam as StageFilter) ?? "all";
  const [search, setSearch] = useState(qParam ?? "");
  const [openId, setOpenId] = useState<string | null>(deepLinkId ?? null);
  const [confirmDelete, setConfirmDelete] = useState<UnifiedRequest | null>(null);
  const debounced = useDebounced(search);

  // Sync deep link
  useEffect(() => {
    if (deepLinkId) setOpenId(deepLinkId);
  }, [deepLinkId]);

  const setFilter = (patch: { stage?: StageFilter; q?: string }) => {
    const next: Record<string, string> = {};
    const st = patch.stage ?? stage;
    const query = patch.q ?? search;
    if (st !== "all") next["stage"] = st;
    if (query.trim()) next["q"] = query.trim();
    navigate({ to: "/admin/flight-requests", search: next as never, replace: true });
  };

  useEffect(() => {
    const current = qParam ?? "";
    if (debounced.trim() === current) return;
    setFilter({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

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
      qc.invalidateQueries({ queryKey: ["admin-command-center"] });
    },
    onError: () => toast.error(t("ops.flightRequests.toastDeleteFailed")),
  });

  const allFlightRows = useMemo(() => list.data ?? [], [list.data]);

  // Stage live counts
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allFlightRows.length,
      new: 0,
      processing: 0,
      confirmed: 0,
      declined: 0,
    };
    allFlightRows.forEach((r) => {
      const st = stageOf("flight", r.status);
      if (st in counts) counts[st] = (counts[st] ?? 0) + 1;
    });
    return counts;
  }, [allFlightRows]);

  const rows = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return allFlightRows.filter((r) => {
      if (!matchesStageFilter(stage, "flight", r.status)) return false;
      if (!q) return true;
      return [
        r.reference,
        r.name,
        r.phone,
        r.email,
        r.summary,
        r.detail["from_airport"],
        r.detail["to_airport"],
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [allFlightRows, debounced, stage]);

  const active = allFlightRows.find((r) => r.id === openId) ?? null;

  const filtersActive = stage !== "all" || !!search.trim();

  const clearFilters = () => {
    setSearch("");
    navigate({ to: "/admin/flight-requests", search: {} as never, replace: true });
  };

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
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `flight-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeading
        title={t("ops.flightRequests.title")}
        description={t("ops.flightRequests.description")}
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            <Download className="me-2 h-4 w-4" aria-hidden="true" />
            {t("ops.flightRequests.exportCsv")}
          </Button>
        }
      />

      {/* ----------------------------- Filter Pills & Search ----------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {STAGE_FILTERS.map((f) => {
            const count = stageCounts[f] ?? 0;
            const label =
              f === "all"
                ? t("ops.requests.filters.allStatuses")
                : f === "new"
                  ? "جديد"
                  : f === "processing"
                    ? "قيد المعالجة"
                    : t(`ops.stages.state.${f}`);

            return (
              <button
                key={f}
                type="button"
                aria-pressed={stage === f}
                onClick={() => setFilter({ stage: f })}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-caption font-semibold transition-all max-md:h-11",
                  stage === f
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <span>{label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-micro tabular-nums font-bold",
                    stage === f
                      ? "bg-primary-foreground/25 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {filtersActive && (
            <Button size="xs" variant="ghost" onClick={clearFilters}>
              <X className="me-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t("ops.requests.filters.clear")}
            </Button>
          )}
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("ops.flightRequests.searchPlaceholder")}
          className="sm:ms-auto sm:max-w-sm"
        />
      </div>

      {/* ----------------------------- Flight Requests Rows List ----------------------------- */}
      <Panel className="mt-4" bodyClassName="p-0 sm:p-0">
        {list.isLoading ? (
          <div className="p-4">
            <SkeletonRows rows={5} />
          </div>
        ) : list.isError ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : !rows.length ? (
          <div className="p-6">
            <EmptyState
              icon={PlaneTakeoff}
              title={
                filtersActive ? t("ops.requests.noMatchTitle") : t("ops.flightRequests.emptyTitle")
              }
              description={
                filtersActive
                  ? t("ops.requests.noMatchDescription")
                  : "لا توجد طلبات طيران واردة حالياً."
              }
              action={
                filtersActive ? (
                  <Button size="sm" variant="outline" onClick={clearFilters}>
                    {t("ops.requests.filters.clear")}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((r) => {
              const fromAirport = String(r.detail["from_airport"] ?? "");
              const toAirport = String(r.detail["to_airport"] ?? "");
              const tripType = String(r.detail["trip_type"] ?? "round_trip");
              const isRoundTrip = tripType === "round_trip";
              const cabin = String(r.detail["cabin_class"] ?? "economy") as CabinClass;
              const phoneDigits = (r.phone ?? "").replace(/\D/g, "");
              const stageBadgeState = stageOf("flight", r.status);
              const adults = Number(r.detail["adults"] ?? 1);
              const children = Number(r.detail["children"] ?? 0);
              const infants = Number(r.detail["infants"] ?? 0);
              const notes = String(r.detail["notes"] ?? "").trim();

              return (
                <li
                  key={r.id}
                  className="group relative transition-colors duration-fast hover:bg-accent/40"
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                    {/* Customer Avatar */}
                    <Avatar name={r.name} className="h-11 w-11 text-small shrink-0" />

                    {/* Main Content Area */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Top Meta Row: Customer Name, Ref, Status, Trip Type */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="font-bold text-foreground text-small sm:text-body">
                          {r.name}
                        </span>

                        {r.reference && (
                          <span
                            dir="ltr"
                            className="rounded bg-muted/60 px-2 py-0.5 font-mono text-caption text-muted-foreground border border-border/40 font-semibold"
                          >
                            {r.reference}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-caption font-semibold text-foreground border border-border/50">
                          <PlaneTakeoff className="h-3 w-3 text-primary" aria-hidden="true" />
                          <span>{isRoundTrip ? "ذهاب وعودة" : "ذهاب فقط"}</span>
                        </span>

                        <span className="rounded-full bg-muted/70 px-2 py-0.5 text-micro font-semibold text-muted-foreground">
                          {cabinLabel(cabin)}
                        </span>

                        <StageBadge stage={stageBadgeState} className="ms-auto sm:ms-0" />
                      </div>

                      {/* Prominent Journey Route (Preserves Exact Submitted Text) */}
                      <div className="flex items-center gap-2 text-small font-bold text-foreground">
                        <span className="truncate">{fromAirport || "—"}</span>
                        <span className="text-primary font-black shrink-0">→</span>
                        <span className="truncate">{toAirport || "—"}</span>
                      </div>

                      {/* Bottom Facts Row: Travel dates, passengers, phone, WhatsApp, email, timestamp */}
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-caption text-muted-foreground">
                        {r.departureDate && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                            <span>
                              {shortDate(r.departureDate)}
                              {isRoundTrip && r.detail["return_date"]
                                ? ` — ${shortDate(String(r.detail["return_date"]))}`
                                : ""}
                            </span>
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            {r.travellers ?? 1} مسافر
                            {(children > 0 || infants > 0) &&
                              ` (${adults} بالغ${children > 0 ? ` · ${children} طفل` : ""}${infants > 0 ? ` · ${infants} رضيع` : ""})`}
                          </span>
                        </span>

                        {/* Quick Contact Links */}
                        {r.phone && (
                          <div className="flex items-center gap-2 border-s border-border/60 ps-2.5">
                            <a
                              href={`tel:${r.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              dir="ltr"
                              title="اتصال هاتفي"
                              className="inline-flex items-center gap-1 text-primary hover:underline font-mono"
                            >
                              <Phone className="h-3 w-3" />
                              <span>{r.phone}</span>
                            </a>
                            {phoneDigits.length >= 6 && (
                              <a
                                href={`https://wa.me/${phoneDigits}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="مراسلة واتساب"
                                className="text-brand-green hover:opacity-80 inline-flex items-center"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        )}

                        {r.email && (
                          <a
                            href={`mailto:${r.email}`}
                            onClick={(e) => e.stopPropagation()}
                            dir="ltr"
                            title="إرسال بريد"
                            className="hidden md:inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[140px]">{r.email}</span>
                          </a>
                        )}

                        <span className="hidden sm:inline ms-auto text-caption text-muted-foreground">
                          {relativeDate(r.created_at)}
                        </span>
                      </div>

                      {/* Customer Note Snippet if present */}
                      {notes && (
                        <p className="text-caption text-muted-foreground italic line-clamp-1 bg-surface-sunken/40 px-2 py-1 rounded border border-border-subtle/50">
                          «{notes}»
                        </p>
                      )}
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="shrink-0 pt-2 sm:pt-0 flex items-center justify-between sm:justify-end gap-2 border-t border-border/40 sm:border-t-0">
                      <span className="text-caption text-muted-foreground sm:hidden">
                        {relativeDate(r.created_at)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOpenId(r.id)}
                          className="group-hover:border-primary/50 group-hover:bg-primary group-hover:text-primary-foreground font-semibold transition-colors"
                        >
                          <span>عرض الطلب</span>
                          {isRtl ? (
                            <ArrowLeft className="ms-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowRight className="ms-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </Button>

                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={t("ops.flightRequests.deleteAria")}
                          onClick={() => setConfirmDelete(r)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* ----------------------------- Operational Drawer ----------------------------- */}
      <Drawer
        open={!!active}
        onClose={() => setOpenId(null)}
        title={active?.name ?? ""}
        description={active ? t("ops.requests.kinds.flight") : undefined}
      >
        {active && <RequestDetail key={active.id} row={active} />}
      </Drawer>

      {/* ----------------------------- Delete Confirmation Dialog ----------------------------- */}
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
