import { SearchInput } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, RotateCcw, FileText, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterCounts {
  all: number;
  active_trip: number;
  unpaid: number;
  overdue: number;
  customer: number;
  lead: number;
  vip: number;
  inactive: number;
}

interface CustomerFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  cities: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: FilterCounts;
  onExportCsv: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function CustomerFilters({
  search,
  onSearchChange,
  selectedCity,
  onCityChange,
  cities,
  activeFilter,
  onFilterChange,
  counts,
  onExportCsv,
  onClearFilters,
  hasActiveFilters,
}: CustomerFiltersProps) {
  const filterTabs = [
    { id: "all", label: "جميع العملاء", count: counts.all },
    { id: "active_trip", label: "رحلات نشطة", count: counts.active_trip },
    { id: "unpaid", label: "مبالغ متبقية", count: counts.unpaid },
    { id: "overdue", label: "أقساط متأخرة", count: counts.overdue, urgent: true },
    { id: "customer", label: "عملاء بحجوزات", count: counts.customer },
    { id: "lead", label: "طلبات جديدة", count: counts.lead },
    { id: "vip", label: "عملاء VIP", count: counts.vip },
    { id: "inactive", label: "أرشيف / غير نشط", count: counts.inactive },
  ];

  return (
    <div className="space-y-3.5">
      {/* Search and Action Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="ابحث بالاسم، رقم الهاتف، البريد أو المدينة..."
            className="w-full sm:max-w-xs md:max-w-sm"
          />

          {cities.length > 0 && (
            <Select value={selectedCity} onValueChange={onCityChange}>
              <SelectTrigger className="w-[140px] text-xs h-9">
                <MapPin className="me-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="المدينة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المدن ({cities.length})</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              إعادة ضبط
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* Segmented Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-3">
        <span className="me-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Filter className="h-3 w-3" />
          تصفية:
        </span>
        {filterTabs.map((tab) => {
          const active = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.2 text-xs font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                tab.urgent &&
                  tab.count > 0 &&
                  !active &&
                  "border border-rose-500/30 bg-rose-50/50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300",
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-bold",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : tab.urgent && tab.count > 0
                      ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
