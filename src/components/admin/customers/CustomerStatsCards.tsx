import { Users, Plane, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { formatMoney } from "@/lib/localize";

export interface CustomerStatsItem {
  totalCount: number;
  activeTripCount: number;
  totalPaid: number;
  totalRemaining: number;
  overdueCount: number;
  currency?: string;
}

interface CustomerStatsCardsProps {
  stats: CustomerStatsItem;
}

export function CustomerStatsCards({ stats }: CustomerStatsCardsProps) {
  const currency = stats.currency || "TND";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {/* 1. Total Clients */}
      <div className="rounded-xl border border-border-subtle bg-card p-4 shadow-sm transition-all hover:border-primary/30">
        <div className="flex items-center justify-between">
          <span className="text-caption font-medium text-muted-foreground">إجمالي العملاء</span>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-h4 font-bold tabular-nums text-foreground">{stats.totalCount}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">مسجلون بالنظام</p>
      </div>

      {/* 2. Active Trips */}
      <div className="rounded-xl border border-border-subtle bg-card p-4 shadow-sm transition-all hover:border-primary/30">
        <div className="flex items-center justify-between">
          <span className="text-caption font-medium text-muted-foreground">رحلات نشطة حالياً</span>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Plane className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-h4 font-bold tabular-nums text-sky-600 dark:text-sky-400">
          {stats.activeTripCount}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">عملاء في رحلات مؤكدة</p>
      </div>

      {/* 3. Total Paid Revenue */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm transition-all hover:border-emerald-500/40">
        <div className="flex items-center justify-between">
          <span className="text-caption font-medium text-emerald-800 dark:text-emerald-300">
            المبالغ المحصلة
          </span>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-h4 font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
          {formatMoney(stats.totalPaid, currency)}
        </p>
        <p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
          دفعات مستلمة ومطابقة
        </p>
      </div>

      {/* 4. Total Remaining Balance */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm transition-all hover:border-amber-500/40">
        <div className="flex items-center justify-between">
          <span className="text-caption font-medium text-amber-800 dark:text-amber-300">
            المتبقي قيد التحصيل
          </span>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-h4 font-bold tabular-nums text-amber-700 dark:text-amber-300">
          {formatMoney(stats.totalRemaining, currency)}
        </p>
        <p className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-400/80">
          أرصدة حجوزات متبقية
        </p>
      </div>

      {/* 5. Overdue Installments */}
      <div className="col-span-2 sm:col-span-1 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 shadow-sm transition-all hover:border-rose-500/40">
        <div className="flex items-center justify-between">
          <span className="text-caption font-medium text-rose-800 dark:text-rose-300">
            أقساط متأخرة
          </span>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-h4 font-bold tabular-nums text-rose-600 dark:text-rose-400">
          {stats.overdueCount}
        </p>
        <p className="mt-1 text-[11px] text-rose-600/80 dark:text-rose-400/80">
          تتطلب متابعة هاتفية
        </p>
      </div>
    </div>
  );
}
