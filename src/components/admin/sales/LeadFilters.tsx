import { useState, useEffect } from "react";
import { Search, Filter, X, Clock, Sparkles, Archive, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  LEAD_SOURCES,
  LEAD_INTENTS,
  TUNISIAN_GOVERNORATES,
  type LeadSource,
  type LeadIntent,
} from "@/lib/leads/leads.schema";

interface LeadFiltersProps {
  status: string;
  source: string;
  intent: string;
  governorate: string;
  followUpUrgency: string;
  archiveState?: string;
  assignedTo?: string;
  assignees?: Array<{ id: string; name: string; email: string }>;
  search: string;
  onStatusChange: (v: string) => void;
  onSourceChange: (v: string) => void;
  onIntentChange: (v: string) => void;
  onGovernorateChange: (v: string) => void;
  onFollowUpUrgencyChange: (v: string) => void;
  onArchiveStateChange?: (v: string) => void;
  onAssignedToChange?: (v: string) => void;
  onSearchChange: (v: string) => void;
  onSavedViewSelect?: (patch: Record<string, string | undefined>) => void;
  onReset: () => void;
  isRtl?: boolean;
}

export function LeadFilters({
  status,
  source,
  intent,
  governorate,
  followUpUrgency,
  archiveState = "active",
  assignedTo = "all",
  assignees = [],
  search,
  onStatusChange,
  onSourceChange,
  onIntentChange,
  onGovernorateChange,
  onFollowUpUrgencyChange,
  onArchiveStateChange,
  onAssignedToChange,
  onSearchChange,
  onSavedViewSelect,
  onReset,
  isRtl = true,
}: LeadFiltersProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounce search by 300ms
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);

  const hasActiveFilters =
    status !== "all" ||
    source !== "all" ||
    intent !== "all" ||
    governorate !== "all" ||
    followUpUrgency !== "all" ||
    archiveState !== "active" ||
    !!search;

  const STATUS_TABS = [
    { id: "all", labelAr: "الكل", labelFr: "Tous" },
    { id: "new", labelAr: "جديدة", labelFr: "Nouveaux" },
    { id: "contacted", labelAr: "تم التواصل", labelFr: "Contactés" },
    { id: "qualified", labelAr: "مؤهل", labelFr: "Qualifiés" },
    { id: "offer_sent", labelAr: "عرض مرسل", labelFr: "Offre envoyée" },
    { id: "follow_up", labelAr: "متابعة", labelFr: "Relance" },
    { id: "confirmed", labelAr: "مؤكد", labelFr: "Confirmés" },
    { id: "lost", labelAr: "ملغي", labelFr: "Perdus" },
  ];

  const SAVED_VIEWS = [
    {
      id: "fresh_leads",
      labelAr: "⚡ جديدة لم تُعالج",
      apply: () => {
        onStatusChange("new");
        onFollowUpUrgencyChange("all");
        onIntentChange("all");
      },
      isActive: status === "new" && followUpUrgency === "all",
    },
    {
      id: "call_today",
      labelAr: "📞 يلزم الاتصال اليوم",
      apply: () => {
        onStatusChange("all");
        onFollowUpUrgencyChange("today");
      },
      isActive: followUpUrgency === "today",
    },
    {
      id: "overdue_leads",
      labelAr: "⚠️ متابعات متأخرة",
      apply: () => {
        onStatusChange("all");
        onFollowUpUrgencyChange("overdue");
      },
      isActive: followUpUrgency === "overdue",
    },
    {
      id: "high_intent",
      labelAr: "🔥 High Intent",
      apply: () => {
        onIntentChange("high");
      },
      isActive: intent === "high",
    },
    {
      id: "offers_sent",
      labelAr: "📄 عروض مرسلة",
      apply: () => {
        onStatusChange("offer_sent");
      },
      isActive: status === "offer_sent",
    },
  ];

  return (
    <div className="space-y-3.5 bg-card p-4 md:p-5 rounded-2xl border border-border/70 shadow-xs">
      {/* Primary Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Debounced Search Bar */}
        <div className="lg:col-span-5 relative">
          <Search className="w-4 h-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={
              isRtl
                ? "بحث بالاسم، رقم الهاتف، أو المرجع..."
                : "Recherche par nom, tél ou référence..."
            }
            className="ps-9 h-10 text-small rounded-xl"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch("");
                onSearchChange("");
              }}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Source Dropdown */}
        <div className="lg:col-span-2">
          <Select value={source} onValueChange={onSourceChange}>
            <SelectTrigger className="w-full h-10 text-small">
              <SelectValue placeholder={isRtl ? "كل المصادر" : "Toutes les sources"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRtl ? "كل المصادر" : "Toutes les sources"}</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "website" && (isRtl ? "الموقع (تواصل)" : "Site web")}
                  {s === "umrah_builder" && (isRtl ? "مصمم العمرة" : "Builder Omra")}
                  {s === "meta_ads" && "Meta Ads"}
                  {s === "instagram_organic" && "Instagram"}
                  {s === "facebook" && "Facebook"}
                  {s === "whatsapp" && "WhatsApp"}
                  {s === "phone" && (isRtl ? "مكالمة هاتفية" : "Téléphone")}
                  {s === "branch" && (isRtl ? "زيارة فرع" : "Agence")}
                  {s === "messenger" && "Messenger"}
                  {s === "other" && (isRtl ? "أخرى" : "Autre")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Intent Dropdown */}
        <div className="lg:col-span-2">
          <Select value={intent} onValueChange={onIntentChange}>
            <SelectTrigger className="w-full h-10 text-small">
              <SelectValue placeholder={isRtl ? "درجة الاهتمام" : "Intention"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {isRtl ? "كل درجات الاهتمام" : "Toutes intentions"}
              </SelectItem>
              <SelectItem value="high">{isRtl ? "🔥 اهتمام عالي" : "🔥 Forte"}</SelectItem>
              <SelectItem value="medium">{isRtl ? "⚡ اهتمام متوسط" : "⚡ Moyenne"}</SelectItem>
              <SelectItem value="low">{isRtl ? "💤 اهتمام منخفض" : "💤 Faible"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Follow-up Urgency Dropdown */}
        <div className="lg:col-span-2">
          <Select value={followUpUrgency} onValueChange={onFollowUpUrgencyChange}>
            <SelectTrigger className="w-full h-10 text-small">
              <SelectValue placeholder={isRtl ? "حالة المتابعة" : "Échéance"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRtl ? "كل المواعيد" : "Toutes échéances"}</SelectItem>
              <SelectItem value="overdue">
                {isRtl ? "🔴 متأخرة عن الموعد" : "🔴 En retard"}
              </SelectItem>
              <SelectItem value="today">{isRtl ? "🟡 مستحقة اليوم" : "🟡 Aujourd'hui"}</SelectItem>
              <SelectItem value="upcoming">{isRtl ? "🟢 مواعيد قادمة" : "🟢 À venir"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggle Advanced Filters Button */}
        <div className="lg:col-span-1 flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-10 px-2.5 text-caption font-semibold text-muted-foreground hover:text-foreground gap-1 rounded-xl w-full sm:w-auto"
            title={isRtl ? "المزيد من الفلاتر" : "Plus de filtres"}
          >
            <Filter className="w-3.5 h-3.5" />
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Secondary / Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2 border-t border-border/50 animate-in fade-in duration-150">
          {/* Governorate Dropdown */}
          <div className="lg:col-span-4">
            <Select value={governorate} onValueChange={onGovernorateChange}>
              <SelectTrigger className="w-full h-10 text-small">
                <SelectValue placeholder={isRtl ? "تصفية حسب الولاية" : "Gouvernorat"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRtl ? "كل الولايات" : "Tous gouvernorats"}</SelectItem>
                {TUNISIAN_GOVERNORATES.map((gov) => (
                  <SelectItem key={gov.id} value={isRtl ? gov.ar : gov.fr}>
                    {isRtl ? gov.ar : gov.fr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Archive View State Toggle */}
          {onArchiveStateChange && (
            <div className="lg:col-span-2">
              <Select value={archiveState} onValueChange={onArchiveStateChange}>
                <SelectTrigger className="w-full h-10 text-small">
                  <SelectValue placeholder={isRtl ? "عرض السجلات" : "Affichage"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{isRtl ? "📁 نشطة فقط" : "📁 Actifs"}</SelectItem>
                  <SelectItem value="archived">{isRtl ? "📦 الأرشيف" : "📦 Archivés"}</SelectItem>
                  <SelectItem value="all">{isRtl ? "🗂 الكل" : "🗂 Tous"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assigned Salesperson Filter */}
          {onAssignedToChange && assignees.length > 0 && (
            <div className="lg:col-span-2">
              <Select value={assignedTo} onValueChange={onAssignedToChange}>
                <SelectTrigger className="w-full h-10 text-small">
                  <SelectValue placeholder={isRtl ? "المسؤول" : "Assigné à"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "كل المسؤولين" : "Tous les agents"}</SelectItem>
                  <SelectItem value="unassigned">
                    {isRtl ? "غير معين (Unassigned)" : "Non assigné"}
                  </SelectItem>
                  {assignees.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name || a.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Quick Saved Views Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-caption font-bold text-muted-foreground shrink-0 me-1">
          {isRtl ? "طرق عرض سريعة:" : "Vues :"}
        </span>
        {SAVED_VIEWS.map((sv) => (
          <button
            key={sv.id}
            type="button"
            onClick={sv.apply}
            className={cn(
              "px-3 py-1 rounded-full text-caption font-semibold transition-all shrink-0 cursor-pointer border",
              sv.isActive
                ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                : "bg-muted/50 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {sv.labelAr}
          </button>
        ))}
      </div>

      {/* Horizontal Status Pipeline Tabs & Reset Action */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5 shrink-0">
          {STATUS_TABS.map((tab) => {
            const isSelected = status === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onStatusChange(tab.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-caption font-semibold transition-all shrink-0 cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {isRtl ? tab.labelAr : tab.labelFr}
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>{isRtl ? "إعادة الضبط" : "Réinitialiser"}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
