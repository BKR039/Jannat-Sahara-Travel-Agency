import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Inbox,
  Plane,
  CalendarCheck,
  Sparkles,
  MessageSquare,
  Clock,
  X,
  Calendar,
  Users,
  Phone,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import i18n from "@/lib/i18n";
import { listRequests } from "@/lib/admin/command.functions";
import {
  Avatar,
  Drawer,
  EmptyState,
  ErrorState,
  FilterTabs,
  Page,
  Panel,
  SearchInput,
  SkeletonRows,
  money,
  relativeDate,
  shortDate,
  useDebounced,
} from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { adminDocTitle } from "@/lib/admin/doc-title";
import {
  daysToDeparture,
  byUrgency,
  urgencyLabelKey,
  urgencyOf,
} from "@/lib/admin/request-urgency";
import { matchesStageFilter, stageOf, type StageFilter } from "@/lib/admin/request-workflow";
import { cn } from "@/lib/utils";
import {
  RequestDetail,
  StageBadge,
  type UnifiedRequest,
} from "@/components/admin/requests/RequestDetail";
import { requestSummary } from "@/lib/admin/request-summary";

export const Route = createFileRoute("/admin/requests")({
  ssr: false,
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    request?: string;
    kind?: string;
    stage?: string;
    q?: string;
  } => ({
    ...(typeof s.request === "string" && s.request ? { request: s.request } : {}),
    ...(typeof s.kind === "string" && s.kind !== "all" ? { kind: s.kind } : {}),
    ...(typeof s.stage === "string" && s.stage !== "all" ? { stage: s.stage } : {}),
    ...(typeof s.q === "string" && s.q ? { q: s.q } : {}),
  }),
  head: () => ({
    meta: [{ title: adminDocTitle("requests") }, { name: "robots", content: "noindex, nofollow" }],
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

/** Canonical operational stage filters with live counts. */
const STAGE_FILTERS: StageFilter[] = ["all", "new", "processing", "confirmed", "declined"];

/** The price already agreed on a request, when it carries one. */
function requestPrice(row: UnifiedRequest): string | null {
  const amount = row.detail["offer_amount"] ?? row.detail["total_price"];
  if (amount == null || amount === "") return null;
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return money(n, String(row.detail["offer_currency"] ?? row.detail["currency"] ?? "TND"));
}

function RequestsPage() {
  const fetchRequests = useServerFn(listRequests);
  const { t } = useTranslation("admin");
  const isRtl = i18n.dir() === "rtl";
  const navigate = useNavigate();
  const { request: deepLinkId, kind: kindParam, stage: stageParam, q: qParam } = Route.useSearch();

  const kind = (kindParam as Kind) ?? "all";
  const stageFilter = (stageParam as StageFilter) ?? "all";
  const [search, setSearch] = useState(qParam ?? "");
  const [openId, setOpenId] = useState<string | null>(deepLinkId ?? null);
  const debounced = useDebounced(search);

  useEffect(() => {
    if (deepLinkId) setOpenId(deepLinkId);
  }, [deepLinkId]);

  const setFilter = (patch: { kind?: Kind; stage?: StageFilter; q?: string }) => {
    const next: Record<string, string> = {};
    const k = patch.kind ?? kind;
    const st = patch.stage ?? stageFilter;
    const query = patch.q ?? search;
    if (k !== "all") next["kind"] = k;
    if (st !== "all") next["stage"] = st;
    if (query.trim()) next["q"] = query.trim();
    navigate({ to: "/admin/requests", search: next as never, replace: true });
  };

  useEffect(() => {
    const current = qParam ?? "";
    if (debounced.trim() === current) return;
    setFilter({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const filtersActive = kind !== "all" || stageFilter !== "all" || !!search.trim();

  const clearFilters = () => {
    setSearch("");
    navigate({ to: "/admin/requests", search: {} as never, replace: true });
  };

  const q = useQuery({
    queryKey: ["admin-requests"] as const,
    queryFn: () => fetchRequests(),
    staleTime: 30_000,
  });

  const rows = useMemo(() => (q.data ?? []) as unknown as UnifiedRequest[], [q.data]);

  // Real live counts per stage
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: rows.length,
      new: 0,
      processing: 0,
      confirmed: 0,
      declined: 0,
    };
    rows.forEach((r) => {
      const st = stageOf(r.kind, r.status);
      if (st in counts) counts[st] = (counts[st] ?? 0) + 1;
    });
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    const matches = rows.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (!matchesStageFilter(stageFilter, r.kind, r.status)) return false;
      if (!needle) return true;
      return [r.name, r.phone, r.email, r.reference, r.summary]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });

    return matches.sort((a, b) =>
      byUrgency(
        { status: a.status, createdAt: a.created_at, departureDate: a.departureDate },
        { status: b.status, createdAt: b.created_at, departureDate: b.departureDate },
      ),
    );
  }, [rows, kind, stageFilter, debounced]);

  const active = rows.find((r) => r.id === openId) ?? null;

  return (
    <Page title={t("ops.requests.title")} description={t("ops.requests.description")}>
      {/* ----------------------------- Kind Tabs & Search ----------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterTabs
          value={kind}
          onChange={(k) => setFilter({ kind: k })}
          tabs={[
            { value: "all", label: t("ops.requests.tabs.all"), count: rows.length },
            {
              value: "custom_package",
              label: t("ops.requests.tabs.custom"),
              count: rows.filter((r) => r.kind === "custom_package").length,
            },
            {
              value: "flight",
              label: t("ops.requests.tabs.flights"),
              count: rows.filter((r) => r.kind === "flight").length,
            },
            {
              value: "booking",
              label: t("ops.requests.tabs.bookings"),
              count: rows.filter((r) => r.kind === "booking").length,
            },
            {
              value: "contact",
              label: t("ops.requests.tabs.messages"),
              count: rows.filter((r) => r.kind === "contact").length,
            },
          ]}
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("ops.requests.searchPlaceholder")}
          className="sm:ms-auto sm:max-w-sm"
        />
      </div>

      {/* ----------------------------- Operational Status Filter Pills ----------------------------- */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <span className="text-caption font-semibold text-muted-foreground">
          {t("ops.stages.title")}
        </span>
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
              aria-pressed={stageFilter === f}
              onClick={() => setFilter({ stage: f })}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-caption font-semibold transition-all max-md:h-11",
                stageFilter === f
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <span>{label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-micro tabular-nums font-bold",
                  stageFilter === f
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

        <span className="text-caption text-muted-foreground sm:ms-auto" aria-live="polite">
          {t("ops.requests.filters.showing", { count: filtered.length, total: rows.length })}
        </span>
      </div>

      {/* ----------------------------- Request Rows List ----------------------------- */}
      <Panel className="mt-4" bodyClassName="p-0 sm:p-0">
        {q.isLoading ? (
          <div className="p-4">
            <SkeletonRows rows={6} />
          </div>
        ) : q.isError ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Inbox}
              title={filtersActive ? t("ops.requests.noMatchTitle") : t("ops.requests.emptyTitle")}
              description={
                filtersActive
                  ? t("ops.requests.noMatchDescription")
                  : t("ops.requests.emptyDescription")
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
            {filtered.map((r) => {
              const Icon = KIND_ICON[r.kind];
              const urgency = urgencyOf({
                status: r.status,
                createdAt: r.created_at,
                departureDate: r.departureDate,
                lastContactAt: r.lastContactAt,
              });
              const days = daysToDeparture(r.departureDate);
              const price = requestPrice(r);
              const phoneDigits = (r.phone ?? "").replace(/\D/g, "");
              const stage = stageOf(r.kind, r.status);

              return (
                <li
                  key={`${r.kind}-${r.id}`}
                  className="group relative transition-colors duration-fast hover:bg-accent/40"
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                    {/* Customer Avatar */}
                    <Avatar name={r.name} className="h-11 w-11 text-small shrink-0" />

                    {/* Main Content Area */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Top Meta Line: Name, Kind, Ref, Status */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="font-bold text-foreground text-small sm:text-body">
                          {r.name}
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-caption font-semibold text-foreground border border-border/50">
                          <Icon className="h-3 w-3 text-primary" aria-hidden="true" />
                          <span>{t(`ops.requests.kinds.${r.kind}`)}</span>
                        </span>

                        {r.reference && (
                          <span
                            dir="ltr"
                            className="rounded bg-muted/60 px-2 py-0.5 font-mono text-caption text-muted-foreground border border-border/40 font-semibold"
                          >
                            {r.reference}
                          </span>
                        )}

                        <StageBadge stage={stage} className="ms-auto sm:ms-0" />

                        {urgency && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold",
                              urgency === "departure"
                                ? "bg-danger-muted text-destructive"
                                : "bg-warning-muted text-warning",
                            )}
                          >
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {urgency === "departure" && days != null
                              ? t("ops.requests.urgency.inDays", { count: days })
                              : t(urgencyLabelKey(urgency))}
                          </span>
                        )}
                      </div>

                      {/* Summary line */}
                      <p className="text-small font-medium text-foreground/90 line-clamp-1">
                        {requestSummary(
                          (r as unknown as { summaryParams: never }).summaryParams,
                          r.summary,
                          t,
                        )}
                      </p>

                      {/* Bottom Facts Row: Travel date, travelers, price, contact links, created time */}
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-caption text-muted-foreground">
                        {r.departureDate && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                            <span>{shortDate(r.departureDate)}</span>
                          </span>
                        )}

                        {r.travellers != null && r.travellers > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{r.travellers} مسافر</span>
                          </span>
                        )}

                        {price && (
                          <span className="font-semibold text-foreground bg-primary/10 px-2 py-0.5 rounded text-caption border border-primary/20">
                            {price}
                          </span>
                        )}

                        {/* Quick Contact Links */}
                        {r.phone && (
                          <div className="flex items-center gap-2 border-s border-border/60 ps-2.5">
                            <a
                              href={`tel:${r.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              dir="ltr"
                              title="اتصال هاتفي"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              <span className="font-mono">{r.phone}</span>
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

                        <span className="hidden sm:inline ms-auto text-caption text-muted-foreground">
                          {relativeDate(r.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Operational Action Button */}
                    <div className="shrink-0 pt-2 sm:pt-0 flex items-center justify-between sm:justify-end gap-2 border-t border-border/40 sm:border-t-0">
                      <span className="text-caption text-muted-foreground sm:hidden">
                        {relativeDate(r.created_at)}
                      </span>
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
        description={active ? t(`ops.requests.kinds.${active.kind}`) : undefined}
      >
        {active && <RequestDetail key={active.id} row={active} />}
      </Drawer>
    </Page>
  );
}
