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
  SkeletonKpis,
  SkeletonRows,
  Avatar,
  money,
  shortDate,
  relativeDate,
} from "@/components/admin/kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/")({
  component: CommandCenterPage,
});

function CommandCenterPage() {
  const fetchData = useServerFn(getCommandCenter);
  const q = useQuery({
    queryKey: ["admin-command-center"] as const,
    queryFn: () => fetchData(),
    staleTime: 60_000,
  });

  const data = q.data;
  const currency = data?.kpis.currency ?? "TND";

  return (
    <Page
      title="Command center"
      description="Everything that needs your attention today, in one place."
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/admin/requests">
              <Inbox className="me-2 h-4 w-4" /> Open requests
            </Link>
          </Button>
          <Button asChild>
            <Link to="/admin/packages">
              <Plus className="me-2 h-4 w-4" /> New trip
            </Link>
          </Button>
        </>
      }
    >
      {/* KPIs */}
      {q.isLoading || !data ? (
        <SkeletonKpis />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Revenue this month"
            value={money(data.kpis.revenue.value, currency)}
            delta={data.kpis.revenue.delta}
            series={data.kpis.revenue.series}
            icon={Wallet}
            tone="primary"
            hint="Active bookings created this month"
          />
          <KpiCard
            label="Bookings this month"
            value={data.kpis.bookings.value}
            delta={data.kpis.bookings.delta}
            series={data.kpis.bookings.series}
            icon={CalendarCheck}
            tone="green"
          />
          <KpiCard
            label="Travellers"
            value={data.kpis.travellers.value}
            delta={data.kpis.travellers.delta}
            icon={Users}
            tone="gold"
            hint="Adults, children and infants"
          />
          <KpiCard
            label="Upcoming departures"
            value={data.kpis.upcomingTrips.value}
            icon={Plane}
            tone="muted"
            hint="Trips with a future departure date"
          />
        </div>
      )}

      {/* Insights */}
      <div className="mt-6">
        <h2 className="mb-3 text-small font-semibold text-foreground">Smart insights</h2>
        {q.isLoading || !data ? (
          <SkeletonRows rows={2} />
        ) : data.insights.length === 0 ? (
          <EmptyState
            title="Nothing needs attention"
            description="No capacity risks, unanswered requests or unusual trends were detected."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.insights.map((i) => (
              <InsightCard
                key={i.id}
                severity={i.severity}
                title={i.title}
                body={i.body}
                action={
                  i.href ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={i.href}>
                        {i.actionLabel ?? "Open"} <ArrowRight className="ms-2 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Revenue trend + queue */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel
          title="Revenue trend"
          description="Last 12 months of booking value"
          className="lg:col-span-2"
        >
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
        </Panel>

        <Panel title="Work queue" description="Waiting for a first answer">
          <ul className="space-y-2">
            <QueueRow
              to="/admin/requests"
              icon={Inbox}
              label="New booking requests"
              value={data?.queue.newBookings}
            />
            <QueueRow
              to="/admin/requests"
              icon={Plane}
              label="New flight requests"
              value={data?.queue.newRequests}
            />
            <QueueRow
              to="/admin/messages"
              icon={MessageSquare}
              label="Unread messages"
              value={data?.queue.unreadMessages}
            />
          </ul>
        </Panel>
      </div>

      {/* Departures + recent bookings */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Next departures"
          description="Occupancy of upcoming trips"
          actions={
            <Button asChild size="sm" variant="ghost">
              <Link to="/admin/packages">All trips</Link>
            </Button>
          }
        >
          {q.isLoading ? (
            <SkeletonRows rows={3} />
          ) : (data?.upcomingTrips.length ?? 0) === 0 ? (
            <EmptyState title="No upcoming departures" icon={Plane} />
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
          title="Latest bookings"
          actions={
            <Button asChild size="sm" variant="ghost">
              <Link to="/admin/bookings">All bookings</Link>
            </Button>
          }
          bodyClassName="p-0 sm:p-0"
        >
          {q.isLoading ? (
            <div className="p-4">
              <SkeletonRows rows={4} />
            </div>
          ) : (data?.recentBookings.length ?? 0) === 0 ? (
            <div className="p-4">
              <EmptyState title="No bookings yet" icon={CalendarCheck} />
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {data!.recentBookings.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <Avatar name={b.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-small font-medium">{b.name}</p>
                    <p className="truncate text-caption text-muted-foreground">
                      {b.trip ?? "General enquiry"} · {relativeDate(b.created_at)}
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
