import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  ExternalLink,
  ArrowUpRight,
  CheckCircle2,
  Star,
  Eye,
  EyeOff,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { branchesQuery, type Branch } from "@/lib/queries";
import { useLocalized } from "@/lib/localize";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsCard, SettingsSection } from "./parts";

export function BranchesSettingsSection() {
  const qc = useQueryClient();
  const { L } = useLocalized();
  const { data: branches = [], isLoading } = useQuery(branchesQuery());

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      setTogglingId(id);
      const { error } = await supabase.from("branches").update({ is_active }).eq("id", id);
      if (error) throw error;
      return { id, is_active };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast.success("تم تحديث حالة تفعيل الفرع بنجاح");
    },
    onError: (err: Error) => {
      toast.error(err.message || "فشل تحديث حالة الفرع");
    },
    onSettled: () => setTogglingId(null),
  });

  const setMainBranchMutation = useMutation({
    mutationFn: async (mainId: string) => {
      // 1. Reset all branches is_main_branch to false
      const { error: resetErr } = await supabase
        .from("branches")
        .update({ is_main_branch: false })
        .neq("id", mainId);
      if (resetErr) throw resetErr;

      // 2. Set chosen branch is_main_branch to true
      const { error: setErr } = await supabase
        .from("branches")
        .update({ is_main_branch: true })
        .eq("id", mainId);
      if (setErr) throw setErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast.success("تم تعيين الفرع كمقر رئيسي بنجاح");
    },
    onError: (err: Error) => {
      toast.error(err.message || "فشل تعيين المقر الرئيسي");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  const activeBranches = branches.filter((b) => b.is_active);

  return (
    <SettingsSection
      title="إدارة الفروع والمواقع (Branches Management)"
      description="مكاتب الوكالة الرسمية المنشورة على الخريطة وتذييل الموقع العام للمسافرين."
    >
      {/* Overview Card */}
      <SettingsCard
        title="فروع الوكالة النشطة"
        description="تُعرض هذه البيانات تلقائياً في صفحة الفروع وخريطة الاتصال وتذييل الموقع."
        actions={
          <Button asChild variant="outline" size="xs">
            <Link to="/admin/branches">
              <span>إدارة الفروع المتقدمة (CRUD)</span>
              <ArrowUpRight className="h-3.5 w-3.5 rtl:rotate-[-90deg]" />
            </Link>
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {branches.map((b) => {
            const cityName = L(b, "city", "base");
            const branchName = L(b, "name", "base");
            const address = L(b, "address", "base");
            const phone = b.phone?.trim();
            const isMain = Boolean(b.is_main_branch);
            const isActive = b.is_active !== false;
            const mapsUrl =
              b.google_maps_url?.trim() ||
              (b.latitude && b.longitude
                ? `https://www.google.com/maps/search/?api=1&query=${Number(b.latitude)},${Number(b.longitude)}`
                : null);

            return (
              <div
                key={b.id}
                className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
                  isMain
                    ? "border-secondary/40 bg-secondary/[0.04]"
                    : isActive
                      ? "border-border-subtle bg-surface-sunken/40"
                      : "border-border-subtle bg-surface-sunken/20 opacity-60"
                }`}
              >
                <div>
                  {/* Header Row: City, Main Badge & Active Switch */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-body font-bold text-foreground truncate">
                          {cityName || branchName}
                        </h4>
                        {isMain && (
                          <span className="inline-flex items-center gap-1 rounded bg-secondary/20 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                            <Star className="h-3 w-3 fill-secondary" />
                            المقر الرئيسي
                          </span>
                        )}
                      </div>
                      {branchName && branchName !== cityName && (
                        <p className="mt-0.5 text-caption text-muted-foreground truncate">
                          {branchName}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {isActive ? "نشط" : "معطل"}
                      </span>
                      <Switch
                        checked={isActive}
                        disabled={togglingId === b.id}
                        onCheckedChange={(next) =>
                          toggleActiveMutation.mutate({ id: b.id, is_active: next })
                        }
                        aria-label={`تفعيل فرع ${cityName}`}
                      />
                    </div>
                  </div>

                  {/* Address */}
                  {address && (
                    <div className="mt-2.5 flex items-start gap-2 text-caption text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="line-clamp-2 leading-relaxed">{address}</span>
                    </div>
                  )}

                  {/* Phone */}
                  {phone && (
                    <div
                      className="mt-2 flex items-center gap-2 text-caption font-mono text-foreground"
                      dir="ltr"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{phone}</span>
                    </div>
                  )}
                </div>

                {/* Footer Quick Actions */}
                <div className="mt-4 pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {phone && (
                      <Button
                        asChild
                        variant="ghost"
                        size="xs"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
                          <Phone className="h-3 w-3" />
                          <span>اتصال</span>
                        </a>
                      </Button>
                    )}
                    {mapsUrl && (
                      <Button
                        asChild
                        variant="ghost"
                        size="xs"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                          <span>الخريطة</span>
                        </a>
                      </Button>
                    )}
                  </div>

                  {!isMain && isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={setMainBranchMutation.isPending}
                      onClick={() => setMainBranchMutation.mutate(b.id)}
                      className="h-7 px-2 text-[11px] text-secondary hover:text-secondary gap-1"
                    >
                      <Star className="h-3 w-3" />
                      <span>تعيين رئيسي</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}
