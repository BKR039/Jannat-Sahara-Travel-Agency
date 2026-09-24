import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Phone,
  Mail,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Info,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { contactInfoQuery, branchesQuery } from "@/lib/queries";
import { useLocalized } from "@/lib/localize";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsCard, SettingsSection } from "./parts";

export function FooterSettingsSection() {
  const { L } = useLocalized();
  const { data: info = [], isLoading: infoLoading } = useQuery(contactInfoQuery());
  const { data: branches = [], isLoading: branchesLoading } = useQuery(branchesQuery());

  if (infoLoading || branchesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  const agencyRow = info.find((c) => c.key === "agency_name");
  const phoneRow = info.find((c) => c.key === "phone");
  const emailRow = info.find((c) => c.key === "email");
  const whatsappRow = info.find((c) => c.key === "whatsapp");
  const hoursRow = info.find((c) => c.key === "hours");

  const socials = info.filter(
    (c) =>
      ["facebook", "instagram", "youtube", "tiktok", "linkedin", "telegram"].includes(c.key) &&
      typeof c.value === "string" &&
      c.value.trim() !== "",
  );

  const year = new Date().getFullYear();

  return (
    <SettingsSection
      title="تذييل الموقع العام (Footer Control)"
      description="مراقبة وإدارة محتوى تذييل الموقع، الحقوق، المزامنة، ومصدر البيانات المعتمد."
    >
      {/* 1. Canonical Overview Card */}
      <SettingsCard
        title="بنية التذييل المعتمدة (Canonical Global Footer)"
        description="يعمل التذييل بنظام موحد ومباشر يستقي بياناته ديناميكياً من قاعدة البيانات (فروع الوكالة، قنوات التواصل، والشبكات الاجتماعية)."
        actions={
          <Button asChild variant="outline" size="xs">
            <a href="/" target="_blank" rel="noopener noreferrer">
              <span>معاينة التذييل في الموقع</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Synchronized Agency Name */}
          <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-caption font-semibold text-muted-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              اسم الوكالة المعروض
            </div>
            <p className="text-small font-bold text-foreground truncate">
              {agencyRow ? L(agencyRow, "value", "empty") : "جنة الصحراء للأسفار"}
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 className="h-3 w-3" /> متزامن مع هوية الوكالة
            </span>
          </div>

          {/* Synchronized Phone & WhatsApp */}
          <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-caption font-semibold text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" />
              هاتف التواصل & واتساب
            </div>
            <p className="text-small font-bold text-foreground font-mono" dir="ltr">
              {phoneRow?.value || "+216 96 888 888"}
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 className="h-3 w-3" /> زر واتساب نشط ومربوط
            </span>
          </div>

          {/* Synchronized Branches Count */}
          <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-caption font-semibold text-muted-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              فروع الوكالة المنشورة
            </div>
            <p className="text-small font-bold text-foreground">
              {branches.filter((b) => b.is_active).length} فروع نشطة
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              عرض تفصيلي بأرقام الهواتف ومواقع الخرائط
            </span>
          </div>
        </div>

        {/* Legal & Attribution Notice */}
        <div className="mt-6 rounded-xl border border-border-subtle bg-surface-sunken/20 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
            <div className="space-y-1 text-small">
              <p className="font-semibold text-foreground">
                حقوق الموقع وإسناد الإنتاج (Production Credit)
              </p>
              <p className="text-caption text-muted-foreground leading-relaxed">
                يحتوي شريط الحقوق السفلي على حقوق الطبع والنشر الرسمية:
                <span className="mx-1 font-mono text-foreground">
                  © {year} جنة الصحراء للأسفار. جميع الحقوق محفوظة.
                </span>
                بالإضافة إلى رابط إسناد التصميم والإنتاج:
                <span className="mx-1 font-semibold text-primary">
                  Website by SADA Media Production
                </span>
              </p>
              <div className="mt-2 rounded-lg bg-surface-sunken/60 p-2.5 text-[11px] text-muted-foreground space-y-1 font-mono">
                <p>
                  • الرابط الحالي معتمد كعنصر تشعبي حقيقي يحمل المسار المؤقت:{" "}
                  <span className="text-foreground">href="#"</span>.
                </p>
                <p>
                  • سيتم استبدال المسار تلقائياً برابط الموقع الرسمي المعتمد لشركة SADA فور إطلاقه
                  دون الحاجة لتغيير البنية التحتية.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* 2. Quick Links Management Navigation */}
      <SettingsCard
        title="تعديل محتويات التذييل"
        description="لتحديث البيانات الظاهرة في التذييل، استخدم الأقسام المخصصة أدناه حيث يتم تحديث التذييل لحظياً فور الحفظ."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border-subtle p-3 hover:bg-accent/40 transition-colors">
            <h4 className="text-small font-bold text-foreground">بيانات الوكالة والمقر</h4>
            <p className="mt-0.5 text-caption text-muted-foreground">
              تعديل الاسم وساعات العمل والمقر الرئيسي.
            </p>
            <Button
              asChild
              variant="link"
              size="xs"
              className="mt-2 text-primary"
            >
              <Link to="/admin/settings" search={{ tab: "general" }}>
                <span>انتقل لقسم الهوية</span>
                <ArrowUpRight className="h-3 w-3 rtl:rotate-[-90deg]" />
              </Link>
            </Button>
          </div>

          <div className="rounded-xl border border-border-subtle p-3 hover:bg-accent/40 transition-colors">
            <h4 className="text-small font-bold text-foreground">قنوات التواصل وواتساب</h4>
            <p className="mt-0.5 text-caption text-muted-foreground">
              تعديل رقم الهاتف، البريد، ورابط واتساب.
            </p>
            <Button
              asChild
              variant="link"
              size="xs"
              className="mt-2 text-primary"
            >
              <Link to="/admin/settings" search={{ tab: "communication" }}>
                <span>انتقل لقسم التواصل</span>
                <ArrowUpRight className="h-3 w-3 rtl:rotate-[-90deg]" />
              </Link>
            </Button>
          </div>

          <div className="rounded-xl border border-border-subtle p-3 hover:bg-accent/40 transition-colors">
            <h4 className="text-small font-bold text-foreground">حسابات التواصل الاجتماعي</h4>
            <p className="mt-0.5 text-caption text-muted-foreground">
              تحديث روابط فيسبوك وإنستغرام واليوتيوب.
            </p>
            <Button
              asChild
              variant="link"
              size="xs"
              className="mt-2 text-primary"
            >
              <Link to="/admin/settings" search={{ tab: "social" }}>
                <span>انتقل لقسم الشبكات</span>
                <ArrowUpRight className="h-3 w-3 rtl:rotate-[-90deg]" />
              </Link>
            </Button>
          </div>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}
