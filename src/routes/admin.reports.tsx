import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Wallet,
  CalendarCheck,
  Users,
  TrendingUp,
  CreditCard,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  MapPin,
  RefreshCw,
  FileText,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
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
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getReports } from "@/lib/admin/command.functions";
import {
  EmptyState,
  ErrorState,
  Page,
  Panel,
  SkeletonKpis,
  SkeletonRows,
  PermissionGate,
} from "@/components/admin/kit";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reports")({
  ssr: false,
  head: () => ({
    meta: [{ title: adminDocTitle("reports") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ReportsPage,
});

function formatMoney(amount: number | null | undefined, currency = "TND") {
  const val = Number(amount ?? 0);
  return `${val.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency === "TND" ? "د.ت" : currency}`;
}

function ReportsPage() {
  return (
    <PermissionGate permission="reports.view" asPage pageTitle="لوحة التقارير ومؤشرات الأعمال">
      <ReportsView />
    </PermissionGate>
  );
}

function ReportsView() {
  const fetchReports = useServerFn(getReports);
  const [packageCategoryFilter, setPackageCategoryFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month" | "prev_month" | "year"
  >("all");

  const q = useQuery({
    queryKey: ["admin-reports"] as const,
    queryFn: () => fetchReports(),
    staleTime: 60_000,
  });

  const data = q.data;
  const currency = data?.currency ?? "TND";
  const kpis = data?.kpis;
  const payments = data?.payments;
  const branchPerf = data?.branchPerformance;
  const customersAnalytics = data?.customersAnalytics;
  const insights = useMemo(() => data?.insights ?? [], [data?.insights]);

  // Active period data containing revenue, paid, outstanding, period payments, and period insights
  const activePeriodData = useMemo(() => {
    const periodMap = (
      data as unknown as {
        periodKpis?: Record<
          string,
          {
            revenue: number;
            paid: number;
            outstanding: number;
            collectionRate: number;
            bookingsCount: number;
            paymentsCount: number;
            payments?: {
              totalInstallmentsCount: number;
              paidInstallmentsCount: number;
              pendingInstallmentsCount: number;
              overdueInstallmentsCount: number;
              totalCollectedInstallments: number;
              totalPendingInstallments: number;
              totalOverdueInstallments: number;
              unscheduledOutstanding: number;
            };
            insights?: Array<{
              id: string;
              severity: "critical" | "attention" | "opportunity" | "info";
              title: string;
              body: string;
              actionLabel?: string;
              href?: string;
            }>;
          }
        >;
      }
    )?.periodKpis;

    if (!periodMap) return null;
    return periodMap[dateFilter] || periodMap.all;
  }, [data, dateFilter]);

  // Active KPIs adjusted for selected date period
  const activeKpi = useMemo(() => {
    if (!kpis) return null;
    if (!activePeriodData) return kpis;
    return {
      ...kpis,
      totalRevenue: activePeriodData.revenue,
      totalPaid: activePeriodData.paid,
      totalOutstanding: activePeriodData.outstanding,
      collectionRate: activePeriodData.collectionRate,
      totalBookings: activePeriodData.bookingsCount,
    };
  }, [kpis, activePeriodData]);

  // Active installment payments metrics adjusted for selected date period
  const activePayments = useMemo(() => {
    return activePeriodData?.payments || payments;
  }, [activePeriodData, payments]);

  // Active smart insights adjusted for selected date period
  const activeInsights = useMemo(() => {
    if (activePeriodData?.insights && activePeriodData.insights.length > 0) {
      return activePeriodData.insights;
    }
    return insights;
  }, [activePeriodData, insights]);

  // Filter packages by category if needed
  const filteredPackages = useMemo(() => {
    if (!data?.packagesPerformance) return [];
    if (packageCategoryFilter === "all") return data.packagesPerformance;
    return data.packagesPerformance.filter(
      (p) => (p.category ?? "").toLowerCase() === packageCategoryFilter.toLowerCase(),
    );
  }, [data?.packagesPerformance, packageCategoryFilter]);

  return (
    <Page
      title="لوحة التقارير ومؤشرات الأعمال (Analytics)"
      description="مؤشرات أداء الوكالة المالية والتشغيلية المعتمدة بالكامل على سجلات قاعدة البيانات الحقيقية."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={dateFilter}
            onValueChange={(val) =>
              setDateFilter(val as "all" | "today" | "week" | "month" | "prev_month" | "year")
            }
          >
            <SelectTrigger className="h-8 w-[165px] text-xs font-medium bg-card">
              <SelectValue placeholder="الفترة الزمنية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كامل الفترة (All Time)</SelectItem>
              <SelectItem value="today">اليوم (Today)</SelectItem>
              <SelectItem value="week">هذا الأسبوع (This Week)</SelectItem>
              <SelectItem value="month">هذا الشهر (This Month)</SelectItem>
              <SelectItem value="prev_month">الشهر السابق (Prev Month)</SelectItem>
              <SelectItem value="year">هذا العام (This Year)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => q.refetch()}
            disabled={q.isFetching}
            className="text-xs"
          >
            <RefreshCw className={cn("me-1.5 h-3.5 w-3.5", q.isFetching && "animate-spin")} />
            تحديث البيانات
          </Button>
        </div>
      }
    >
      {q.isLoading || !data || !kpis || !activeKpi ? (
        <div className="space-y-6">
          <SkeletonKpis />
          <SkeletonRows rows={8} />
        </div>
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <div className="space-y-6">
          {/* SMART INSIGHTS SECTION (Deterministic & Actionable) */}
          {activeInsights.length > 0 && (
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-l from-primary/5 via-primary/[0.02] to-transparent p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h3 className="font-bold text-foreground text-sm">
                  رؤى تشغيلية ذكية ومباشرة (Smart Insights)
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className={cn(
                      "flex flex-col justify-between rounded-xl border p-3.5 transition-all shadow-2xs",
                      insight.severity === "critical"
                        ? "border-amber-500/40 bg-amber-500/10"
                        : insight.severity === "attention"
                          ? "border-blue-500/30 bg-blue-500/5"
                          : insight.severity === "opportunity"
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-border/70 bg-card",
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {insight.severity === "critical" ? (
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        ) : insight.severity === "opportunity" ? (
                          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        )}
                        <p className="font-semibold text-xs text-foreground">{insight.title}</p>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                        {insight.body}
                      </p>
                    </div>

                    {insight.actionLabel && insight.href && (
                      <div className="mt-3 pt-2 border-t border-border/40 flex justify-end">
                        <Button
                          asChild
                          size="xs"
                          variant="ghost"
                          className="text-primary hover:text-primary"
                        >
                          <Link to={insight.href}>
                            {insight.actionLabel}
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOP KPI OVERVIEW CARDS */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* Total Revenue / Contracted in Period */}
            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground">
                {dateFilter === "all" ? "إجمالي التعاقدات" : "إجمالي التعاقدات خلال الفترة"}
              </span>
              <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
                {formatMoney(activeKpi.totalRevenue, currency)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {dateFilter === "all"
                  ? `من ${activeKpi.totalBookings} حجز مؤكد`
                  : `تعاقدات الفترة (${activeKpi.totalBookings})`}
              </p>
            </div>

            {/* Collected Revenue */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-4 shadow-sm dark:bg-emerald-950/20">
              <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                {dateFilter === "all" ? "المبالغ المحصلة" : "المبالغ المحصلة خلال الفترة"}
              </span>
              <p className="mt-2 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                {formatMoney(activeKpi.totalPaid, currency)}
              </p>
              <p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
                {dateFilter === "all"
                  ? `${Math.round(kpis.collectionRate)}% نسبة التحصيل الإجمالية`
                  : activeKpi.totalRevenue > 0
                    ? `${Math.round(activeKpi.collectionRate)}% نسبة تحصيل الفترة`
                    : "تحصيل دفعات لحسابات جارية"}
              </p>
            </div>

            {/* Current Outstanding Balance (Point-in-time state) */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-50/50 p-4 shadow-sm dark:bg-amber-950/20">
              <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                الرصيد المستحق حالياً
              </span>
              <p className="mt-2 text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
                {formatMoney(kpis.totalOutstanding, currency)}
              </p>
              <p className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-400/80">
                {(payments?.pendingInstallmentsCount ?? 0) > 0
                  ? `${payments?.pendingInstallmentsCount} أقساط مجدولة · ${payments?.overdueInstallmentsCount ?? 0} متأخرة`
                  : kpis.totalOutstanding > 0
                    ? `رصيد متبقي غير مجدول (${formatMoney(payments?.unscheduledOutstanding ?? kpis.totalOutstanding, currency)})`
                    : `جميع الحسابات مسددة بالكامل`}
              </p>
            </div>

            {/* Active Trips */}
            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground">الرحلات النشطة</span>
              <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
                {kpis.activeTripsCount}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">حجوزات جارية ومؤكدة</p>
            </div>

            {/* Total Customers */}
            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground">إجمالي العملاء</span>
              <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
                {kpis.totalCustomers}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                +{kpis.newCustomersCount} عملاء هذا الشهر
              </p>
            </div>

            {/* Pending Requests */}
            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground">طلبات بالانتظار</span>
              <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
                {kpis.pendingRequests}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                <Link to="/admin/requests" className="text-primary hover:underline">
                  معالجة الطلبات ←
                </Link>
              </p>
            </div>
          </div>

          {/* FINANCIAL ANALYTICS & MONTHLY TRENDS */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Revenue Trend: Paid vs Outstanding BarChart */}
            <Panel
              title="تطور الإيرادات والمبالغ المحصلة (آخر 12 شهر)"
              description="مقارنة المبالغ المحصلة فعلياً مقابل المبالغ المتبقية شهرياً."
              className="lg:col-span-2"
            >
              <div className="h-72 w-full pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.trend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={55}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: unknown) => formatMoney(Number(val ?? 0), currency)}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--color-border)",
                        backgroundColor: "var(--color-card)",
                        textAlign: "right",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar dataKey="paid" name="المحصل" fill="var(--color-success-500)" radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="outstanding"
                      name="المتبقي"
                      fill="var(--color-warning-500)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            {/* Installments & Payment Analytics Card */}
            <Panel
              title="متابعة الأقساط والتحصيل"
              description="إحصائيات فورية لجدول الأقساط المسجلة في النظام مقارنة بالرصيد المتبقي الإجمالي."
            >
              <div className="space-y-4 pt-1">
                <div className="rounded-xl bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">إجمالي الأقساط المسجلة في النظام:</span>
                    <span className="font-bold tabular-nums text-foreground">
                      {activePayments?.totalInstallmentsCount ?? 0} قسط
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      أقساط مسددة بالكامل:
                    </span>
                    <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {activePayments?.paidInstallmentsCount ?? 0} (
                      {formatMoney(activePayments?.totalCollectedInstallments ?? 0, currency)})
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-700 dark:text-amber-400 font-medium">
                      أقساط مجدولة قيد الانتظار:
                    </span>
                    <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">
                      {activePayments?.pendingInstallmentsCount ?? 0} (
                      {formatMoney(activePayments?.totalPendingInstallments ?? 0, currency)})
                    </span>
                  </div>

                  {/* UNSTRUCTURED / UNSCHEDULED REMAINING BALANCE ROW */}
                  <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2">
                    <span
                      className="text-muted-foreground flex items-center gap-1"
                      title="مبالغ متبقية على حجوزات مؤكدة لم يُنشأ لها جدول أقساط بعد"
                    >
                      رصيد متبقي غير مجدول كأقساط:
                    </span>
                    <span className="font-bold tabular-nums text-foreground">
                      {formatMoney(activePayments?.unscheduledOutstanding ?? 0, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-border/50 pt-2">
                    <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      أقساط متأخرة عن موعدها:
                    </span>
                    <span className="font-bold tabular-nums text-red-600 dark:text-red-400">
                      {activePayments?.overdueInstallmentsCount ?? 0} (
                      {formatMoney(activePayments?.totalOverdueInstallments ?? 0, currency)})
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-xs"
                  >
                    <Link to="/admin/customers" search={{ filter: "overdue" }}>
                      <span>عرض العملاء ذوي الأقساط المتأخرة</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-xs"
                  >
                    <Link to="/admin/customers" search={{ filter: "unpaid" }}>
                      <span>عرض جميع العملاء برصيد متبقي</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Panel>
          </div>

          {/* PACKAGES & TRIPS PERFORMANCE */}
          <Panel
            title="أداء الباقات والرحلات (Packages & Trips)"
            description="ترتيب البرامج والرحلات حسب حجم الحجوزات، المبيعات، ومعدل التحصيل."
            actions={
              <div className="flex items-center gap-2">
                <Select value={packageCategoryFilter} onValueChange={setPackageCategoryFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue placeholder="التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التصنيفات</SelectItem>
                    <SelectItem value="umrah">عمرة</SelectItem>
                    <SelectItem value="turkey">تركيا</SelectItem>
                    <SelectItem value="tourism">سياحة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
            bodyClassName="p-0 sm:p-0"
          >
            {filteredPackages.length === 0 ? (
              <div className="p-6">
                <EmptyState title="لا توجد حجوزات مسجلة لهذه الباقات" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="border-b border-border/70 bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="p-3 text-start font-semibold">اسم الرحلة / الباقة</th>
                      <th className="p-3 text-start font-semibold">التصنيف</th>
                      <th className="p-3 text-center font-semibold">الحجوزات</th>
                      <th className="p-3 text-center font-semibold">المسافرين</th>
                      <th className="p-3 text-end font-semibold">إجمالي المبيعات</th>
                      <th className="p-3 text-end font-semibold">المحصل</th>
                      <th className="p-3 text-end font-semibold">المتبقي</th>
                      <th className="p-3 text-center font-semibold">نسبة التحصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredPackages.map((pkg) => {
                      const rate = pkg.revenue > 0 ? (pkg.paid / pkg.revenue) * 100 : 0;
                      return (
                        <tr key={pkg.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-semibold text-foreground max-w-xs truncate">
                            {pkg.title}
                          </td>
                          <td className="p-3 text-muted-foreground">{pkg.category}</td>
                          <td className="p-3 text-center font-bold tabular-nums">{pkg.bookings}</td>
                          <td className="p-3 text-center tabular-nums text-muted-foreground">
                            {pkg.travellers}
                          </td>
                          <td className="p-3 text-end font-bold tabular-nums text-foreground">
                            {formatMoney(pkg.revenue, currency)}
                          </td>
                          <td className="p-3 text-end font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatMoney(pkg.paid, currency)}
                          </td>
                          <td className="p-3 text-end font-bold tabular-nums text-amber-600 dark:text-amber-400">
                            {formatMoney(pkg.outstanding, currency)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold tabular-nums",
                                rate >= 100
                                  ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                  : "border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
                              )}
                            >
                              {Math.round(rate)}%
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* BRANCH PERFORMANCE ANALYTICS */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel
              title="أداء الفروع الجغرافية (Branch Performance)"
              description="متابعة أداء فروع الوكالة التشغيلية ومساهمة كل فرع في المبيعات والتحصيل."
              className="lg:col-span-2"
              bodyClassName="p-0 sm:p-0"
            >
              {!branchPerf || branchPerf.branches.length === 0 ? (
                <div className="p-6">
                  <EmptyState title="لا توجد بيانات فروع مسجلة" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs">
                    <thead className="border-b border-border/70 bg-muted/30 text-muted-foreground">
                      <tr>
                        <th className="p-3 text-start font-semibold">الفرع والمدينة</th>
                        <th className="p-3 text-center font-semibold">الحجوزات</th>
                        <th className="p-3 text-center font-semibold">الطلبات</th>
                        <th className="p-3 text-center font-semibold">العملاء</th>
                        <th className="p-3 text-end font-semibold">الإيرادات</th>
                        <th className="p-3 text-end font-semibold">المحصل</th>
                        <th className="p-3 text-end font-semibold">المتبقي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {branchPerf.branches.map((br) => (
                        <tr key={br.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{br.name}</span>
                              {br.isMain && (
                                <Badge className="text-[9px] bg-primary text-primary-foreground">
                                  الرئيسي
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground">{br.city}</span>
                          </td>
                          <td className="p-3 text-center font-bold tabular-nums">
                            {br.bookingsCount}
                          </td>
                          <td className="p-3 text-center tabular-nums text-muted-foreground">
                            {br.requestsCount}
                          </td>
                          <td className="p-3 text-center tabular-nums font-medium text-foreground">
                            {br.customersCount}
                          </td>
                          <td className="p-3 text-end font-bold tabular-nums text-foreground">
                            {formatMoney(br.revenue, currency)}
                          </td>
                          <td className="p-3 text-end font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatMoney(br.paid, currency)}
                          </td>
                          <td className="p-3 text-end font-bold tabular-nums text-amber-600 dark:text-amber-400">
                            {formatMoney(br.outstanding, currency)}
                          </td>
                        </tr>
                      ))}

                      {/* Unassigned / Direct Web Row */}
                      {branchPerf.unassignedBookings > 0 && (
                        <tr className="bg-muted/10 font-medium">
                          <td className="p-3">
                            <span className="font-semibold text-foreground">
                              حجوزات الموقع المباشرة (غير مسندة)
                            </span>
                            <p className="text-[10px] text-muted-foreground">
                              طلبات واردة عبر المنصة الإلكترونية
                            </p>
                          </td>
                          <td className="p-3 text-center font-bold tabular-nums">
                            {branchPerf.unassignedBookings}
                          </td>
                          <td className="p-3 text-center text-muted-foreground">—</td>
                          <td className="p-3 text-center text-muted-foreground">—</td>
                          <td className="p-3 text-end font-bold tabular-nums text-foreground">
                            {formatMoney(branchPerf.unassignedRevenue, currency)}
                          </td>
                          <td className="p-3 text-end text-muted-foreground" colSpan={2}>
                            <Link
                              to="/admin/customers"
                              className="text-primary hover:underline text-[11px]"
                            >
                              إسناد للفروع ←
                            </Link>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            {/* Geographic & Customer Reach */}
            <Panel
              title="توزيع العملاء والمدن"
              description="أعلى المدن تركزاً لعملاء الوكالة ونسب الولاء."
            >
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-[11px] text-muted-foreground">عملاء بحجوزات متكررة</span>
                    <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                      {customersAnalytics?.returningCustomersCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-[11px] text-muted-foreground">عملاء برصيد متبقي</span>
                    <p className="mt-1 text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                      {customersAnalytics?.customersWithUnpaidBalance ?? 0}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground">
                    أعلى المدن تواجداً للعملاء:
                  </h4>
                  {!customersAnalytics?.customersByCity ||
                  customersAnalytics.customersByCity.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      لم يتم تسجيل عناوين مدن للعملاء بعد.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {customersAnalytics.customersByCity.map((c) => (
                        <div
                          key={c.city}
                          className="flex items-center justify-between rounded-lg border border-border/50 p-2 text-xs"
                        >
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {c.city}
                          </span>
                          <Badge variant="outline" className="font-bold tabular-nums text-[10px]">
                            {c.count} عملاء
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </Page>
  );
}
