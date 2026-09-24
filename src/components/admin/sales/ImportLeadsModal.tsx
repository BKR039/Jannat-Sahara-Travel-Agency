import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerFn } from "@tanstack/react-start";
import { importLeadsBatch, type LeadRow } from "@/lib/leads/leads.functions";
import {
  parseCsv,
  autoMapColumns,
  validateImportRows,
  generateSampleCsvTemplate,
  generateCsv,
  type ParsedCsvTable,
  type LeadFieldKey,
  type ValidatedImportRow,
  LEAD_FIELD_DEFINITIONS,
} from "@/lib/leads/csv-engine";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadSource,
  type LeadStatus,
} from "@/lib/leads/leads.schema";
import { toast } from "sonner";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLeads?: LeadRow[];
  onImportComplete: () => void;
  isRtl?: boolean;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export function ImportLeadsModal({
  open,
  onOpenChange,
  existingLeads = [],
  onImportComplete,
  isRtl = true,
}: ImportLeadsModalProps) {
  const importBatchFn = useServerFn(importLeadsBatch);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>(1);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [parsedTable, setParsedTable] = useState<ParsedCsvTable | null>(null);
  const [mapping, setMapping] = useState<Record<LeadFieldKey, number | null>>({
    fullName: null,
    phone: null,
    email: null,
    governorate: null,
    city: null,
    tripName: null,
    travelersCount: null,
    source: null,
    notes: null,
    status: null,
  });

  const [defaultSource, setDefaultSource] = useState<LeadSource>("other");
  const [defaultStatus, setDefaultStatus] = useState<LeadStatus>("new");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update" | "new">("skip");

  const [validatedRows, setValidatedRows] = useState<ValidatedImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const resetWizard = () => {
    setStep(1);
    setFileName("");
    setFileSize("");
    setParsedTable(null);
    setValidatedRows([]);
    setImportResult(null);
  };

  // STEP 1: Handle File Selection
  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv") && !file.name.toLowerCase().endsWith(".txt")) {
      toast.error(isRtl ? "يرجى اختيار ملف بصيغة CSV" : "Veuillez sélectionner un fichier CSV");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        isRtl
          ? "حجم الملف كبير جدًا (الحد الأقصى 5 ميغابايت)"
          : "Fichier trop volumineux (max 5 Mo)",
      );
      return;
    }

    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      try {
        const parsed = parseCsv(text);
        if (parsed.headers.length === 0 || parsed.rows.length === 0) {
          toast.error(isRtl ? "الملف فارغ أو غير منسق بشكل صحيح" : "Le fichier est vide");
          return;
        }

        setParsedTable(parsed);
        const autoMap = autoMapColumns(parsed.headers);
        setMapping(autoMap);
        setStep(2);
      } catch (err: any) {
        console.error("CSV parse error", err);
        toast.error(isRtl ? "تعذر قراءة ملف CSV" : "Erreur de lecture du fichier CSV");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const csvContent = generateSampleCsvTemplate();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jannat_sahara_leads_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Proceed from Mapping (Step 3) to Validation (Step 4)
  const handleProceedToValidation = () => {
    if (!parsedTable) return;
    if (mapping.fullName === null) {
      toast.error(isRtl ? "يرجى تحديد عمود اسم العميل" : "Veuillez associer la colonne Nom");
      return;
    }
    if (mapping.phone === null) {
      toast.error(isRtl ? "يرجى تحديد عمود رقم الهاتف" : "Veuillez associer la colonne Téléphone");
      return;
    }

    const validated = validateImportRows(parsedTable.rows, mapping, defaultSource, defaultStatus);
    setValidatedRows(validated);
    setStep(4);
  };

  // Execute Batch Import (Step 5)
  const handleExecuteImport = async () => {
    const validRowsToSubmit = validatedRows.filter((r) => r.isValid).map((r) => r.data);
    if (validRowsToSubmit.length === 0) {
      toast.error(isRtl ? "لا توجد صفوف صالحة للاستيراد" : "Aucune ligne valide à importer");
      return;
    }

    setStep(5);
    setImporting(true);

    try {
      const res = await importBatchFn({
        data: {
          rows: validRowsToSubmit,
          duplicateStrategy,
          defaultSource,
          defaultStatus,
        },
      });

      setImportResult(res);
      setStep(6);
      onImportComplete();
      toast.success(
        isRtl ? `تم استيراد ${res.imported} Leads بنجاح` : `${res.imported} leads importés`,
      );
    } catch (err: any) {
      console.error("Batch import error", err);
      toast.error(err?.message || (isRtl ? "فشل الاستيراد الجماعي" : "Échec de l'importation"));
      setStep(4);
    } finally {
      setImporting(false);
    }
  };

  // Download Error Report CSV
  const handleDownloadErrorReport = () => {
    if (!importResult || importResult.errors.length === 0) return;
    const errorCsv = generateCsv(
      ["السطر / الخطأ"],
      importResult.errors.map((e) => [e]),
    );
    const blob = new Blob([errorCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `import_errors_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Step Indicators
  const STEP_LABELS = [
    { num: 1, labelAr: "اختيار الملف" },
    { num: 2, labelAr: "المعاينة" },
    { num: 3, labelAr: "ربط الأعمدة" },
    { num: 4, labelAr: "التحقق والتكرار" },
    { num: 5, labelAr: "استيراد" },
    { num: 6, labelAr: "النتيجة" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetWizard();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  {isRtl ? "استيراد Leads من ملف CSV" : "Importer des leads"}
                </DialogTitle>
                <p className="text-caption text-muted-foreground mt-0.5">
                  {isRtl
                    ? "معالج استيراد بيانات العملاء المحتملين والتحقق الذكي من التكرارات"
                    : "Assistant d'importation et détection des doublons"}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleDownloadTemplate}
              className="shrink-0"
              title={isRtl ? "تحميل نموذج CSV التجريبي" : "Télécharger modèle"}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isRtl ? "نموذج CSV جاهز" : "Modèle CSV"}</span>
            </Button>
          </div>

          {/* Stepper progress bar */}
          <div className="grid grid-cols-6 gap-1.5 pt-3">
            {STEP_LABELS.map((s) => (
              <div
                key={s.num}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  step >= s.num ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </DialogHeader>

        {/* STEP 1: File Upload */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/80 hover:border-primary/60 hover:bg-primary/5 transition-all rounded-2xl p-10 text-center cursor-pointer space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base text-foreground">
                  {isRtl
                    ? "اسحب وأفلت ملف CSV هنا، أو انقر للاختيار"
                    : "Déposez votre fichier CSV ici"}
                </h4>
                <p className="text-caption text-muted-foreground">
                  {isRtl
                    ? "يدعم الملفات المفصولة بفواصل (,) أو فواصل منقوطة (;) بترميز UTF-8"
                    : "Prend en charge les formats CSV encodés en UTF-8"}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm">
                {isRtl ? "تصفح الملفات" : "Parcourir"}
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border border-border/60 text-caption text-muted-foreground space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>{isRtl ? "نصائح لاستيراد ناجح:" : "Conseils pour l'import :"}</span>
              </div>
              <ul className="list-disc list-inside space-y-1 leading-relaxed">
                <li>
                  {isRtl
                    ? "تأكد من وجود عمود باسم العميل ورقم هاتفه (8 أرقام على الأقل)."
                    : "Le nom et le téléphone sont requis."}
                </li>
                <li>
                  {isRtl
                    ? "يقوم النظام آليًا بالتعرف على أسماء الأعمدة بالعربية والفرنسية والإنجليزية."
                    : "Détection automatique des en-têtes."}
                </li>
                <li>
                  {isRtl
                    ? "سيتم فحص التكرارات ومطابقتها قبل تأكيد الإدخال لحماية قاعدة البيانات."
                    : "Détection automatique des doublons."}
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2: Preview & Basic Stats */}
        {step === 2 && parsedTable && (
          <div className="space-y-4 py-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/60 border border-border/70 text-small">
              <div>
                <span className="font-bold text-foreground">{fileName}</span>
                <span className="text-caption text-muted-foreground ms-2">({fileSize})</span>
              </div>
              <div className="flex items-center gap-3 text-caption font-semibold">
                <span>
                  {isRtl
                    ? `إجمالي الصفوف: ${parsedTable.totalRows}`
                    : `Total : ${parsedTable.totalRows}`}
                </span>
                <span>•</span>
                <span>
                  {isRtl
                    ? `الأعمدة: ${parsedTable.headers.length}`
                    : `Colonnes : ${parsedTable.headers.length}`}
                </span>
              </div>
            </div>

            <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-muted/40 px-3.5 py-2 border-b border-border/70 text-caption font-bold text-muted-foreground">
                {isRtl ? "معاينة أولية (أول 5 صفوف):" : "Aperçu des 5 premières lignes :"}
              </div>
              <div className="overflow-x-auto max-h-56">
                <table className="w-full text-caption text-start">
                  <thead className="bg-muted/60 border-b border-border/70 text-muted-foreground">
                    <tr>
                      {parsedTable.headers.map((h, i) => (
                        <th key={i} className="py-2 px-3 text-start whitespace-nowrap">
                          {h || `عمود ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {parsedTable.rows.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-muted/20">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-foreground">
                            {cell || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                {isRtl ? (
                  <ArrowRight className="w-4 h-4 me-1.5" />
                ) : (
                  <ArrowLeft className="w-4 h-4 me-1.5" />
                )}
                <span>{isRtl ? "تغيير الملف" : "Changer de fichier"}</span>
              </Button>
              <Button type="button" onClick={() => setStep(3)} className="font-bold">
                <span>{isRtl ? "متابعة إلى ربط الأعمدة" : "Suivant"}</span>
                {isRtl ? (
                  <ArrowLeft className="w-4 h-4 ms-1.5" />
                ) : (
                  <ArrowRight className="w-4 h-4 ms-1.5" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Column Mapping */}
        {step === 3 && parsedTable && (
          <div className="space-y-4 py-3">
            <p className="text-small text-muted-foreground">
              {isRtl
                ? "قام النظام بمطابقة الأعمدة آليًا. يرجى مراجعة الربط أو تغييره للتأكد من صحة الحقول:"
                : "Vérifiez la correspondance entre vos colonnes et les champs du système :"}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
              {(Object.keys(LEAD_FIELD_DEFINITIONS) as LeadFieldKey[]).map((fieldKey) => {
                const def = LEAD_FIELD_DEFINITIONS[fieldKey];
                const selectedColIndex = mapping[fieldKey];

                return (
                  <div
                    key={fieldKey}
                    className="p-3 rounded-xl border border-border/70 bg-card space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-caption font-bold text-foreground">
                        {isRtl ? def.labelAr : def.labelFr}
                        {def.required && <span className="text-red-500 ms-1">*</span>}
                      </label>
                      {selectedColIndex !== null && (
                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                          {isRtl ? "تم الربط" : "Lié"}
                        </span>
                      )}
                    </div>

                    <Select
                      value={selectedColIndex !== null ? String(selectedColIndex) : "unmapped"}
                      onValueChange={(val) => {
                        setMapping((prev) => ({
                          ...prev,
                          [fieldKey]: val === "unmapped" ? null : parseInt(val, 10),
                        }));
                      }}
                    >
                      <SelectTrigger className="h-9 text-small">
                        <SelectValue placeholder={isRtl ? "غير مربوط" : "Non associé"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unmapped">
                          {isRtl ? "— غير مربوط —" : "— Non associé —"}
                        </SelectItem>
                        {parsedTable.headers.map((h, idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            {h || `عمود ${idx + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                {isRtl ? (
                  <ArrowRight className="w-4 h-4 me-1.5" />
                ) : (
                  <ArrowLeft className="w-4 h-4 me-1.5" />
                )}
                <span>{isRtl ? "السابق" : "Précédent"}</span>
              </Button>
              <Button type="button" onClick={handleProceedToValidation}>
                <span>{isRtl ? "التحقق وفحص التكرارات" : "Valider"}</span>
                {isRtl ? (
                  <ArrowLeft className="w-4 h-4 ms-1.5" />
                ) : (
                  <ArrowRight className="w-4 h-4 ms-1.5" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Validation & Duplicate Strategy */}
        {step === 4 && (
          <div className="space-y-4 py-3">
            {/* Validation Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-border/70 bg-card text-center">
                <span className="text-caption text-muted-foreground font-semibold">
                  {isRtl ? "إجمالي الصفوف" : "Total lignes"}
                </span>
                <div className="text-2xl font-bold font-mono text-foreground mt-0.5">
                  {validatedRows.length}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-center">
                <span className="text-caption text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isRtl ? "صفوف صحيحة" : "Valides"}</span>
                </span>
                <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {validatedRows.filter((r) => r.isValid).length}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-center">
                <span className="text-caption text-red-700 dark:text-red-300 font-semibold flex items-center justify-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{isRtl ? "تحتاج إصلاح" : "Invalides"}</span>
                </span>
                <div className="text-2xl font-bold font-mono text-red-700 dark:text-red-300 mt-0.5">
                  {validatedRows.filter((r) => !r.isValid).length}
                </div>
              </div>
            </div>

            {/* Duplicate Handling Strategy */}
            <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
              <label className="text-small font-bold text-foreground">
                {isRtl ? "استراتيجية التعامل مع الـ Leads المكررة:" : "Gestion des doublons :"}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: "skip",
                    titleAr: "تخطي التكرارات (موصى به)",
                    descAr: "عدم إدراج أي رقم هاتف مسجل مسبقًا للحفاظ على نظافة السجلات",
                  },
                  {
                    id: "update",
                    titleAr: "تحديث السجلات الموجودة",
                    descAr: "تحديث الرحلة والملاحظات للـ Leads المطابقة في النظام",
                  },
                  {
                    id: "new",
                    titleAr: "استيراد كـ Leads جديدة",
                    descAr: "إنشاء Lead جديد وربطه بنفس هوية العميل القائمة",
                  },
                ].map((strat) => (
                  <button
                    key={strat.id}
                    type="button"
                    onClick={() => setDuplicateStrategy(strat.id as any)}
                    className={cn(
                      "p-3 rounded-xl border text-start transition-all cursor-pointer",
                      duplicateStrategy === strat.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border/70 hover:border-primary/40",
                    )}
                  >
                    <div className="font-bold text-small text-foreground">{strat.titleAr}</div>
                    <div className="text-caption text-muted-foreground mt-1 leading-snug">
                      {strat.descAr}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Default Source & Status if omitted */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-foreground">
                  {isRtl ? "المصدر الافتراضي (إذا لم يُحدد بالملف):" : "Source par défaut :"}
                </label>
                <Select
                  value={defaultSource}
                  onValueChange={(v) => setDefaultSource(v as LeadSource)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-foreground">
                  {isRtl ? "الحالة الافتراضية للدفعة:" : "Statut initial :"}
                </label>
                <Select
                  value={defaultStatus}
                  onValueChange={(v) => setDefaultStatus(v as LeadStatus)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(3)}>
                {isRtl ? (
                  <ArrowRight className="w-4 h-4 me-1.5" />
                ) : (
                  <ArrowLeft className="w-4 h-4 me-1.5" />
                )}
                <span>{isRtl ? "السابق" : "Précédent"}</span>
              </Button>
              <Button
                type="button"
                onClick={handleExecuteImport}
                disabled={validatedRows.filter((r) => r.isValid).length === 0}
                className="font-bold bg-primary text-primary-foreground"
              >
                <span>
                  {isRtl
                    ? `تأكيد استيراد ${validatedRows.filter((r) => r.isValid).length} Leads`
                    : "Lancer l'importation"}
                </span>
                {isRtl ? (
                  <ArrowLeft className="w-4 h-4 ms-1.5" />
                ) : (
                  <ArrowRight className="w-4 h-4 ms-1.5" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: Importing Progress */}
        {step === 5 && (
          <div className="py-16 text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <h4 className="text-lg font-bold text-foreground">
              {isRtl ? "جاري معالجة واستيراد الدفعة..." : "Importation en cours..."}
            </h4>
            <p className="text-small text-muted-foreground max-w-sm mx-auto">
              {isRtl
                ? "يتم الآن فحص الهويات، تسجيل الأنشطة، وتحديث مركز المبيعات بأمان."
                : "Veuillez patienter pendant l'enregistrement des leads."}
            </p>
          </div>
        )}

        {/* STEP 6: Result Summary */}
        {step === 6 && importResult && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                {isRtl ? "اكتملت عملية الاستيراد بنجاح" : "Importation terminée"}
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-center">
                <span className="text-caption font-bold text-emerald-700 dark:text-emerald-300">
                  {isRtl ? "تم الاستيراد" : "Importés"}
                </span>
                <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                  {importResult.imported}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/10 text-center">
                <span className="text-caption font-bold text-blue-700 dark:text-blue-300">
                  {isRtl ? "تم التحديث" : "Mis à jour"}
                </span>
                <div className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-300 mt-1">
                  {importResult.updated}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-center">
                <span className="text-caption font-bold text-amber-700 dark:text-amber-300">
                  {isRtl ? "تم التخطي" : "Ignorés"}
                </span>
                <div className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-300 mt-1">
                  {importResult.skipped}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border/70 bg-card text-center">
                <span className="text-caption font-bold text-muted-foreground">
                  {isRtl ? "أخطاء السطور" : "Erreurs"}
                </span>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">
                  {importResult.errors.length}
                </div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      {isRtl
                        ? `توجد ${importResult.errors.length} صفوف واجهت أخطاء:`
                        : "Erreurs détectées :"}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleDownloadErrorReport}
                  >
                    <Download className="w-3 h-3" />
                    <span>{isRtl ? "تحميل تقرير الأخطاء" : "Télécharger"}</span>
                  </Button>
                </div>
                <div className="max-h-24 overflow-y-auto text-caption text-red-600 dark:text-red-400 space-y-0.5">
                  {importResult.errors.slice(0, 5).map((e, idx) => (
                    <div key={idx}>• {e}</div>
                  ))}
                  {importResult.errors.length > 5 && (
                    <div className="text-[11px] font-semibold">... والمزيد في التقرير المحمل</div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={resetWizard}>
                {isRtl ? "استيراد ملف آخر" : "Importer un autre fichier"}
              </Button>
              <Button type="button" onClick={() => onOpenChange(false)} className="font-bold">
                {isRtl ? "عرض الـ Leads في الجدول" : "Voir les leads"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
