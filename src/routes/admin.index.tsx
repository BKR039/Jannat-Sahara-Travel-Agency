import { useState } from "react";
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
  AlertTriangle,
  CheckCircle2,
  Activity,
  UserCheck,
  CreditCard,
  Send,
  Calendar,
  Layers,
  ChevronRight,
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
import type { DashboardPeriod } from "@/lib/admin/dashboard.server";
import {
  Page,
  Panel,
  KpiCard,
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

const PERIODS: Array<{ key: DashboardPeriod; labelKey: string }> = [
  { key: "today", labelKey: "shell.dashboard.periods.today" },
  { key: "last7Days", labelKey: "shell.dashboard.periods.last7Days" },
  { key: "thisMonth", labelKey: "shell.dashboard.periods.thisMonth" },
  { key: "lastMonth", labelKey: "shell.dashboard.periods.lastMonth" },
  { key: "all", labelKey: "shell.dashboard.periods.all" },
];

function CommandCenterPage() {
  const { t, i18n } = useTranslation("admin");
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>("thisMonth");
  const [analyticsMetric, setAnalyticsMetric] = useState<"revenue" | "bookings" | "requests">(
    "revenue",
  );

  const fetchData = useServerFn(getCommandCenter);
  const q = useQuery({
    queryKey: ["admin-command-center"] as const,
    queryFn: () => fetchData(),
    staleTime: 30_000,
  });

  const data = q.data;
  const currency = data?.kpis.currency ?? "TND";

  // Dynamic greeting based on time of day
  const now = new Date();
  const hour = now.getHours();
  const greetingKey =
    hour < 12
      ? "shell.greeting.morning"
      : hour < 17
        ? "shell.greeting.afternoon"
        : "shell.greeting.evening";

  const locale = i18n.language.startsWith("ar")
    ? "ar-TN"
    : i18n.language.startsWith("fr")
      ? "fr-FR"
      : "en-US";

  const formattedDate = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);

  // Selected period KPIs with fallback to current month
  const activeKpi = data?.periodKpis ? data.periodKpis[selectedPeriod] : null;

  // Analytics history checks
  const months = data?.months ?? [];
  const hasMetricData =
    analyticsMetric === "revenue"
      ? months.some((m) => Number(m.revenue) > 0)
      : analyticsMetric === "bookings"
        ? months.some((m) => Number(m.bookings) > 0)
        : months.some((m) => Number(m.requests ?? 0) > 0);

  const actionCount = data?.actionCenter?.length ?? 0;

  return (
    <Page
      title={t("shell.dashboard.title")}
      description={`${formattedDate} · ${t("shell.dashboard.description")}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/requests">
              <Inbox className="me-1.5 h-3.5 w-3.5" />
              {t("shell.dashboard.openRequests")}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/requests">
              <Plus className="me-1.5 h-3.5 w-3.5" />
              {t("shell.dashboard.newRequest")}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/admin/packages">
              <Plus className="me-1.5 h-3.5 w-3.5" />
              {t("shell.dashboard.newTrip")}
            </Link>
          </Button>
        </div>
      }
    >
      {/* ----------------- GLOBAL PERIOD SELECTOR BAR ----------------- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-subtle bg-card/60 p-2 sm:p-2.5 backdrop-blur-xs">
        <div className="flex items-center gap-2 px-2 text-caption font-semibold text-muted-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{t("shell.dashboard.periods.thisMonth")}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {PERIODS.map((period) => (
            <button
              key={period.key}
              type="button"
              onClick={() => setSelectedPeriod(period.key)}
              className={cn(
                "rounded-full px-3 py-1 text-caption font-medium transition-all",
                selectedPeriod === period.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-surface-sunken hover:text-foreground",
              )}
            >
              {t(period.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* ----------------- LEVEL 1: ACTION CENTER ("NEEDS ATTENTION") ----------------- */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-small font-bold text-foreground">
                {t("shell.dashboard.actionCenter.title")}
              </h2>
              <p className="text-caption text-muted-foreground">
                {t("shell.dashboard.actionCenter.subtitle")}
              </p>
            </div>
          </div>
          {actionCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-destructive/25 bg-destructive/10 px-2.5 py-0.5 text-caption font-semibold text-destructive">
              {t("shell.dashboard.actionCenter.badge", { count: actionCount })}
            </span>
          )}
        </div>

        {q.isLoading || !data ? (
          <SkeletonRows rows={2} />
        ) : q.isError ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : data.actionCenter.length === 0 ? (
          <div className="flex items-center gap-3.5 rounded-card border border-emerald-500/20 bg-emerald-500/5 p-4 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0 flex-1">
              <p className="text-small font-semibold">
                {t("shell.dashboard.actionCenter.emptyTitle")}
              </p>
              <p className="text-caption text-emerald-700/80 dark:text-emerald-400/80">
                {t("shell.dashboard.actionCenter.emptyDescription")}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {data.actionCenter.map((item) => {
              const isUrgent = item.severity === "critical";
              const isAttention = item.severity === "attention";
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col justify-between rounded-card border p-3.5 transition-colors sm:flex-row sm:items-center sm:gap-4",
                    isUrgent
                      ? "border-destructive/30 bg-destructive/5 hover:border-destructive/50"
                      : isAttention
                        ? "border-amber-500/25 bg-amber-500/5 hover:border-amber-500/45"
                        : "border-border-subtle bg-card hover:border-primary/40",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
                          isUrgent
                            ? "bg-destructive text-destructive-foreground"
                            : isAttention
                              ? "bg-amber-500 text-amber-950 dark:text-white"
                              : "bg-surface-sunken text-muted-foreground",
                        )}
                      >
                        {isUrgent
                          ? t("shell.dashboard.actionCenter.urgent")
                          : t("shell.dashboard.actionCenter.attention")}
                      </span>

                      {item.clientName && (
                        <span className="font-semibold text-small text-foreground">
                          {item.clientName}
                        </span>
                      )}

                      {item.reference && (
                        <span className="font-mono text-caption text-muted-foreground" dir="ltr">
                          {item.reference}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 truncate text-small font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="truncate text-caption text-muted-foreground">{item.subtitle}</p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 sm:mt-0 sm:flex-col sm:items-end sm:justify-center">
                    <span
                      className="flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap"
                      dir="ltr"
                    >
                      <Clock className="size-3" />
                      {relativeDate(item.date)}
                    </span>
                    <Button
                      asChild
                      size="xs"
                      variant={isUrgent ? "default" : "outline"}
                    >
                      <Link to={item.href as never}>
                        {item.actionLabel}
                        <ArrowRight className="size-3 rtl:rotate-180" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ----------------- LEVEL 1: CORE BUSINESS KPIS ----------------- */}
      <section className="mb-6">
        {q.isLoading || !data ? (
          <SkeletonKpis />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              label={t("shell.dashboard.kpi.revenue")}
              value={money(activeKpi?.revenue.value ?? data.kpis.revenue.value, currency)}
              delta={activeKpi?.revenue.delta ?? data.kpis.revenue.delta}
              icon={Wallet}
              hint={t("shell.dashboard.kpi.revenueHint")}
            />
            <KpiCard
              label={t("shell.dashboard.kpi.confirmedBookings")}
              value={activeKpi?.confirmedBookings.value ?? data.kpis.bookings.value}
              delta={activeKpi?.confirmedBookings.delta ?? data.kpis.bookings.delta}
              icon={CalendarCheck}
              hint={t("shell.dashboard.kpi.confirmedBookingsHint")}
            />
            <KpiCard
              label={t("shell.dashboard.kpi.newLeads")}
              value={activeKpi?.newLeads.value ?? data.kpis.customRequests.value}
              delta={activeKpi?.newLeads.delta ?? data.kpis.customRequests.delta}
              icon={Sparkles}
              hint={t("shell.dashboard.kpi.newLeadsHint")}
            />
            <KpiCard
              label={t("shell.dashboard.kpi.activeTravellers")}
              value={activeKpi?.activeTravellers.value ?? data.kpis.travellers.value}
              delta={activeKpi?.activeTravellers.delta ?? data.kpis.travellers.delta}
              icon={Users}
              hint={t("shell.dashboard.kpi.activeTravellersHint")}
            />
            <KpiCard
              label={t("shell.dashboard.kpi.pendingRequests")}
              value={activeKpi?.pendingRequests.value ?? data.kpis.customRequests.actionable}
              icon={Clock}
              hint={t("shell.dashboard.kpi.pendingRequestsHint")}
            />
          </div>
        )}
      </section>

      {/* ----------------- LEVEL 2: OPERATIONAL PIPELINE ----------------- */}
      <section className="mb-6">
        <Panel
          title={t("shell.dashboard.pipeline.title")}
          description={t("shell.dashboard.pipeline.subtitle")}
        >
          {q.isLoading || !data ? (
            <SkeletonRows rows={1} />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {data.pipeline.map((stage, idx) => (
                <Link
                  key={stage.key}
                  to={stage.href as never}
                  className="group relative flex flex-col justify-between rounded-xl border border-border-subtle bg-surface-sunken/30 p-3.5 transition-all hover:border-primary/50 hover:bg-card hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {t(stage.labelKey)}
                    </span>
                    {idx < data.pipeline.length - 1 && (
                      <ChevronRight className="hidden size-3.5 text-muted-foreground/40 group-hover:text-primary lg:block rtl:rotate-180" />
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-h3 font-bold tabular-nums text-foreground group-hover:text-primary">
                      {stage.count}
                    </span>
                    <span className="text-caption text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                      {t("shell.dashboard.actionCenter.openRequest")} →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </section>

      {/* ----------------- LEVEL 2: 2-COLUMN SPLIT (ACTIVITY & UPCOMING) ----------------- */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* RECENT ACTIVITY */}
        <Panel
          title={t("shell.dashboard.recentActivity.title")}
          description={t("shell.dashboard.recentActivity.subtitle")}
          actions={
            <Button asChild size="sm" variant="ghost">
              <Link to="/admin/requests">{t("shell.dashboard.customRequests.viewAll")}</Link>
            </Button>
          }
          bodyClassName="p-0 sm:p-0"
        >
          {q.isLoading || !data ? (
            <div className="p-4">
              <SkeletonRows rows={4} />
            </div>
          ) : data.recentActivity.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Activity}
                title={t("shell.dashboard.recentActivity.emptyTitle")}
                description={t("shell.dashboard.recentActivity.emptyDescription")}
              />
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {data.recentActivity.map((act) => (
                <li key={act.id}>
                  <Link
                    to={(act.href ?? "/admin") as never}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken/50 sm:px-5"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-sunken text-primary">
                      {act.action === "request_created" ? (
                        <Sparkles className="size-4" />
                      ) : act.action === "request_status_changed" ? (
                        <Activity className="size-4" />
                      ) : act.action === "request.delete" ? (
                        <AlertTriangle className="size-4 text-destructive" />
                      ) : (
                        <Layers className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-small font-medium text-foreground">
                        {act.description}
                      </p>
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        {act.actorLabel && (
                          <span className="font-semibold text-foreground/80">{act.actorLabel}</span>
                        )}
                        <span>·</span>
                        <span>{relativeDate(act.createdAt)}</span>
                      </div>
                    </div>
                    {act.status && <StatusBadge status={act.status} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* UPCOMING DEPARTURES & DEADLINES */}
        <Panel
          title={t("shell.dashboard.nextDepartures.title")}
          description={t("shell.dashboard.nextDepartures.description")}
          actions={
            <Button asChild size="sm" variant="ghost">
              <Link to="/admin/packages">{t("shell.dashboard.nextDepartures.allTrips")}</Link>
            </Button>
          }
          bodyClassName="p-4 sm:p-5"
        >
          {q.isLoading || !data ? (
            <SkeletonRows rows={3} />
          ) : data.upcomingTrips.length === 0 ? (
            <EmptyState icon={Plane} title={t("shell.dashboard.nextDepartures.emptyTitle")} />
          ) : (
            <ul className="space-y-4">
              {data.upcomingTrips.map((trip) => {
                const daysToGo = trip.departure_date
                  ? Math.ceil((new Date(trip.departure_date).getTime() - Date.now()) / 86_400_000)
                  : null;

                return (
                  <li
                    key={trip.id}
                    className="rounded-xl border border-border-subtle bg-surface-sunken/20 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-small font-semibold text-foreground">
                          {trip.title}
                        </p>
                        <p className="truncate text-caption text-muted-foreground">
                          {trip.destination ?? trip.category} · {shortDate(trip.departure_date)}
                        </p>
                      </div>
                      <div className="text-end">
                        <StatusBadge status={trip.status} />
                        {daysToGo != null && daysToGo > 0 && (
                          <p className="mt-1 text-[11px] font-medium text-primary">
                            {daysToGo}{" "}
                            {t("shell.dashboard.customRequests.departingIn", { count: daysToGo })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Occupancy booked={trip.booked} capacity={trip.capacity} className="mt-2.5" />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {/* ----------------- LEVEL 3: PERFORMANCE ANALYTICS ----------------- */}
      <Panel
        title={t("shell.dashboard.analytics.title")}
        description={t("shell.dashboard.analytics.subtitle")}
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-sunken p-1">
            <button
              type="button"
              onClick={() => setAnalyticsMetric("revenue")}
              className={cn(
                "rounded-md px-2.5 py-1 text-caption font-medium transition-all",
                analyticsMetric === "revenue"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("shell.dashboard.analytics.metricRevenue")}
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsMetric("bookings")}
              className={cn(
                "rounded-md px-2.5 py-1 text-caption font-medium transition-all",
                analyticsMetric === "bookings"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("shell.dashboard.analytics.metricBookings")}
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsMetric("requests")}
              className={cn(
                "rounded-md px-2.5 py-1 text-caption font-medium transition-all",
                analyticsMetric === "requests"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("shell.dashboard.analytics.metricRequests")}
            </button>
          </div>
        }
      >
        {hasMetricData ? (
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={months}>
                <defs>
                  <linearGradient id="chartMetricFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v) =>
                    analyticsMetric === "revenue" ? money(v, currency) : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-card)",
                    color: "var(--color-foreground)",
                  }}
                  formatter={(v: number) => [
                    analyticsMetric === "revenue" ? money(v, currency) : v,
                    analyticsMetric === "revenue"
                      ? t("shell.dashboard.analytics.metricRevenue")
                      : analyticsMetric === "bookings"
                        ? t("shell.dashboard.analytics.metricBookings")
                        : t("shell.dashboard.analytics.metricRequests"),
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey={analyticsMetric}
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#chartMetricFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={TrendingUp}
            title={
              analyticsMetric === "revenue"
                ? t("shell.dashboard.analytics.revenueEmptyTitle")
                : analyticsMetric === "bookings"
                  ? t("shell.dashboard.analytics.bookingsEmptyTitle")
                  : t("shell.dashboard.analytics.requestsEmptyTitle")
            }
            description={
              analyticsMetric === "revenue"
                ? t("shell.dashboard.analytics.revenueEmptyDescription")
                : undefined
            }
            action={
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/packages">
                  <Plus className="me-1.5 h-3.5 w-3.5" />
                  {t("shell.dashboard.newTrip")}
                </Link>
              </Button>
            }
          />
        )}
      </Panel>
    </Page>
  );
}
