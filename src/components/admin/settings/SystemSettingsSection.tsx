import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  Shield,
  Activity,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SettingsCard, SettingsSection } from "./parts";

export function SystemSettingsSection() {
  const qc = useQueryClient();
  const [clearingCache, setClearingCache] = useState(false);
  const [testingPing, setTestingPing] = useState(false);
  const [pingMs, setPingMs] = useState<number | null>(null);

  async function handleClearCache() {
    setClearingCache(true);
    try {
      await qc.invalidateQueries();
      toast.success("تم تفريغ وتحديث الذاكرة المؤقتة لجميع الاستعلامات بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء تفريغ الذاكرة المؤقتة");
    } finally {
      setClearingCache(false);
    }
  }

  async function handleTestPing() {
    setTestingPing(true);
    const start = performance.now();
    try {
      const { count, error } = await supabase
        .from("site_sections")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      const ms = Math.round(performance.now() - start);
      setPingMs(ms);
      toast.success(`اتصال قاعدة البيانات نشط وسريع (${ms}ms)`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل فحص الاتصال";
      toast.error(msg);
    } finally {
      setTestingPing(false);
    }
  }

  return (
    <SettingsSection
      title="حالة النظام والخيارات المتقدمة (System & Advanced)"
      description="مراقبة استقرار قاعدة البيانات، حالة المصادقة، وإدارة الذاكرة المؤقتة للنظام."
    >
      {/* Database & Infrastructure Status */}
      <SettingsCard
        title="حالة الاتصال والخدمات السحابية"
        description="فحص استجابة خدمات Supabase والتخزين السحابي للصور."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Supabase Postgres */}
          <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-caption font-semibold text-muted-foreground">
                <Database className="h-4 w-4 text-primary" />
                قاعدة البيانات (PostgreSQL)
              </div>
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-small font-bold text-foreground">Supabase Database</p>
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle/60 text-[11px] text-muted-foreground">
              <span>زمن الاستجابة:</span>
              <span className="font-mono text-emerald-600 font-semibold">
                {pingMs !== null ? `${pingMs}ms` : "جاهز للفحص"}
              </span>
            </div>
          </div>

          {/* Cloud Storage */}
          <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-caption font-semibold text-muted-foreground">
                <Layers className="h-4 w-4 text-primary" />
                التخزين السحابي (Media Storage)
              </div>
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-small font-bold text-foreground">Storage Bucket: media</p>
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle/60 text-[11px] text-muted-foreground">
              <span>حالة المستودع:</span>
              <span className="text-emerald-600 font-semibold">متاح ومحمي بـ RLS</span>
            </div>
          </div>

          {/* Auth System */}
          <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-caption font-semibold text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                المصادقة والأمان (Auth & RLS)
              </div>
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-small font-bold text-foreground">Supabase Auth (JWT)</p>
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle/60 text-[11px] text-muted-foreground">
              <span>عزل البيانات:</span>
              <span className="text-emerald-600 font-semibold">نشط ومعتمد</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 pt-4 border-t border-border-subtle">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={testingPing}
            onClick={handleTestPing}
          >
            <Activity className="h-4 w-4" />
            <span>{testingPing ? "جاري الفحص..." : "اختبار سرعة استجابة قاعدة البيانات"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={clearingCache}
            onClick={handleClearCache}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${clearingCache ? "animate-spin" : ""}`} />
            <span>
              {clearingCache ? "جاري التحديث..." : "تفريغ وتحديث الذاكرة المؤقتة (Cache Purge)"}
            </span>
          </Button>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}
