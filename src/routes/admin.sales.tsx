import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Loader2, Upload, Download, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listLeads,
  listSalesAssignees,
  bulkUpdateLeadsStatus,
  bulkArchiveLeads,
  bulkDeleteLeads,
  bulkAssignLeads,
  restoreLead,
  type LeadRow,
  type SalesCenterKPIs,
} from "@/lib/leads/leads.functions";
import type { LeadStatus } from "@/lib/leads/leads.schema";
import { packagesQuery } from "@/lib/queries";
import { generateCsv } from "@/lib/leads/csv-engine";
import { useAdmin } from "@/components/admin/context";
import { toast } from "sonner";

import { LeadStatsCards } from "@/components/admin/sales/LeadStatsCards";
import { LeadFilters } from "@/components/admin/sales/LeadFilters";
import { LeadList } from "@/components/admin/sales/LeadList";
import { LeadWorkspaceDrawer } from "@/components/admin/sales/LeadWorkspaceDrawer";
import { AddLeadModal } from "@/components/admin/sales/AddLeadModal";
import { EditLeadModal } from "@/components/admin/sales/EditLeadModal";
import { ArchiveLeadDialog } from "@/components/admin/sales/ArchiveLeadDialog";
import { DeleteLeadDialog } from "@/components/admin/sales/DeleteLeadDialog";
import { ImportLeadsModal } from "@/components/admin/sales/ImportLeadsModal";
import { BulkActionBar } from "@/components/admin/sales/BulkActionBar";

export const Route = createFileRoute("/admin/sales")({
  ssr: false,
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    status?: string;
    source?: string;
    intent?: string;
    governorate?: string;
    urgency?: string;
    archiveState?: string;
    assignedTo?: string;
    q?: string;
    lead?: string;
  } => ({
    ...(typeof s.status === "string" && s.status ? { status: s.status } : {}),
    ...(typeof s.source === "string" && s.source ? { source: s.source } : {}),
    ...(typeof s.intent === "string" && s.intent ? { intent: s.intent } : {}),
    ...(typeof s.governorate === "string" && s.governorate ? { governorate: s.governorate } : {}),
    ...(typeof s.urgency === "string" && s.urgency ? { urgency: s.urgency } : {}),
    ...(typeof s.archiveState === "string" && s.archiveState
      ? { archiveState: s.archiveState }
      : {}),
    ...(typeof s.assignedTo === "string" && s.assignedTo ? { assignedTo: s.assignedTo } : {}),
    ...(typeof s.q === "string" && s.q ? { q: s.q } : {}),
    ...(typeof s.lead === "string" && s.lead ? { lead: s.lead } : {}),
  }),
  head: () => ({
    meta: [{ title: adminDocTitle("sales") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SalesCenterPage,
});

function SalesCenterPage() {
  const { t } = useTranslation("admin");
  const isRtl = i18n.dir() === "rtl";
  const navigate = useNavigate();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const { hasPermission, isSuperAdmin } = useAdmin();

  const fetchLeadsFn = useServerFn(listLeads);
  const fetchAssigneesFn = useServerFn(listSalesAssignees);
  const bulkStatusFn = useServerFn(bulkUpdateLeadsStatus);
  const bulkArchiveFn = useServerFn(bulkArchiveLeads);
  const bulkDeleteFn = useServerFn(bulkDeleteLeads);
  const bulkAssignFn = useServerFn(bulkAssignLeads);
  const restoreLeadFn = useServerFn(restoreLead);

  const { data: umrahPackages = [] } = useQuery(packagesQuery("umrah"));

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editLeadTarget, setEditLeadTarget] = useState<LeadRow | null>(null);
  const [archiveLeadTarget, setArchiveLeadTarget] = useState<LeadRow | null>(null);
  const [deleteLeadTarget, setDeleteLeadTarget] = useState<LeadRow | null>(null);

  // Selection state for bulk operations
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Local filter states synced with search params
  const statusFilter = search.status || "all";
  const sourceFilter = search.source || "all";
  const intentFilter = search.intent || "all";
  const governorateFilter = search.governorate || "all";
  const urgencyFilter = search.urgency || "all";
  const archiveStateFilter = (search.archiveState as "active" | "archived" | "all") || "active";
  const assignedToFilter = search.assignedTo || "all";
  const searchQuery = search.q || "";
  const openLeadId = search.lead || null;

  const updateFilters = useCallback(
    (patch: Record<string, string | undefined>) => {
      navigate({
        to: "/admin/sales",
        search: ((prev: Record<string, unknown>) => {
          const next = { ...prev, ...patch };
          // Clean up "all" or empty string
          for (const [k, v] of Object.entries(next)) {
            if (!v || v === "all") delete (next as any)[k];
          }
          return next;
        }) as any,
        replace: true,
      });
    },
    [navigate],
  );

  // Query assignees for assignment
  const { data: assignees = [] } = useQuery({
    queryKey: ["sales-assignees"],
    queryFn: async () => {
      const res = await fetchAssigneesFn();
      return (
        (res as unknown as { assignees: Array<{ id: string; name: string; email: string }> })
          .assignees || []
      );
    },
  });

  // TanStack Query for leads & KPIs
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: [
      "sales-leads",
      statusFilter,
      sourceFilter,
      intentFilter,
      governorateFilter,
      urgencyFilter,
      archiveStateFilter,
      assignedToFilter,
      searchQuery,
    ],
    queryFn: () =>
      fetchLeadsFn({
        data: {
          status: statusFilter !== "all" ? statusFilter : undefined,
          source: sourceFilter !== "all" ? sourceFilter : undefined,
          intent: intentFilter !== "all" ? intentFilter : undefined,
          governorate: governorateFilter !== "all" ? governorateFilter : undefined,
          followUpUrgency:
            urgencyFilter === "overdue" || urgencyFilter === "today" || urgencyFilter === "upcoming"
              ? urgencyFilter
              : undefined,
          archiveState: archiveStateFilter,
          assignedTo: assignedToFilter !== "all" ? assignedToFilter : undefined,
          search: searchQuery.trim() || undefined,
          limit: 150,
          offset: 0,
        },
      }),
  });

  const salesData = data as { leads: LeadRow[]; total: number; kpis: SalesCenterKPIs } | undefined;
  const leads = salesData?.leads ?? [];
  const total = salesData?.total ?? 0;
  const kpis: SalesCenterKPIs = salesData?.kpis ?? {
    newCount: 0,
    toContactCount: 0,
    qualifiedCount: 0,
    followUpsDueCount: 0,
    overdueCount: 0,
    todayCount: 0,
    offersSentCount: 0,
    confirmedCount: 0,
    lostCount: 0,
    totalCount: 0,
    archivedCount: 0,
    conversionRate: 0,
  };

  const handleSelectLead = (lead: LeadRow) => {
    updateFilters({ lead: lead.id });
  };

  const handleCloseLead = () => {
    updateFilters({ lead: undefined });
  };

  const formattedPackages = useMemo(
    () =>
      umrahPackages.map((p) => ({
        id: p.id,
        title: p.title,
        price: Number(p.price) || 0,
        currency: p.currency || "TND",
      })),
    [umrahPackages],
  );

  // Selection handlers
  const handleToggleSelect = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId],
    );
  };

  const handleSelectAll = () => {
    if (selectedLeadIds.length === leads.length && leads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l) => l.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedLeadIds([]);
  };

  // Saved view handler
  const handleSavedViewSelect = (patch: Record<string, string | undefined>) => {
    navigate({
      to: "/admin/sales",
      search: ((prev: Record<string, unknown>) => {
        const next = { ...prev, ...patch };
        for (const [k, v] of Object.entries(next)) {
          if (!v || v === "all") delete (next as any)[k];
        }
        return next;
      }) as any,
      replace: true,
    });
  };

  // Restore single lead handler
  const handleRestoreLead = async (lead: LeadRow) => {
    try {
      await restoreLeadFn({ data: { leadId: lead.id } });
      toast.success(
        isRtl ? `تم استرجاع ${lead.full_name} إلى القائمة النشطة بنجاح` : `Lead restauré`,
      );
      qc.invalidateQueries({ queryKey: ["sales-leads"] });
    } catch (err: any) {
      toast.error(err.message || "Erreur de restauration");
    }
  };

  // Bulk actions handlers
  const handleBulkStatusChange = async (newStatus: LeadStatus) => {
    try {
      const res = await bulkStatusFn({
        data: {
          leadIds: selectedLeadIds,
          status: newStatus,
        },
      });
      toast.success(
        isRtl ? `تم تحديث حالة ${res.count} Leads بنجاح` : `${res.count} leads mis à jour`,
      );
      setSelectedLeadIds([]);
      qc.invalidateQueries({ queryKey: ["sales-leads"] });
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const handleBulkAssign = async (assigneeId: string) => {
    const assignee = assignees.find((a) => a.id === assigneeId);
    try {
      const res = await bulkAssignFn({
        data: {
          leadIds: selectedLeadIds,
          assignedTo: assigneeId,
          assignedToName: assignee?.name || assignee?.email,
        },
      });
      toast.success(
        isRtl ? `تم تعيين المسؤول لـ ${res.count} Leads بنجاح` : `${res.count} leads assignés`,
      );
      setSelectedLeadIds([]);
      qc.invalidateQueries({ queryKey: ["sales-leads"] });
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const handleBulkArchive = async () => {
    try {
      const res = await bulkArchiveFn({
        data: {
          leadIds: selectedLeadIds,
          reason: "أرشفة جماعية من مركز المبيعات",
        },
      });
      toast.success(isRtl ? `تمت أرشفة ${res.count} Leads بنجاح` : `${res.count} leads archivés`);
      setSelectedLeadIds([]);
      qc.invalidateQueries({ queryKey: ["sales-leads"] });
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const handleBulkDelete = async () => {
    const canDelete = isSuperAdmin || hasPermission("leads.delete");
    if (!canDelete) {
      toast.error(isRtl ? "ليست لديك صلاحية حذف Leads" : "Permission refusée");
      return;
    }
    try {
      const res = await bulkDeleteFn({
        data: {
          leadIds: selectedLeadIds,
        },
      });
      toast.success(
        isRtl
          ? `تم حذف ${res.count} Leads نهائيًا مع الحفاظ على ملفات العملاء`
          : `${res.count} leads supprimés`,
      );
      setSelectedLeadIds([]);
      qc.invalidateQueries({ queryKey: ["sales-leads"] });
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  // CSV Export handler
  const handleExportCsv = (ids?: string[]) => {
    const targetLeads = ids && ids.length > 0 ? leads.filter((l) => ids.includes(l.id)) : leads;

    if (targetLeads.length === 0) {
      toast.error(isRtl ? "لا توجد Leads للتصدير" : "Aucun lead à exporter");
      return;
    }

    const headers = [
      "المرجع",
      "الاسم",
      "الهاتف",
      "البريد",
      "الولاية",
      "الرحلة",
      "المسافرون",
      "المصدر",
      "الحالة",
      "الاهتمام",
      "المسؤول",
      "تاريخ_المتابعة",
      "تاريخ_الإنشاء",
      "ملاحظات",
    ];

    const rows = targetLeads.map((l) => [
      l.reference || "",
      l.full_name,
      l.phone,
      l.email || "",
      l.governorate || "",
      l.trip_name || "",
      l.travelers_count ?? 1,
      l.source || "other",
      l.status,
      l.intent || "medium",
      l.assigned_to_name || "",
      l.next_follow_up_date || "",
      new Date(l.created_at).toLocaleDateString("ar-TN"),
      l.notes || "",
    ]);

    const csvContent = generateCsv(headers, rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `jannat-sahara-leads-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(
      isRtl
        ? `تم تصدير ${targetLeads.length} Leads بصيغة CSV بنجاح`
        : `${targetLeads.length} leads exportés avec succès`,
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {isRtl ? "مركز المبيعات" : "Centre des ventes"}
            </h1>
            <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              2.0
            </span>
            {isRefetching && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          </div>
          <p className="text-small text-muted-foreground mt-1">
            {isRtl
              ? "متابعة العملاء المحتملين وتحويل الاهتمام إلى حجوزات"
              : "Gestion opérationnelle des prospects et conversion en réservations"}
          </p>
        </div>

        {/*
         * Header actions carry no geometry of their own.
         *
         * Each of these four used to pin its own height, radius, padding, gap
         * and weight (`h-10 px-3.5 rounded-xl gap-1.5 font-bold text-small`),
         * which rendered them 40px tall with a 28px radius — a pill — while
         * the identical cluster on the Control Center rendered 36px with a
         * 10px radius. Same component, same `size="sm"`, two visual languages.
         * Hierarchy still varies here, and only through `variant`: the primary
         * action fills, the import is tinted because it opens a destructive-ish
         * bulk flow, the rest are plain outlines.
         */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            title={isRtl ? "تحديث البيانات" : "Actualiser"}
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
            <span className="hidden sm:inline">{isRtl ? "تحديث" : "Actualiser"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportCsv()}
            title={isRtl ? "تصدير القائمة الحالية كملف CSV" : "Exporter CSV"}
          >
            <Download className="h-4 w-4" />
            <span>{isRtl ? "تصدير" : "Exporter"}</span>
          </Button>

          <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
            <Upload className="h-4 w-4" />
            <span>{isRtl ? "استيراد Leads" : "Importer"}</span>
          </Button>

          <Button size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4" />
            <span>{isRtl ? "إضافة Lead" : "Nouveau lead"}</span>
          </Button>
        </div>
      </div>

      {/* Real-time KPI Stats Cards */}
      <LeadStatsCards
        kpis={kpis}
        activeStatus={statusFilter}
        onSelectStatus={(s) => updateFilters({ status: s })}
        isRtl={isRtl}
      />

      {/* Filter and Search Controls */}
      <LeadFilters
        status={statusFilter}
        source={sourceFilter}
        intent={intentFilter}
        governorate={governorateFilter}
        followUpUrgency={urgencyFilter}
        archiveState={archiveStateFilter}
        assignedTo={assignedToFilter}
        assignees={assignees}
        search={searchQuery}
        onStatusChange={(s) => updateFilters({ status: s })}
        onSourceChange={(s) => updateFilters({ source: s })}
        onIntentChange={(i) => updateFilters({ intent: i })}
        onGovernorateChange={(g) => updateFilters({ governorate: g })}
        onFollowUpUrgencyChange={(u) => updateFilters({ urgency: u })}
        onArchiveStateChange={(a) => updateFilters({ archiveState: a })}
        onAssignedToChange={(t: string) => updateFilters({ assignedTo: t })}
        onSearchChange={(q) => updateFilters({ q })}
        onSavedViewSelect={handleSavedViewSelect}
        onReset={() =>
          navigate({
            to: "/admin/sales",
            search: {} as any,
            replace: true,
          })
        }
        isRtl={isRtl}
      />

      {/* Leads Table & Mobile Cards */}
      {isLoading ? (
        <div className="bg-card border border-border/70 rounded-2xl p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-small text-muted-foreground mt-3">
            {isRtl ? "جاري تحميل بيانات المبيعات..." : "Chargement des données..."}
          </p>
        </div>
      ) : (
        <LeadList
          leads={leads}
          selectedLeadIds={selectedLeadIds}
          onToggleSelectLead={handleToggleSelect}
          onSelectAllVisible={handleSelectAll}
          onSelectLead={handleSelectLead}
          onEditLead={(lead) => setEditLeadTarget(lead)}
          onArchiveLead={(lead) => setArchiveLeadTarget(lead)}
          onRestoreLead={handleRestoreLead}
          onDeleteLead={(lead) => setDeleteLeadTarget(lead)}
          hasActiveFilters={
            statusFilter !== "all" ||
            sourceFilter !== "all" ||
            intentFilter !== "all" ||
            governorateFilter !== "all" ||
            urgencyFilter !== "all" ||
            assignedToFilter !== "all" ||
            archiveStateFilter !== "active" ||
            !!searchQuery
          }
          onResetFilters={() =>
            navigate({
              to: "/admin/sales",
              search: {} as any,
              replace: true,
            })
          }
          onAddNewLead={() => setAddModalOpen(true)}
          onImportLeads={() => setImportModalOpen(true)}
          canDelete={isSuperAdmin || hasPermission("leads.delete")}
          isRtl={isRtl}
        />
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedLeadIds.length}
        assignees={assignees}
        onClearSelection={handleClearSelection}
        onChangeStatus={handleBulkStatusChange}
        onAssign={handleBulkAssign}
        onArchive={handleBulkArchive}
        onDelete={handleBulkDelete}
        onExport={() => handleExportCsv(selectedLeadIds)}
        canDelete={isSuperAdmin || hasPermission("leads.delete")}
        isRtl={isRtl}
      />

      {/* Lead Workspace Drawer */}
      <LeadWorkspaceDrawer
        leadId={openLeadId}
        onClose={handleCloseLead}
        onLeadUpdated={() => {
          qc.invalidateQueries({ queryKey: ["sales-leads"] });
          qc.invalidateQueries({ queryKey: ["admin-customers"] });
        }}
        onEditLead={(lead) => setEditLeadTarget(lead)}
        onArchiveLead={(lead) => setArchiveLeadTarget(lead)}
        onRestoreLead={handleRestoreLead}
        onDeleteLead={(lead) => setDeleteLeadTarget(lead)}
        packages={formattedPackages}
        isRtl={isRtl}
      />

      {/* Add Lead Modal */}
      <AddLeadModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        existingLeads={leads}
        onLeadCreated={() => {
          qc.invalidateQueries({ queryKey: ["sales-leads"] });
          qc.invalidateQueries({ queryKey: ["admin-customers"] });
        }}
        isRtl={isRtl}
      />

      {/* Edit Lead Modal */}
      {editLeadTarget && (
        <EditLeadModal
          open={!!editLeadTarget}
          onOpenChange={(open) => !open && setEditLeadTarget(null)}
          lead={editLeadTarget}
          onLeadUpdated={() => {
            setEditLeadTarget(null);
            qc.invalidateQueries({ queryKey: ["sales-leads"] });
            qc.invalidateQueries({ queryKey: ["admin-customers"] });
          }}
          isRtl={isRtl}
        />
      )}

      {/* Archive Lead Confirmation Dialog */}
      {archiveLeadTarget && (
        <ArchiveLeadDialog
          open={!!archiveLeadTarget}
          onOpenChange={(open) => !open && setArchiveLeadTarget(null)}
          lead={archiveLeadTarget}
          onLeadArchived={() => {
            setArchiveLeadTarget(null);
            qc.invalidateQueries({ queryKey: ["sales-leads"] });
          }}
          isRtl={isRtl}
        />
      )}

      {/* Delete Lead Permanent Dialog (Customer Profile Protected) */}
      {deleteLeadTarget && (
        <DeleteLeadDialog
          open={!!deleteLeadTarget}
          onOpenChange={(open) => !open && setDeleteLeadTarget(null)}
          lead={deleteLeadTarget}
          onLeadDeleted={() => {
            setDeleteLeadTarget(null);
            if (openLeadId === deleteLeadTarget.id) {
              handleCloseLead();
            }
            qc.invalidateQueries({ queryKey: ["sales-leads"] });
            qc.invalidateQueries({ queryKey: ["admin-customers"] });
          }}
          isRtl={isRtl}
        />
      )}

      {/* 6-Step Guided Import Leads Modal */}
      <ImportLeadsModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        existingLeads={leads}
        onImportComplete={() => {
          qc.invalidateQueries({ queryKey: ["sales-leads"] });
          qc.invalidateQueries({ queryKey: ["admin-customers"] });
        }}
        isRtl={isRtl}
      />
    </div>
  );
}
