import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  Package as PackageIcon,
  Plane,
  ScrollText,
  MapPin,
  Star,
  Newspaper,
  Image as ImageIcon,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
} from "lucide-react";
import { PageHeader, StatCard, AdminCard, EmptyState } from "@/components/admin/ui";
import { getDashboardStats } from "@/lib/admin/admin.functions";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

const CHART_COLORS = ["#E8722C", "#0F3D2E", "#D4A574", "#8B4513", "#3A6B4F"];

function DashboardPage() {
  const fetchStats = useServerFn(getDashboardStats);
  const stats = useQuery({
    queryKey: ["admin-dashboard-stats"] as const,
    queryFn: () => fetchStats(),
    staleTime: 60_000,
  });

  const recent = useQuery({
    queryKey: ["admin-dashboard-recent-bookings"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, name, phone, package_title, package_category, status, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const c = stats.data?.counts;

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your Janat Sahara Travel business." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total packages" value={c?.packages ?? "—"} icon={PackageIcon} tone="primary" />
        <StatCard label="Umrah programs" value={c?.packagesUmrah ?? "—"} icon={ScrollText} tone="green" />
        <StatCard label="Trip packages" value={c?.packagesTrip ?? "—"} icon={MapPin} tone="gold" />
        <StatCard label="Flight & visa" value={(c ? c.packagesFlight + c.packagesVisa : "—") as string | number} icon={Plane} tone="muted" />

        <StatCard label="Total bookings" value={c?.bookings ?? "—"} icon={Calendar} tone="primary" />
        <StatCard label="New" value={c?.bookingsNew ?? "—"} icon={Clock} tone="gold" hint="Awaiting review" />
        <StatCard label="Confirmed" value={c?.bookingsConfirmed ?? "—"} icon={CheckCircle2} tone="green" />
        <StatCard label="Cancelled" value={c?.bookingsCancelled ?? "—"} icon={XCircle} tone="muted" />

        <StatCard label="Branches" value={c?.branches ?? "—"} icon={MapPin} tone="green" />
        <StatCard label="Testimonials" value={c?.testimonials ?? "—"} icon={Star} tone="gold" />
        <StatCard label="Blog posts" value={c?.articles ?? "—"} icon={Newspaper} tone="primary" />
        <StatCard label="Gallery items" value={c?.galleryItems ?? "—"} icon={ImageIcon} tone="muted" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <AdminCard title="Monthly bookings" description="Last 12 months" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.data?.monthlySeries ?? []}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
                <Bar dataKey="count" fill="#E8722C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard title="Bookings by service">
          <div className="h-64">
            {stats.data?.bookingsByCategory && stats.data.bookingsByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.data.bookingsByCategory}
                    dataKey="count"
                    nameKey="category"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {stats.data.bookingsByCategory.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No booking data yet" icon={Calendar} />
            )}
          </div>
        </AdminCard>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <AdminCard title="Recent bookings" className="lg:col-span-2">
          {recent.data && recent.data.length > 0 ? (
            <ul className="divide-y divide-border -mx-4 sm:-mx-5">
              {recent.data.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-small font-medium truncate">{b.name}</p>
                    <p className="text-caption text-muted-foreground truncate">
                      {b.package_title ?? "General"} · {b.package_category ?? "—"}
                    </p>
                  </div>
                  <div className="text-caption text-muted-foreground">
                    {new Date(b.created_at).toLocaleDateString()}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No bookings yet" icon={Calendar} />
          )}
          <div className="mt-4 text-right">
            <Link to="/admin/bookings" className="text-caption font-medium text-primary hover:underline">
              View all bookings →
            </Link>
          </div>
        </AdminCard>

        <AdminCard title="Attention needed">
          <ul className="space-y-2 text-small">
            <li className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Pending bookings
              </span>
              <span className="font-bold">{c?.bookingsPending ?? "—"}</span>
            </li>
            <li className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Unread messages
              </span>
              <span className="font-bold">{c?.contactMessages ?? "—"}</span>
            </li>
          </ul>
        </AdminCard>
      </div>
    </>
  );
}
