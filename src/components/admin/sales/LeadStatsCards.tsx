import {
  Inbox,
  PhoneCall,
  Star,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertCircle,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalesCenterKPIs } from "@/lib/leads/leads.functions";

interface LeadStatsCardsProps {
  kpis: SalesCenterKPIs;
  activeStatus: string;
  onSelectStatus: (status: string) => void;
  isRtl?: boolean;
}

export function LeadStatsCards({
  kpis,
  activeStatus,
  onSelectStatus,
  isRtl = true,
}: LeadStatsCardsProps) {
  // 6 Primary Operational Cards
  const primaryCards = [
    {
      id: "new",
      label: isRtl ? "Leads جديدة" : "Nouveaux",
      count: kpis.newCount,
      icon: Inbox,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      id: "contacted",
      label: isRtl ? "للاتصال" : "À contacter",
      count: kpis.toContactCount,
      icon: PhoneCall,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      id: "follow_up",
      label: isRtl ? "متابعات اليوم" : "Relances du jour",
      count: kpis.todayCount + kpis.overdueCount,
      subBadge:
        kpis.overdueCount > 0 ? (
          <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {kpis.overdueCount} {isRtl ? "متأخرة" : "en retard"}
          </span>
        ) : null,
      icon: Clock,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
    },
    {
      id: "qualified",
      label: isRtl ? "مؤهلة" : "Qualifiés",
      count: kpis.qualifiedCount,
      icon: Star,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
    {
      id: "offer_sent",
      label: isRtl ? "عروض مرسلة" : "Offres envoyées",
      count: kpis.offersSentCount,
      icon: Send,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/20",
    },
    {
      id: "confirmed",
      label: isRtl ? "مؤكدة (حجوزات)" : "Confirmés",
      count: kpis.confirmedCount,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <div className="space-y-2.5">
      {/* 6 Primary Operational Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {primaryCards.map((c) => {
          const isSelected = activeStatus === c.id;
          const Icon = c.icon;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectStatus(c.id === activeStatus ? "all" : c.id)}
              className={cn(
                "p-3 rounded-2xl border text-start transition-all flex flex-col justify-between relative cursor-pointer group",
                isSelected
                  ? "ring-2 ring-primary border-primary bg-card shadow-sm"
                  : "bg-card border-border/70 hover:border-primary/40",
              )}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <span className="text-caption font-semibold text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1">
                  {c.label}
                </span>
                <div
                  className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                    c.bg,
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", c.color)} />
                </div>
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
                  {c.count}
                </div>
                {c.subBadge && <div className="mt-0.5">{c.subBadge}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Secondary Metrics Compact Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-card border border-border/60 text-caption font-medium text-muted-foreground">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Conversion Rate */}
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span>{isRtl ? "نسبة التحويل:" : "Taux conversion :"}</span>
            <span className="font-mono font-bold text-primary">{kpis.conversionRate}%</span>
          </div>

          <span className="text-border hidden sm:inline">•</span>

          {/* Lost Leads */}
          <button
            type="button"
            onClick={() => onSelectStatus(activeStatus === "lost" ? "all" : "lost")}
            className={cn(
              "flex items-center gap-1.5 transition-colors cursor-pointer hover:text-foreground",
              activeStatus === "lost" && "text-foreground font-bold",
            )}
          >
            <XCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span>{isRtl ? "ملغي / مفقود:" : "Perdus :"}</span>
            <span className="font-mono font-bold text-foreground">{kpis.lostCount}</span>
          </button>

          {/* Overdue alert if any */}
          {kpis.overdueCount > 0 && (
            <>
              <span className="text-border hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>
                  {isRtl
                    ? `${kpis.overdueCount} متابعات متأخرة تحتاج معالجة`
                    : `${kpis.overdueCount} relances en retard`}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Total Active Leads Counter */}
        <div className="text-caption text-muted-foreground">
          <span>{isRtl ? "إجمالي الـ Leads النشطة:" : "Total leads actifs :"} </span>
          <span className="font-mono font-bold text-foreground">{kpis.totalCount}</span>
          {kpis.archivedCount > 0 && (
            <span className="ms-2 text-[11px] text-muted-foreground">
              ({kpis.archivedCount} {isRtl ? "مؤرشفة" : "archivés"})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
