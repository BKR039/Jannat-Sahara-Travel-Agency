import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, Plane, CalendarCheck, Sparkles, MessageSquare, Clock, X } from "lucide-react";
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
  // Filters live in the URL so returning from a request keeps the view, and a
  // filtered inbox can be shared or reloaded (`?request=` is the Phase 7.4
  // notification deep link and is preserved).
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

/**
 * Four buckets, not eleven statuses.
 *
 * The status filter used to be a `<select>` built from whichever raw statuses
 * happened to be present — "offer_preparing", "quoted", "waiting" — so the
 * operator had to know the lifecycle of four different tables to filter their
 * own inbox. These are the states the job actually has.
 */
const STAGE_FILTERS: StageFilter[] = ["all", "open", "confirmed", "declined"];

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
  const navigate = useNavigate();
  const { request: deepLinkId, kind: kindParam, stage: stageParam, q: qParam } = Route.useSearch();

  const kind = (kindParam as Kind) ?? "all";
  const stageFilter = (stageParam as StageFilter) ?? "all";
  const [search, setSearch] = useState(qParam ?? "");
  const [openId, setOpenId] = useState<string | null>(deepLinkId ?? null);
  const debounced = useDebounced(search);

  // Follow the deep link whenever it changes (clicking another notification).
  useEffect(() => {
    if (deepLinkId) setOpenId(deepLinkId);
  }, [deepLinkId]);

  /** Write one filter into the URL, dropping it when it returns to "all". */
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

  // The typed query is debounced before it reaches the URL, so each keystroke
  // does not become a history entry.
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

  // Stable identity so the memos below do not recompute on every render.
  const rows = useMemo(() => (q.data ?? []) as unknown as UnifiedRequest[], [q.data]);

  const filtered = useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    const matches = rows.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (!matchesStageFilter(stageFilter, r.kind, r.status)) return false;
      if (!needle) return true;
      // Phone and email stay searchable — an agent often has the customer on
      // the line — but neither is rendered in the list.
      return [r.name, r.phone, r.email, r.reference, r.summary]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });

    // Same ordering the Command Center queue uses: soonest departure, then
    // longest waiting. Rows with no trip keep their newest-first order.
    return matches.sort((a, b) =>
      byUrgency(
        { status: a.status, createdAt: a.created_at, departureDate: a.departureDate },
        { status: b.status, createdAt: b.created_at, departureDate: b.departureDate },
      ),
    );
  }, [rows, kind, stageFilter, debounced]);

  // Look up in the full set, not the filtered view: a deep-linked request must
  // open even when the current tab or search would hide it.
  const active = rows.find((r) => r.id === openId) ?? null;

  return (
    <Page title={t("ops.requests.title")} description={t("ops.requests.description")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterTabs
          value={kind}
          onChange={(k) => setFilter({ kind: k })}
          tabs={[
            { value: "all", label: t("ops.requests.tabs.all"), count: rows.length },
            {
              value: "booking",
              label: t("ops.requests.tabs.bookings"),
              count: rows.filter((r) => r.kind === "booking").length,
            },
            {
              value: "flight",
              label: t("ops.requests.tabs.flights"),
              count: rows.filter((r) => r.kind === "flight").length,
            },
            {
              value: "contact",
              label: t("ops.requests.tabs.messages"),
              count: rows.filter((r) => r.kind === "contact").length,
            },
            {
              value: "custom_package",
              label: t("ops.requests.tabs.custom"),
              count: rows.filter((r) => r.kind === "custom_package").length,
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

      {/* Four states the operator recognises, as buttons rather than a select. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-caption text-muted-foreground">{t("ops.stages.title")}</span>
        {STAGE_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={stageFilter === f}
            onClick={() => setFilter({ stage: f })}
            className={cn(
              "h-9 rounded-full border px-3.5 text-caption font-semibold transition-colors max-md:h-11",
              stageFilter === f
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

        {filtersActive && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            <X className="me-1.5 h-4 w-4" aria-hidden="true" />
            {t("ops.requests.filters.clear")}
          </Button>
        )}

        <span className="text-caption text-muted-foreground" aria-live="polite">
          {t("ops.requests.filters.showing", { count: filtered.length, total: rows.length })}
        </span>
      </div>

      <Panel className="mt-4" bodyClassName="p-0 sm:p-0">
        {q.isLoading ? (
          <div className="p-4">
            <SkeletonRows rows={6} />
          </div>
        ) : q.isError ? (
          // Shared primitive, so an outage reads the same on every screen.
          <ErrorState onRetry={() => q.refetch()} />
        ) : filtered.length === 0 ? (
          <div className="p-4">
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
          <ul className="divide-y divide-border-subtle">
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

              return (
                <li key={`${r.kind}-${r.id}`}>
                  {/*
                   * One row answers: who, what kind, which reference, when they
                   * travel, how long they have waited, what it costs and where
                   * it stands. The "next action" hint that used to sit at the
                   * end is gone — the three buttons inside the request say it
                   * better than a word at the edge of a list.
                   */}
                  <button
                    type="button"
                    onClick={() => setOpenId(r.id)}
                    aria-label={t("ops.requests.openRequest", {
                      name: r.name,
                      reference: r.reference ?? "",
                    })}
                    className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-start transition-colors hover:bg-accent focus-visible:bg-accent sm:px-5"
                  >
                    <Avatar name={r.name} />

                    <div className="min-w-0 flex-1 basis-48">
                      <p className="flex items-center gap-2 truncate text-small font-medium">
                        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="truncate">{r.name}</span>
                        {r.reference && (
                          <span className="shrink-0 text-caption text-muted-foreground" dir="ltr">
                            {r.reference}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-caption text-muted-foreground">
                        {requestSummary(
                          (r as unknown as { summaryParams: never }).summaryParams,
                          r.summary,
                          t,
                        )}
                      </p>
                    </div>

                    {/* Departure is the fact that decides priority, so it is
                        shown on every width rather than hidden on mobile. */}
                    {r.departureDate && (
                      <span className="whitespace-nowrap text-caption text-muted-foreground">
                        {shortDate(r.departureDate)}
                      </span>
                    )}

                    {price && (
                      <span className="whitespace-nowrap text-caption font-semibold text-foreground">
                        {price}
                      </span>
                    )}

                    {urgency && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-caption font-semibold",
                          urgency === "departure"
                            ? "bg-danger-muted text-destructive"
                            : "bg-warning-muted text-warning",
                        )}
                      >
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {urgency === "departure" && days != null
                          ? t("ops.requests.urgency.inDays", { count: days })
                          : t(urgencyLabelKey(urgency))}
                      </span>
                    )}

                    <span className="hidden whitespace-nowrap text-caption text-muted-foreground md:inline">
                      {relativeDate(r.created_at)}
                    </span>

                    <StageBadge stage={stageOf(r.kind, r.status)} />
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
        description={active ? t(`ops.requests.kinds.${active.kind}`) : undefined}
      >
        {active && <RequestDetail key={active.id} row={active} />}
      </Drawer>
    </Page>
  );
}
