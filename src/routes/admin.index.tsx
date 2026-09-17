import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Wallet,
  CalendarCheck,
  Users,
  Plane,
  Inbox,
  MessageSquare,
  ArrowRight,
  Plus,
  Sparkles,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { getCommandCenter } from "@/lib/admin/command.functions";
import {
  Page,
  Panel,
  KpiCard,
  InsightCard,
  StatusBadge,
  Occupancy,
  EmptyState,
  ErrorState,
  SkeletonKpis,
  SkeletonRows,
  Avatar,
  money,
  shortDate,
  relativeDate,
} from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/admin/")({
  component: CommandCenterPage,
});

function CommandCenterPage() {
  const { t } = useTranslation("admin");
  const fetchData = useServerFn(getCommandCenter);
  const q = useQuery({
    queryKey: ["admin-command-center"] as const,
    queryFn: () => fetchData(),
    staleTime: 60_000,
  });

  const data = q.data;
  const currency = data?.kpis.currency ?? "TND";

  /* "Has history" means at least one month actually earned something — not
     that the array has twelve entries, which it always does. */
  const hasRevenueHistory = (data?.months ?? []).some((m) => Number(m.revenue) > 0);

  return (
    <Page
      title={t("shell.dashboard.title")}
      description={t("shell.dashboard.description")}
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/admin/requests">
              <Inbox className="me-2 h-4 w-4" /> {t("shell.dashboard.openRequests")}
            </Link>
          </Button>
          <Button asChild>
            <Link to="/admin/packages">
              <Plus className="me-2 h-4 w-4" /> {t("shell.dashboard.newTrip")}
            </Link>
          </Button>
        </>
      }
    >
      {/* What needs attention — promoted above the metrics: this is the
          only block that asks the operator to act today. */}
      <div className="mt-6">
        <h2 className="mb-3 text-small font-semibold text-foreground">
          {t("shell.dashboard.insights.title")}
        </h2>
        {q.isLoading || !data ? (
          <SkeletonRows rows={2} />
        ) : data.insights.length === 0 ? (
          <EmptyState
            title={t("shell.dashboard.insights.emptyTitle")}
            description={t("shell.dashboard.insights.emptyDescription")}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.insights.map((i) => (
              <InsightCard
                key={i.id}
                severity={i.severity}
                // Localized insights carry i18n keys + numbers; the older ones
                // still supply a pre-rendered sentence (see A-05).
                title={i.titleKey ? t(i.titleKey, i.params) : i.title}
                body={i.bodyKey ? t(i.bodyKey, i.params) : i.body}
                action={
                  i.href ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={i.href as never}>
                        {i.actionLabelKey
                          ? t(i.actionLabelKey)
                          : (i.actionLabel ?? t("shell.dashboard.insights.open"))}{" "}
                        <ArrowRight className="ms-2 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* KPIs */}
      {q.isLoading || !data ? (
        <SkeletonKpis />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label={t("shell.dashboard.kpi.revenue")}
            value={money(data.kpis.revenue.value, currency)}
            delta={data.kpis.revenue.delta}
            series={data.kpis.revenue.series}
            icon={Wallet}
            hint={t("shell.dashboard.kpi.revenueHint")}
          />
          <KpiCard
            label={t("shell.dashboard.kpi.bookings")}
            value={data.kpis.bookings.value}
            delta={data.kpis.bookings.delta}
            series={data.kpis.bookings.series}
            icon={CalendarCheck}
          />
          <KpiCard
            label={t("shell.dashboard.kpi.travellers")}
            value={data.kpis.travellers.value}
            delta={data.kpis.travellers.delta}
            icon={Users}
            hint={t("shell.dashboard.kpi.travellersHint")}
          />
          <KpiCard
            label={t("shell.dashboard.kpi.upcomingDepartures")}
            value={data.kpis.upcomingTrips.value}
            icon={Plane}
            hint={t("shell.dashboard.kpi.upcomingDeparturesHint")}
          />
          <KpiCard
            label={t("shell.dashboard.kpi.customRequests")}
            value={data.kpis.customRequests.value}
            delta={data.kpis.customRequests.delta}
            series={data.kpis.customRequests.series}
            icon={Sparkles}
            hint={t("shell.dashboard.kpi.customRequestsHint", {
              total: data.kpis.customRequests.total,
              actionable: data.kpis.customRequests.actionable,
            })}
          />
        </div>
      )}

      {/* Revenue trend + queue */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel
          title={t("shell.dashboard.revenueTrend.title")}
          description={t("shell.dashboard.revenueTrend.description")}
          className="lg:col-span-2"
        >
          {/*
           * A twelve-month revenue chart drawn from all-zero data rendered a
           * flat line across the largest block on the dashboard, which looks
           * like a broken chart and tells the operator nothing. Below a real
           * signal it is replaced with an empty state that says so.
           */}
          {hasRevenueHistory ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.months ?? []}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} width={48} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }}
                    formatter={(v: number) => money(v, currency)}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#revenueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title={t("shell.dashboard.revenueTrend.emptyTitle")}
              description={t("shell.dashboard.revenueTrend.emptyDescription")}
            />
          )}
        </Panel>

        <Panel
          title={t("shell.dashboard.workQueue.title")}
          description={t("shell.dashboard.workQueue.description")}
        >
          <ul className="space-y-2">
            <QueueRow
              to="/admin/requests"
              icon={Inbox}
              label={t("shell.dashboard.workQueue.newBookings")}
              value={data?.queue.newBookings}
            />
            <QueueRow
              to="/admin/requests"
              icon={Plane}
              label={t("shell.dashboard.workQueue.newRequests")}
              value={data?.queue.newRequests}
            />
            <QueueRow
              to="/admin/requests"
              icon={Sparkles}
              label={t("shell.dashboard.workQueue.customRequests")}
              value={data?.queue.customRequests}
            />
            <QueueRow
              to="/admin/messages"
              icon={MessageSquare}
              label={t("shell.dashboard.workQueue.unreadMessages")}
              value={data?.queue.unreadMessages}
            />
          </ul>
        </Panel>
      </div>

      {/* Custom Umrah requests needing a decision (Phase 7.2) */}
      <Panel
        className="mt-6"
        title={t("shell.dashboard.customRequests.title")}
        description={t("shell.dashboard.customRequests.description", {
          total: data?.kpis.customRequests.total ?? 0,
          actionable: data?.kpis.customRequests.actionable ?? 0,
        })}
        actions={
          <Button asChild size="sm" variant="ghost">
            <Link to="/admin/requests">{t("shell.dashboard.customRequests.viewAll")}</Link>
          </Button>
        }
      >
        {q.isLoading || !data ? (
          <SkeletonRows rows={3} />
        ) : q.isError ? (
          // Shared primitive, so an outage reads the same on every screen.
          <ErrorState onRetry={() => q.refetch()} />
        ) : data.customRequestQueue.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={t("shell.dashboard.customRequests.emptyTitle")}
            description={t("shell.dashboard.customRequests.emptyDescription")}
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {data.customRequestQueue.map((r) => (
              <li key={r.id}>
                <Link
                  to="/admin/requests"
                  search={{ request: r.id }}
                  className="flex flex-wrap items-center gap-3 py-3 hover:bg-accent/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-small font-medium">{r.customerName}</p>
                    <p className="truncate text-caption text-muted-foreground" dir="ltr">
                      {r.reference}
                    </p>
                  </div>

                  <span className="hidden whitespace-nowrap text-caption text-muted-foreground sm:inline">
                    {r.departureDate
                      ? shortDate(r.departureDate)
                      : t("shell.dashboard.customRequests.noDates")}
                  </span>

                  <span className="whitespace-nowrap text-caption tabular-nums text-muted-foreground">
                    {t("shell.dashboard.customRequests.travellers", { count: r.travellers })}
                  </span>

                  {r.urgency && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-caption font-semibold",
                        r.urgency === "departure"
                          ? "bg-danger-muted text-destructive"
                          : "bg-warning-muted text-warning",
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {r.urgency === "departure"
                        ? t("shell.dashboard.customRequests.departingIn", {
                            count: r.daysToDeparture ?? 0,
                          })
                        : t("shell.dashboard.customRequests.awaitingReply")}
                    </span>
                  )}

                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Departures + recent bookings */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel
          title={t("shell.dashboard.nextDepartures.title")}
          description={t("shell.dashboard.nextDepartures.description")}
          actions={
            <Button asChild size="sm" variant="ghost">
              <Link to="/admin/packages">{t("shell.dashboard.nextDepartures.allTrips")}</Link>
            </Button>
          }
        >
          {q.isLoading ? (
            <SkeletonRows rows={3} />
          ) : q.isError ? (
            <ErrorState onRetry={() => q.refetch()} />
          ) : (data?.upcomingTrips.length ?? 0) === 0 ? (
            <EmptyState title={t("shell.dashboard.nextDepartures.emptyTitle")} icon={Plane} />
          ) : (
            <ul className="space-y-4">
              {data!.upcomingTrips.map((t) => (
                <li key={t.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-small font-medium">{t.title}</p>
                      <p className="truncate text-caption text-muted-foreground">
                        {t.destination ?? t.category} · {shortDate(t.departure_date)}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <Occupancy booked={t.booked} capacity={t.capacity} className="mt-2" />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={t("shell.dashboard.latestBookings.title")}
          actions={
            <Button asChild size="sm" variant="ghost">
              <Link to="/admin/bookings">{t("shell.dashboard.latestBookings.allBookings")}</Link>
            </Button>
          }
          bodyClassName="p-0 sm:p-0"
        >
          {q.isLoading ? (
            <div className="p-4">
              <SkeletonRows rows={4} />
            </div>
          ) : q.isError ? (
            <div className="p-4">
              <ErrorState onRetry={() => q.refetch()} />
            </div>
          ) : (data?.recentBookings.length ?? 0) === 0 ? (
            <div className="p-4">
              <EmptyState
                title={t("shell.dashboard.latestBookings.emptyTitle")}
                icon={CalendarCheck}
              />
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {data!.recentBookings.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <Avatar name={b.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-small font-medium">{b.name}</p>
                    <p className="truncate text-caption text-muted-foreground">
                      {b.trip ?? t("shell.dashboard.latestBookings.generalEnquiry")} ·{" "}
                      {relativeDate(b.created_at)}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-small font-semibold tabular-nums">
                      {money(b.amount, b.currency)}
                    </p>
                    <StatusBadge status={b.status} className="mt-1" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </Page>
  );
}

function QueueRow({
  to,
  icon: Icon,
  label,
  value,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-sunken/40 px-3 py-3 transition-colors hover:border-primary/40 hover:bg-accent"
      >
        <span className="inline-flex items-center gap-2 text-small">
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </span>
        <span className="text-small font-bold tabular-nums">{value ?? "—"}</span>
      </Link>
    </li>
  );
}
