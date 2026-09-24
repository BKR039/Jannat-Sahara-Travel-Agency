import { Phone, MessageCircle, MapPin, Building2, Users, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, SkeletonRows, relativeDate } from "@/components/admin/kit";
import { formatMoney } from "@/lib/localize";
import { cn } from "@/lib/utils";
import type { CustomerSummary } from "@/types/customer";

interface CustomerListProps {
  customers: CustomerSummary[];
  isLoading: boolean;
  onSelectCustomer: (key: string) => void;
  selectedCustomerKey?: string;
}

const cleanPhoneDigits = (phone: string | null) => (phone ?? "").replace(/[^\d+]/g, "");

export function CustomerList({
  customers,
  isLoading,
  onSelectCustomer,
  selectedCustomerKey,
}: CustomerListProps) {
  if (isLoading) {
    return (
      <div className="p-4">
        <SkeletonRows rows={8} />
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Users}
          title="لم يتم العثور على عملاء مطابقين"
          description="جرّب تعديل معايير البحث أو تغيير الفلتر المحدد لاستعراض باقي العملاء."
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-start text-xs">
          <thead>
            <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
              <th className="py-3 px-4 text-start font-semibold">العميل ومعلومات الاتصال</th>
              <th className="py-3 px-3 text-start font-semibold">الموقع والفرع</th>
              <th className="py-3 px-3 text-start font-semibold">الحالة والنشاط</th>
              <th className="py-3 px-3 text-start font-semibold">الحجوزات</th>
              <th className="py-3 px-4 text-end font-semibold">المعاملات المالية</th>
              <th className="py-3 px-3 text-start font-semibold">آخر نشاط</th>
              <th className="py-3 px-4 text-end font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {customers.map((c) => {
              const isSelected = selectedCustomerKey === c.key;
              const hasRemaining = c.totalRemaining > 0;
              const phoneDigits = cleanPhoneDigits(c.phone);

              return (
                <tr
                  key={c.key}
                  onClick={() => onSelectCustomer(c.key)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    isSelected && "bg-primary/5 font-medium",
                  )}
                >
                  {/* Client Info */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground text-sm">{c.name}</span>
                        {c.status === "vip" && (
                          <Badge
                            variant="outline"
                            className="border-purple-500/30 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 text-[10px] py-0 px-1"
                          >
                            VIP
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-[11px]">
                        {c.phone && (
                          <span dir="ltr" className="font-mono">
                            {c.phone}
                          </span>
                        )}
                        {c.phone && c.email && <span>·</span>}
                        {c.email && <span className="truncate max-w-[180px]">{c.email}</span>}
                      </div>
                    </div>
                  </td>

                  {/* Location & Branch */}
                  <td className="py-3.5 px-3">
                    <div className="space-y-1">
                      {c.city ? (
                        <span className="inline-flex items-center gap-1 text-foreground font-medium">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {c.city}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/70">—</span>
                      )}
                      {c.branchName && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          فرع {c.branchName}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Status & Flags */}
                  <td className="py-3.5 px-3">
                    <div className="flex flex-col gap-1 items-start">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          c.status === "customer"
                            ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                            : c.status === "lead"
                              ? "border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                              : c.status === "inactive"
                                ? "border-muted-foreground/30 bg-muted text-muted-foreground"
                                : c.status === "cancelled"
                                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                                  : "border-border text-foreground",
                        )}
                      >
                        {c.status === "customer"
                          ? "عميل فعلي"
                          : c.status === "lead"
                            ? "محتمل (Lead)"
                            : c.status === "vip"
                              ? "عميل VIP"
                              : c.status === "inactive"
                                ? "أرشيف / غير نشط"
                                : c.status}
                      </Badge>
                      {c.hasActiveTrip && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          رحلة جارية
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Bookings & Last Trip */}
                  <td className="py-3.5 px-3">
                    <div>
                      <span className="font-bold tabular-nums text-foreground">
                        {c.bookings}{" "}
                        <span className="text-[11px] font-normal text-muted-foreground">رحلات</span>
                      </span>
                      {c.lastTrip && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground truncate max-w-[150px]">
                          {c.lastTrip}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Financials */}
                  <td className="py-3.5 px-4 text-end">
                    <div className="space-y-0.5">
                      <div className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatMoney(c.totalPaid, c.currency)}
                      </div>
                      {hasRemaining ? (
                        <div className="text-[11px] font-bold tabular-nums text-amber-600 dark:text-amber-400">
                          متبقي: {formatMoney(c.totalRemaining, c.currency)}
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground">خالص</div>
                      )}
                    </div>
                  </td>

                  {/* Last Activity */}
                  <td className="py-3.5 px-3 text-muted-foreground text-[11px]">
                    {relativeDate(c.lastActivity)}
                  </td>

                  {/* Quick Actions */}
                  <td className="py-3.5 px-4 text-end" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {phoneDigits && (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-emerald-600"
                        >
                          <a href={`tel:${phoneDigits}`} title="اتصال هاتفي">
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      {phoneDigits && (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-emerald-600"
                        >
                          <a
                            target="_blank"
                            rel="noreferrer"
                            href={`https://wa.me/${phoneDigits.replace(/^\+/, "")}`}
                            title="واتساب"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectCustomer(c.key)}
                        className="h-7 gap-1 text-xs font-medium"
                      >
                        الملف
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="divide-y divide-border/60 lg:hidden">
        {customers.map((c) => {
          const isSelected = selectedCustomerKey === c.key;
          const phoneDigits = cleanPhoneDigits(c.phone);

          return (
            <div
              key={c.key}
              onClick={() => onSelectCustomer(c.key)}
              className={cn(
                "p-4 transition-colors cursor-pointer hover:bg-muted/40",
                isSelected && "bg-primary/5",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground text-sm">{c.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        c.status === "vip"
                          ? "border-purple-500/30 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300"
                          : c.status === "customer"
                            ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                            : "border-border text-muted-foreground",
                      )}
                    >
                      {c.status === "vip"
                        ? "VIP"
                        : c.status === "customer"
                          ? "عميل"
                          : c.status === "lead"
                            ? "محتمل"
                            : c.status === "inactive"
                              ? "غير نشط"
                              : c.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {c.phone && (
                      <span dir="ltr" className="font-mono">
                        {c.phone}
                      </span>
                    )}
                    {c.city && <span>· {c.city}</span>}
                    {c.branchName && <span>· فرع {c.branchName}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {phoneDigits && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-emerald-600"
                    >
                      <a href={`tel:${phoneDigits}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {phoneDigits && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-emerald-600"
                    >
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={`https://wa.me/${phoneDigits.replace(/^\+/, "")}`}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Financial & Trip Metrics */}
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground">الحجوزات</span>
                  <p className="font-bold tabular-nums text-foreground">{c.bookings}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">المدفوع</span>
                  <p className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatMoney(c.totalPaid, c.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">المتبقي</span>
                  <p
                    className={cn(
                      "font-bold tabular-nums",
                      c.totalRemaining > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatMoney(c.totalRemaining, c.currency)}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>آخر نشاط: {relativeDate(c.lastActivity)}</span>
                <span className="text-primary font-medium flex items-center gap-0.5">
                  عرض الملف الكامل <ChevronLeft className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
