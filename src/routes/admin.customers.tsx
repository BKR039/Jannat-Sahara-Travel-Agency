import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Page, Panel, PermissionGate, useDebounced } from "@/components/admin/kit";
import { CustomerStatsCards } from "@/components/admin/customers/CustomerStatsCards";
import { CustomerFilters } from "@/components/admin/customers/CustomerFilters";
import { CustomerList } from "@/components/admin/customers/CustomerList";
import { CustomerWorkspaceDrawer } from "@/components/admin/customers/CustomerWorkspaceDrawer";
import { listCustomers } from "@/lib/admin/command.functions";
import { adminDocTitle } from "@/lib/admin/doc-title";
import type { CustomerSummary } from "@/types/customer";

export const Route = createFileRoute("/admin/customers")({
  ssr: false,
  validateSearch: (
    s: Record<string, unknown>,
  ): { q?: string; customer?: string; filter?: string } => ({
    ...(typeof s.q === "string" && s.q ? { q: s.q } : {}),
    ...(typeof s.customer === "string" && s.customer ? { customer: s.customer } : {}),
    ...(typeof s.filter === "string" && s.filter ? { filter: s.filter } : {}),
  }),
  head: () => ({
    meta: [{ title: adminDocTitle("customers") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const navigate = useNavigate();
  const { q, customer: openKey, filter: activeFilter = "all" } = Route.useSearch();
  const fetchCustomers = useServerFn(listCustomers);

  const [search, setSearch] = useState(q ?? "");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const debounced = useDebounced(search, 200);

  useEffect(() => {
    if (q !== undefined && q !== search) {
      setSearch(q);
    }
  }, [q, search]);

  const list = useQuery({
    queryKey: ["admin-customers"] as const,
    queryFn: () => fetchCustomers(),
    staleTime: 30_000,
  });

  const customers = useMemo(() => (list.data ?? []) as CustomerSummary[], [list.data]);

  // Extract unique cities for dropdown
  const cities = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.city && c.city.trim()) set.add(c.city.trim());
    });
    return Array.from(set).sort();
  }, [customers]);

  // Derived filter counts
  const counts = useMemo(() => {
    return {
      all: customers.length,
      active_trip: customers.filter((c) => c.hasActiveTrip).length,
      unpaid: customers.filter((c) => c.totalRemaining > 0 || c.hasUnpaidBalance).length,
      overdue: customers.filter((c) => c.overdueCount > 0).length,
      customer: customers.filter((c) => c.bookings > 0 || c.status === "customer").length,
      lead: customers.filter((c) => c.status === "lead").length,
      vip: customers.filter((c) => c.status === "vip").length,
      inactive: customers.filter((c) => c.status === "inactive").length,
    };
  }, [customers]);

  // Apply filters and debounced search
  const filtered = useMemo(() => {
    let result = customers;

    if (activeFilter === "active_trip") {
      result = result.filter((c) => c.hasActiveTrip);
    } else if (activeFilter === "unpaid") {
      result = result.filter((c) => c.totalRemaining > 0 || c.hasUnpaidBalance);
    } else if (activeFilter === "overdue") {
      result = result.filter((c) => c.overdueCount > 0);
    } else if (activeFilter === "customer") {
      result = result.filter((c) => c.bookings > 0 || c.status === "customer");
    } else if (activeFilter === "lead") {
      result = result.filter((c) => c.status === "lead");
    } else if (activeFilter === "vip") {
      result = result.filter((c) => c.status === "vip");
    } else if (activeFilter === "inactive") {
      result = result.filter((c) => c.status === "inactive");
    }

    if (selectedCity !== "all") {
      result = result.filter((c) => c.city?.trim() === selectedCity);
    }

    const needle = debounced.trim().toLowerCase();
    if (needle) {
      result = result.filter((c) =>
        [c.name, c.phone, c.email, c.city, c.branchName].some((v) =>
          (v ?? "").toLowerCase().includes(needle),
        ),
      );
    }

    return result;
  }, [customers, activeFilter, selectedCity, debounced]);

  // Overall Aggregate Statistics
  const stats = useMemo(() => {
    let totalPaid = 0;
    let totalRemaining = 0;
    let overdueCount = 0;
    let activeTripCount = 0;

    customers.forEach((c) => {
      totalPaid += c.totalPaid;
      totalRemaining += c.totalRemaining;
      overdueCount += c.overdueCount;
      if (c.hasActiveTrip) activeTripCount += 1;
    });

    return {
      totalCount: customers.length,
      activeTripCount,
      totalPaid,
      totalRemaining,
      overdueCount,
      currency: "TND",
    };
  }, [customers]);

  function exportCsv() {
    if (!filtered.length) return;
    const cols = [
      "الاسم الكامل",
      "الهاتف",
      "البريد الإلكتروني",
      "المدينة",
      "الحالة",
      "الفرع",
      "عدد الحجوزات",
      "إجمالي المعاملات",
      "المبلغ المدفوع",
      "المتبقي",
      "آخر رحلة",
      "آخر نشاط",
    ];
    const rows = filtered.map((c) =>
      [
        `"${(c.name || "").replace(/"/g, '""')}"`,
        c.phone ?? "",
        c.email ?? "",
        c.city ?? "",
        c.status,
        c.branchName ?? "",
        c.bookings,
        c.totalSpent,
        c.totalPaid,
        c.totalRemaining,
        `"${(c.lastTrip ?? "").replace(/"/g, '""')}"`,
        c.lastActivity,
      ].join(","),
    );

    const csv = [cols.join(","), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jannat-sahara-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const openCustomer = (key: string | undefined) =>
    navigate({
      to: "/admin/customers",
      search: key ? { q, customer: key, filter: activeFilter } : { q, filter: activeFilter },
      replace: true,
    });

  const setFilter = (f: string) =>
    navigate({
      to: "/admin/customers",
      search: { q, customer: openKey, filter: f },
      replace: true,
    });

  const handleClearFilters = () => {
    setSearch("");
    setSelectedCity("all");
    navigate({
      to: "/admin/customers",
      search: { filter: "all", customer: openKey },
      replace: true,
    });
  };

  const hasActiveFilters =
    Boolean(search.trim()) || selectedCity !== "all" || activeFilter !== "all";

  return (
    <PermissionGate
      permission="customers.view"
      asPage
      pageTitle="سجل العملاء وإدارة الحسابات (CRM)"
    >
      <Page
        title="سجل العملاء وإدارة الحسابات (CRM)"
        description="الملف التشغيلي الموحد لعملاء الوكالة: سجل الحجوزات، متابعة الأقساط، المدفوعات، والتواصل المباشر."
      >
        {/* Real-time Aggregate KPI Summary Cards */}
        <CustomerStatsCards stats={stats} />

        {/* Filters and List Section */}
        <Panel className="mt-4 space-y-4" bodyClassName="p-4 sm:p-5">
          <CustomerFilters
            search={search}
            onSearchChange={setSearch}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            cities={cities}
            activeFilter={activeFilter}
            onFilterChange={setFilter}
            counts={counts}
            onExportCsv={exportCsv}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />

          <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
            <CustomerList
              customers={filtered}
              isLoading={list.isLoading}
              onSelectCustomer={openCustomer}
              selectedCustomerKey={openKey}
            />
          </div>
        </Panel>

        {/* Customer Complete CRM Workspace Drawer */}
        <CustomerWorkspaceDrawer customerKey={openKey} onClose={() => openCustomer(undefined)} />
      </Page>
    </PermissionGate>
  );
}
