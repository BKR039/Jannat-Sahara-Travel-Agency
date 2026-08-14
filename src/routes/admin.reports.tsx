import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Wallet, CalendarCheck, Users, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { getReports } from "@/lib/admin/command.functions";
import {
  Page,
  Panel,
  KpiCard,
  Occupancy,
  EmptyState,
  SkeletonKpis,
  SkeletonRows,
  money,
  shortDate,
} from "@/components/admin/kit";

export const Route = createFileRoute("/admin/reports")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reports — Janat Sahara Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const fetchReports = useServerFn(getReports);
  const q = useQuery({
    queryKey: ["admin-reports"] as const,
    queryFn: () => fetchReports(),
    staleTime: 120_000,
  });
  const data = q.data;
  const currency = data?.currency ?? "TND";

  return (
    <Page title="Reports" description="Answers to the questions you ask every week.">
      {q.isLoading || !data ? (
        <SkeletonKpis />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Revenue (12 months)"
            value={money(data.summary.revenue, currency)}
            icon={Wallet}
            tone="primary"
          />
          <KpiCard
            label="Bookings"
            value={data.summary.bookings}
            icon={CalendarCheck}
            tone="green"
          />
          <KpiCard label="Travellers" value={data.summary.travellers} icon={Users} tone="gold" />
          <KpiCard
            label="Average booking"
            value={money(data.summary.averageValue, currency)}
            icon={TrendingUp}
            tone="muted"
            hint={`${Math.round(data.summary.conversion)}% of enquiries confirmed`}
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Revenue and bookings" description="Monthly comparison">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={48} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }} />
                <Bar dataKey="revenue" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="New customers" description="Unique customers per month">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.acquisition ?? []}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }} />
                <Line
                  type="monotone"
                  dataKey="customers"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Best performing trips" bodyClassName="p-0 sm:p-0">
          {q.isLoading ? (
            <div className="p-4">
              <SkeletonRows rows={4} />
            </div>
          ) : (data?.topTrips.length ?? 0) === 0 ? (
            <div className="p-4">
              <EmptyState title="No data yet" />
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {data!.topTrips.map((t) => (
                <li key={t.title} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-small font-medium">{t.title}</p>
                    <p className="text-caption text-muted-foreground">
                      {t.bookings} bookings · {t.travellers} travellers
                    </p>
                  </div>
                  <p className="text-small font-semibold tabular-nums">{money(t.revenue, currency)}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Capacity of upcoming trips">
          {q.isLoading ? (
            <SkeletonRows rows={4} />
          ) : (data?.capacity.length ?? 0) === 0 ? (
            <EmptyState title="No upcoming departures" />
          ) : (
            <ul className="space-y-4">
              {data!.capacity.map((c) => (
                <li key={c.title}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-small font-medium">{c.title}</p>
                    <span className="text-caption text-muted-foreground">
                      {shortDate(c.departure_date)}
                    </span>
                  </div>
                  <Occupancy booked={c.booked} capacity={c.capacity} className="mt-2" />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Top destinations" className="mt-6" bodyClassName="p-0 sm:p-0">
        {(data?.topDestinations.length ?? 0) === 0 ? (
          <div className="p-4">
            <EmptyState title="No data yet" />
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {(data?.topDestinations ?? []).map((d) => (
              <li key={d.destination} className="flex items-center justify-between px-4 py-3 sm:px-5">
                <span className="truncate text-small">{d.destination}</span>
                <span className="text-small font-semibold tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </Page>
  );
}
