import {
  Phone,
  MessageCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Users,
  MapPin,
  Calendar,
  AlertCircle,
  MoreHorizontal,
  Edit3,
  Archive,
  RefreshCw,
  Trash2,
  Send,
  FileText,
  RotateCcw,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionMenu } from "@/components/ui/action-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { LeadRow } from "@/lib/leads/leads.functions";

interface LeadListProps {
  leads: LeadRow[];
  selectedLeadIds: string[];
  onToggleSelectLead: (leadId: string) => void;
  onSelectAllVisible: (selected: boolean) => void;
  onSelectLead: (lead: LeadRow) => void;
  onEditLead: (lead: LeadRow) => void;
  onArchiveLead: (lead: LeadRow) => void;
  onRestoreLead: (lead: LeadRow) => void;
  onDeleteLead: (lead: LeadRow) => void;
  onChangeStatus?: (lead: LeadRow) => void;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  onAddNewLead?: () => void;
  onImportLeads?: () => void;
  canDelete?: boolean;
  isRtl?: boolean;
}

function whatsappHref(phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits.length === 8 ? `216${digits}` : digits}`;
}

const SOURCE_LABELS: Record<string, { ar: string; fr: string; color: string }> = {
  website: {
    ar: "الموقع (تواصل)",
    fr: "Site web",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  umrah_builder: {
    ar: "مصمم العمرة",
    fr: "Builder Omra",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  meta_ads: {
    ar: "Meta Ads",
    fr: "Meta Ads",
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  },
  instagram_organic: {
    ar: "Instagram",
    fr: "Instagram",
    color: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  },
  facebook: {
    ar: "Facebook",
    fr: "Facebook",
    color: "bg-blue-600/10 text-blue-700 border-blue-600/20",
  },
  whatsapp: {
    ar: "WhatsApp",
    fr: "WhatsApp",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  phone: {
    ar: "مكالمة هاتفية",
    fr: "Téléphone",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  branch: {
    ar: "زيارة فرع",
    fr: "Agence",
    color: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  },
  messenger: {
    ar: "Messenger",
    fr: "Messenger",
    color: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  },
  other: { ar: "أخرى", fr: "Autre", color: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20" },
};

const STATUS_CONFIG: Record<string, { ar: string; fr: string; color: string }> = {
  new: {
    ar: "جديد",
    fr: "Nouveau",
    color: "bg-info-muted text-info border-info/30",
  },
  contacted: {
    ar: "تم التواصل",
    fr: "Contacté",
    color: "bg-warning-muted text-warning border-warning/30",
  },
  qualified: {
    ar: "مؤهل",
    fr: "Qualifié",
    color: "bg-brand-gold-soft text-brand-gold-deep border-brand-gold/30",
  },
  offer_sent: {
    ar: "عرض مرسل",
    fr: "Offre envoyée",
    color: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  },
  follow_up: {
    ar: "متابعة",
    fr: "Relance",
    color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
  confirmed: {
    ar: "مؤكد",
    fr: "Confirmé",
    color: "bg-success-muted text-success border-success/30",
  },
  lost: {
    ar: "ملغي",
    fr: "Perdu",
    color: "bg-muted text-muted-foreground border-border",
  },
};

export function LeadList({
  leads,
  selectedLeadIds,
  onToggleSelectLead,
  onSelectAllVisible,
  onSelectLead,
  onEditLead,
  onArchiveLead,
  onRestoreLead,
  onDeleteLead,
  onChangeStatus,
  hasActiveFilters = false,
  onResetFilters,
  onAddNewLead,
  onImportLeads,
  canDelete = true,
  isRtl = true,
}: LeadListProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const allVisibleSelected = leads.length > 0 && leads.every((l) => selectedLeadIds.includes(l.id));
  const someVisibleSelected =
    leads.some((l) => selectedLeadIds.includes(l.id)) && !allVisibleSelected;

  if (leads.length === 0) {
    return (
      <div className="bg-card border border-border/70 rounded-2xl p-12 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <Clock className="w-7 h-7" />
        </div>

        {hasActiveFilters ? (
          <div className="space-y-2 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-foreground">
              {isRtl
                ? "لا توجد Leads مطابقة للفلاتر الحالية"
                : "Aucun lead ne correspond aux filtres"}
            </h3>
            <p className="text-small text-muted-foreground">
              {isRtl
                ? "جرّب تغيير عبارة البحث، حالة الـ Lead، أو مصدر الوصول لعرض نتائج أخرى."
                : "Essayez de réinitialiser les filtres pour afficher l'ensemble des leads."}
            </p>
            {onResetFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onResetFilters}
                className="mt-2"
              >
                {isRtl ? "إعادة ضبط الفلاتر" : "Réinitialiser les filtres"}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-foreground">
              {isRtl ? "لا توجد Leads مسجلة بعد" : "Aucun lead pour le moment"}
            </h3>
            <p className="text-small text-muted-foreground">
              {isRtl
                ? "ابدأ بتسجيل أول طلب أو استورد قائمة Leads من ملف خارجي لبدء العمليات."
                : "Commencez par ajouter ou importer votre premier lead."}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              {onAddNewLead && (
                <Button type="button" size="sm" onClick={onAddNewLead}>
                  {isRtl ? "+ إضافة Lead" : "Ajouter un lead"}
                </Button>
              )}
              {onImportLeads && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onImportLeads}
                >
                  {isRtl ? "استيراد Leads" : "Importer des leads"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden lg:block bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-small">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold text-caption">
              <tr>
                {/* Select All Checkbox */}
                <th className="py-3.5 px-3 w-10 text-center">
                  <Checkbox
                    checked={
                      allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false
                    }
                    onCheckedChange={(c) => onSelectAllVisible(Boolean(c))}
                    aria-label={isRtl ? "تحديد كل الـ Leads الظاهرة" : "Tout sélectionner"}
                  />
                </th>
                <th className="py-3.5 px-3 text-start">{isRtl ? "العميل" : "Client"}</th>
                <th className="py-3.5 px-3 text-start">{isRtl ? "الهاتف" : "Téléphone"}</th>
                <th className="py-3.5 px-3 text-start">{isRtl ? "الرحلة المطلوبة" : "Voyage"}</th>
                <th className="py-3.5 px-3 text-center">{isRtl ? "المسافرين" : "Pax"}</th>
                <th className="py-3.5 px-3 text-start">{isRtl ? "المصدر" : "Source"}</th>
                <th className="py-3.5 px-3 text-start">{isRtl ? "الحالة" : "Statut"}</th>
                <th className="py-3.5 px-3 text-start">{isRtl ? "الاهتمام" : "Intention"}</th>
                <th className="py-3.5 px-3 text-start">
                  {isRtl ? "المتابعة القادمة" : "Prochaine action"}
                </th>
                <th className="py-3.5 px-3 text-start">{isRtl ? "آخر تحديث" : "Mis à jour"}</th>
                <th className="py-3.5 px-4 text-end w-28">{isRtl ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {leads.map((lead) => {
                const isSelected = selectedLeadIds.includes(lead.id);
                const sourceInfo = SOURCE_LABELS[lead.source] || SOURCE_LABELS.other;
                const statusInfo = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                const isOverdue = lead.next_follow_up_date && lead.next_follow_up_date < todayStr;
                const isToday = lead.next_follow_up_date === todayStr;
                const isArchived = Boolean(lead.archived_at);

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className={cn(
                      "hover:bg-muted/40 transition-colors cursor-pointer group",
                      isSelected && "bg-primary/5",
                      isArchived && "opacity-75 bg-muted/20",
                    )}
                  >
                    {/* Checkbox Column */}
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelectLead(lead.id)}
                        aria-label={`Select ${lead.full_name}`}
                      />
                    </td>

                    {/* Identity & Reference */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                        <span>{lead.full_name}</span>
                        {isArchived && (
                          <span className="text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                            {isRtl ? "مؤرشف" : "Archivé"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-caption text-muted-foreground mt-0.5">
                        <span className="font-mono text-[11px]">{lead.reference}</span>
                        {lead.governorate && (
                          <>
                            <span>•</span>
                            <span className="text-[11px]">{lead.governorate}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Phone with quick call & whatsapp */}
                    <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <div
                        className="flex items-center gap-1.5 font-mono text-caption text-foreground"
                        dir="ltr"
                      >
                        <span>{lead.phone}</span>
                        <a
                          href={`tel:${lead.phone}`}
                          className="p-1 rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                          title={isRtl ? "اتصال هاتفي" : "Appeler"}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={whatsappHref(lead.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-md hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors text-muted-foreground"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>

                    {/* Trip Name & Offer */}
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-foreground line-clamp-1 max-w-[170px]">
                        {lead.trip_name || (isRtl ? "عمرة مخصصة" : "Omra sur mesure")}
                      </div>
                      {lead.offer_amount && (
                        <div className="text-[11px] font-bold text-primary">
                          عرض: {lead.offer_amount} {lead.offer_currency}
                        </div>
                      )}
                    </td>

                    {/* Travelers Count */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{lead.travelers_count}</span>
                      </div>
                    </td>

                    {/* Source */}
                    <td className="py-3.5 px-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border",
                          sourceInfo.color,
                        )}
                      >
                        {isRtl ? sourceInfo.ar : sourceInfo.fr}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-semibold border",
                          statusInfo.color,
                        )}
                      >
                        {isRtl ? statusInfo.ar : statusInfo.fr}
                      </span>
                    </td>

                    {/* Intent Badge */}
                    <td className="py-3.5 px-3">
                      {lead.intent === "high" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          <span>🔥</span>
                          <span>{isRtl ? "عالي" : "Élevée"}</span>
                        </span>
                      ) : lead.intent === "medium" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          <span>⚡</span>
                          <span>{isRtl ? "متوسط" : "Moyenne"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-500/10 px-2 py-0.5 rounded-md">
                          <span>{isRtl ? "منخفض" : "Faible"}</span>
                        </span>
                      )}
                    </td>

                    {/* Next Action / Follow-up */}
                    <td className="py-3.5 px-3">
                      {lead.next_follow_up_date ? (
                        <div className="space-y-0.5">
                          <div
                            className={cn(
                              "text-caption font-bold flex items-center gap-1",
                              isOverdue
                                ? "text-red-600 dark:text-red-400"
                                : isToday
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-emerald-600 dark:text-emerald-400",
                            )}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>{lead.next_follow_up_date}</span>
                          </div>
                          {lead.next_follow_up_time && (
                            <span className="text-[11px] text-muted-foreground">
                              {lead.next_follow_up_time}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-caption text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Updated date */}
                    <td className="py-3.5 px-3">
                      <span className="text-caption text-muted-foreground whitespace-nowrap">
                        {lead.updated_at ? lead.updated_at.split("T")[0] : "—"}
                      </span>
                    </td>

                    {/* Action Dropdown Menu */}
                    <td className="py-3.5 px-4 text-end" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <ActionMenu
                          label={isRtl ? "خيارات الـ Lead" : "Actions du lead"}
                          title={lead.full_name}
                          items={[
                            {
                              key: "open",
                              label: isRtl ? "فتح الملف في الدرج" : "Ouvrir",
                              icon: ChevronLeft,
                              onClick: () => onSelectLead(lead),
                            },
                            {
                              key: "edit",
                              label: isRtl ? "تعديل بيانات Lead" : "Modifier",
                              icon: Edit3,
                              onClick: () => onEditLead(lead),
                            },
                            ...(onChangeStatus
                              ? [
                                  {
                                    key: "status",
                                    label: isRtl ? "تغيير الحالة" : "Changer statut",
                                    icon: RefreshCw,
                                    onClick: () => onChangeStatus(lead),
                                  },
                                ]
                              : []),
                            isArchived
                              ? {
                                  key: "restore",
                                  label: isRtl ? "استرجاع من الأرشيف" : "Restaurer",
                                  icon: RotateCcw,
                                  separatorBefore: true,
                                  onClick: () => onRestoreLead(lead),
                                }
                              : {
                                  key: "archive",
                                  label: isRtl ? "أرشفة الـ Lead" : "Archiver",
                                  icon: Archive,
                                  separatorBefore: true,
                                  onClick: () => onArchiveLead(lead),
                                },
                            ...(canDelete
                              ? [
                                  {
                                    key: "delete",
                                    label: isRtl ? "حذف نهائي" : "Supprimer",
                                    icon: Trash2,
                                    destructive: true,
                                    onClick: () => onDeleteLead(lead),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Touch Cards View */}
      <div className="lg:hidden space-y-3">
        {leads.map((lead) => {
          const isSelected = selectedLeadIds.includes(lead.id);
          const sourceInfo = SOURCE_LABELS[lead.source] || SOURCE_LABELS.other;
          const statusInfo = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
          const isOverdue = lead.next_follow_up_date && lead.next_follow_up_date < todayStr;
          const isToday = lead.next_follow_up_date === todayStr;
          const isArchived = Boolean(lead.archived_at);

          return (
            <div
              key={lead.id}
              onClick={() => onSelectLead(lead)}
              className={cn(
                "bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-3 cursor-pointer transition-all",
                isSelected && "ring-2 ring-primary/60 border-primary bg-primary/5",
                isArchived && "opacity-75 bg-muted/30",
              )}
            >
              {/* Header row: Checkbox, Name, Status, and Dropdown */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelectLead(lead.id)}
                      aria-label={`Select ${lead.full_name}`}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-foreground flex items-center gap-1.5">
                      <span>{lead.full_name}</span>
                      {lead.intent === "high" && <span title="High intent">🔥</span>}
                      {isArchived && (
                        <span className="text-[10px] font-bold bg-amber-500/15 text-amber-700 px-1.5 py-0.2 rounded border border-amber-500/30">
                          {isRtl ? "مؤرشف" : "Archivé"}
                        </span>
                      )}
                    </h4>
                    <div className="text-caption text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-[11px]">{lead.reference}</span>
                      {lead.governorate && (
                        <>
                          <span>•</span>
                          <span>{lead.governorate}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className={cn("font-semibold", sourceInfo.color)}>
                        {isRtl ? sourceInfo.ar : sourceInfo.fr}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-caption font-semibold border shrink-0",
                      statusInfo.color,
                    )}
                  >
                    {isRtl ? statusInfo.ar : statusInfo.fr}
                  </span>

                  <ActionMenu
                    label={isRtl ? "خيارات الـ Lead" : "Actions du lead"}
                    items={[
                      {
                        key: "open",
                        label: isRtl ? "عرض الملف" : "Ouvrir",
                        onClick: () => onSelectLead(lead),
                      },
                      {
                        key: "edit",
                        label: isRtl ? "تعديل" : "Modifier",
                        onClick: () => onEditLead(lead),
                      },
                      isArchived
                        ? {
                            key: "restore",
                            label: isRtl ? "استرجاع" : "Restaurer",
                            onClick: () => onRestoreLead(lead),
                          }
                        : {
                            key: "archive",
                            label: isRtl ? "أرشفة" : "Archiver",
                            onClick: () => onArchiveLead(lead),
                          },
                      ...(canDelete
                        ? [
                            {
                              key: "delete",
                              label: isRtl ? "حذف نهائي" : "Supprimer",
                              destructive: true,
                              onClick: () => onDeleteLead(lead),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </div>

              {/* Trip & Travelers Details */}
              <div className="p-2.5 bg-muted/40 rounded-xl flex items-center justify-between text-small">
                <span className="font-medium text-foreground line-clamp-1">
                  {lead.trip_name || (isRtl ? "عمرة مخصصة" : "Omra")}
                </span>
                <span className="text-caption font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {lead.travelers_count} {isRtl ? "مسافرين" : "voyageurs"}
                </span>
              </div>

              {/* Follow-up Alert if any */}
              {lead.next_follow_up_date && (
                <div
                  className={cn(
                    "text-caption font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg",
                    isOverdue
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : isToday
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {isRtl ? "المتابعة:" : "Relance :"} {lead.next_follow_up_date}{" "}
                    {isOverdue
                      ? isRtl
                        ? "(متأخرة)"
                        : "(en retard)"
                      : isToday
                        ? isRtl
                          ? "(اليوم)"
                          : "(aujourd'hui)"
                        : ""}
                  </span>
                </div>
              )}

              {/* Quick Actions Row */}
              <div
                className="flex items-center gap-2 pt-1 border-t border-border/50"
                onClick={(e) => e.stopPropagation()}
              >
                <a
                  href={`tel:${lead.phone}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-caption transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{isRtl ? "اتصال" : "Appeler"}</span>
                </a>

                <a
                  href={whatsappHref(lead.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-bold text-caption transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectLead(lead)}
                  className="h-9 px-3 rounded-xl font-semibold text-caption"
                >
                  <span>{isRtl ? "الملف" : "Détail"}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
