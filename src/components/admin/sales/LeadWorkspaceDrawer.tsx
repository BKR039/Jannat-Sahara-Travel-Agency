import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerFn } from "@tanstack/react-start";
import {
  getLead,
  updateLeadStatus,
  addLeadNote,
  scheduleLeadFollowUp,
  recordLeadObjection,
  saveLeadOffer,
  convertLeadToBooking,
  restoreLead,
  type LeadRow,
  type LeadActivityRow,
} from "@/lib/leads/leads.functions";
import { toast } from "sonner";
import {
  Phone,
  MessageCircle,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  Sparkles,
  Building2,
  Calendar,
  Users,
  Plane,
  FileText,
  DollarSign,
  AlertCircle,
  X,
  Plus,
  Loader2,
  Check,
  ChevronRight,
  ChevronLeft,
  Edit3,
  Archive,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LEAD_STATUSES,
  LOSS_REASONS,
  type LeadStatus,
  type LossReason,
  type OfferStatus,
} from "@/lib/leads/leads.schema";

interface LeadWorkspaceDrawerProps {
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated: () => void;
  onEditLead?: (lead: LeadRow) => void;
  onArchiveLead?: (lead: LeadRow) => void;
  onRestoreLead?: (lead: LeadRow) => void;
  onDeleteLead?: (lead: LeadRow) => void;
  packages?: Array<{ id: string; title: string; price: number; currency: string }>;
  isRtl?: boolean;
}

function whatsappHref(phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits.length === 8 ? `216${digits}` : digits}`;
}

export function LeadWorkspaceDrawer({
  leadId,
  onClose,
  onLeadUpdated,
  onEditLead,
  onArchiveLead,
  onRestoreLead,
  onDeleteLead,
  packages = [],
  isRtl = true,
}: LeadWorkspaceDrawerProps) {
  const fetchLeadFn = useServerFn(getLead);
  const updateStatusFn = useServerFn(updateLeadStatus);
  const addNoteFn = useServerFn(addLeadNote);
  const scheduleFollowUpFn = useServerFn(scheduleLeadFollowUp);
  const recordObjectionFn = useServerFn(recordLeadObjection);
  const saveOfferFn = useServerFn(saveLeadOffer);
  const convertBookingFn = useServerFn(convertLeadToBooking);
  const restoreLeadFn = useServerFn(restoreLead);

  const [lead, setLead] = useState<LeadRow | null>(null);
  const [activities, setActivities] = useState<LeadActivityRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Sub-modal / Action state
  const [activeActionModal, setActiveActionModal] = useState<
    "none" | "status" | "follow_up" | "objection" | "offer" | "convert" | "lost"
  >("none");

  // Input states
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Follow-up modal state
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("10:00");
  const [followUpNote, setFollowUpNote] = useState("");

  // Objection modal state
  const [selectedObjection, setSelectedObjection] = useState<LossReason>("price");
  const [objectionNote, setObjectionNote] = useState("");

  // Offer modal state
  const [offerAmount, setOfferAmount] = useState<number>(4500);
  const [offerCurrency, setOfferCurrency] = useState("TND");
  const [offerNotes, setOfferNotes] = useState("");
  const [offerStatus, setOfferStatus] = useState<OfferStatus>("sent");

  // Conversion modal state
  const [selectedPackageId, setSelectedPackageId] = useState("");

  // Lost modal state
  const [lossReason, setLossReason] = useState<LossReason>("price");
  const [lossNotes, setLossNotes] = useState("");

  const [actionPending, setActionPending] = useState(false);

  const loadData = async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = (await fetchLeadFn({ data: { leadId } })) as unknown as {
        lead: LeadRow;
        activities: LeadActivityRow[];
      };
      if (res?.lead) {
        setLead(res.lead);
        setActivities(res.activities || []);
        if (res.lead.trip_id) setSelectedPackageId(res.lead.trip_id);
        else if (packages.length > 0) setSelectedPackageId(packages[0].id);
        if (res.lead.offer_amount) setOfferAmount(res.lead.offer_amount);
      }
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? "تعذر تحميل ملف العميل" : "Erreur chargement lead");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      loadData();
    } else {
      setLead(null);
      setActivities([]);
    }
  }, [leadId]);

  const handleAddNote = async (activityType: "note" | "call" = "note") => {
    if (!lead || !newNote.trim()) return;
    setSubmittingNote(true);
    try {
      await addNoteFn({
        data: {
          leadId: lead.id,
          note: newNote.trim(),
          activityType,
        },
      });
      toast.success(isRtl ? "تمت إضافة الملاحظة" : "Note ajoutée");
      setNewNote("");
      loadData();
      onLeadUpdated();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleUpdateStatus = async (status: LeadStatus) => {
    if (!lead) return;
    setActionPending(true);
    try {
      await updateStatusFn({
        data: {
          leadId: lead.id,
          status,
        },
      });
      toast.success(isRtl ? "تم تحديث الحالة" : "Statut mis à jour");
      setActiveActionModal("none");
      loadData();
      onLeadUpdated();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setActionPending(false);
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!lead || !followUpDate) {
      toast.error(isRtl ? "يرجى تحديد تاريخ المتابعة" : "Date requise");
      return;
    }
    setActionPending(true);
    try {
      await scheduleFollowUpFn({
        data: {
          leadId: lead.id,
          nextFollowUpDate: followUpDate,
          nextFollowUpTime: followUpTime,
          followUpNote: followUpNote.trim() || undefined,
        },
      });
      toast.success(isRtl ? "تمت جدولة موعد المتابعة" : "Relance planifiée");
      setActiveActionModal("none");
      loadData();
      onLeadUpdated();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setActionPending(false);
    }
  };

  const handleRecordObjection = async () => {
    if (!lead) return;
    setActionPending(true);
    try {
      await recordObjectionFn({
        data: {
          leadId: lead.id,
          objection: selectedObjection,
          explanation: objectionNote.trim() || undefined,
        },
      });
      toast.success(isRtl ? "تم تسجيل الاعتراض" : "Objection enregistrée");
      setActiveActionModal("none");
      loadData();
      onLeadUpdated();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setActionPending(false);
    }
  };

  const handleSaveOffer = async () => {
    if (!lead || !offerAmount || offerAmount <= 0) {
      toast.error(isRtl ? "يرجى إدخال مبلغ صحيح" : "Montant invalide");
      return;
    }
    setActionPending(true);
    try {
      await saveOfferFn({
        data: {
          leadId: lead.id,
          offerAmount,
          offerCurrency,
          offerNotes: offerNotes.trim() || undefined,
          offerStatus,
        },
      });
      toast.success(isRtl ? "تم حفظ عرض السعر" : "Offre enregistrée");
      setActiveActionModal("none");
      loadData();
      onLeadUpdated();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setActionPending(false);
    }
  };

  const handleConvertBooking = async () => {
    if (!lead || !selectedPackageId) {
      toast.error(isRtl ? "يرجى اختيار الباقة لتأكيد الحجز" : "Forfait requis");
      return;
    }
    setActionPending(true);
    try {
      const res = await convertBookingFn({
        data: {
          leadId: lead.id,
          packageId: selectedPackageId,
        },
      });
      toast.success(
        isRtl ? "تم تحويل الـ Lead إلى حجز مؤكد بنجاح!" : "Converti en réservation avec succès !",
      );
      setActiveActionModal("none");
      loadData();
      onLeadUpdated();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setActionPending(false);
    }
  };

  const handleMarkLost = async () => {
    if (!lead) return;
    setActionPending(true);
    try {
      await updateStatusFn({
        data: {
          leadId: lead.id,
          status: "lost",
          lossReason,
          lossNotes: lossNotes.trim() || undefined,
        },
      });
      toast.success(isRtl ? "تم تعيين الـ Lead كملغي" : "Lead marqué comme perdu");
      setActiveActionModal("none");
      loadData();
      onLeadUpdated();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setActionPending(false);
    }
  };

  const handleRestore = async () => {
    if (!lead) return;
    if (onRestoreLead) {
      onRestoreLead(lead);
      return;
    }
    setActionPending(true);
    try {
      await restoreLeadFn({ data: { leadId: lead.id } });
      toast.success(
        isRtl ? "تم استرجاع الـ Lead بنجاح إلى القائمة النشطة" : "Lead restauré avec succès",
      );
      loadData();
      onLeadUpdated();
    } catch (err: any) {
      toast.error(err.message || "Erreur de restauration");
    } finally {
      setActionPending(false);
    }
  };

  if (!leadId) return null;

  return (
    <Drawer
      open={!!leadId}
      onOpenChange={(o) => !o && onClose()}
      direction={isRtl ? "left" : "right"}
    >
      <DrawerContent className="max-w-3xl h-[100dvh] overflow-hidden flex flex-col p-0 bg-background border-border">
        {/* Top Header */}
        <div className="p-4 md:p-6 border-b border-border/80 bg-card shrink-0 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-caption font-semibold px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                {lead?.reference || "JS-LEAD"}
              </span>
              {lead?.intent === "high" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                  🔥 {isRtl ? "اهتمام عالي (High Intent)" : "Haute intention"}
                </span>
              )}
              {lead?.archived_at && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                  📁 {isRtl ? "مؤرشف" : "Archivé"}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <span>{lead?.full_name}</span>
              {lead?.governorate && (
                <span className="text-small font-normal text-muted-foreground">
                  ({lead.governorate})
                </span>
              )}
            </h2>
            <div
              className="text-small text-muted-foreground flex items-center gap-3 font-mono"
              dir="ltr"
            >
              <span>{lead?.phone}</span>
              {lead?.email && <span>• {lead.email}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lead && onEditLead && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditLead(lead)}
                className="rounded-xl h-9 px-3 gap-1.5 font-bold text-caption shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-primary" />
                <span>{isRtl ? "تعديل البيانات" : "Modifier"}</span>
              </Button>
            )}

            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {loading && !lead ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            </div>
          ) : lead ? (
            <>
              {/* Archive Alert Banner if archived */}
              {lead.archived_at && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Archive className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-small font-bold text-amber-900 dark:text-amber-200">
                        {isRtl
                          ? "هذا الـ Lead في الأرشيف (غير نشط)"
                          : "Ce lead est archivé (inactif)"}
                      </div>
                      <div className="text-caption text-amber-800 dark:text-amber-300 mt-0.5">
                        {isRtl
                          ? `تمت الأرشفة في ${new Date(lead.archived_at).toLocaleDateString("ar-TN")}${
                              lead.archived_by_name ? ` بواسطة ${lead.archived_by_name}` : ""
                            }${lead.archive_reason ? ` — السبب: ${lead.archive_reason}` : ""}`
                          : `Archivé le ${new Date(lead.archived_at).toLocaleDateString("fr-FR")}`}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="xs"
                    variant="outline"
                    onClick={handleRestore}
                    disabled={actionPending}
                    className="shrink-0 self-end sm:self-center"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isRtl ? "استرجاع إلى القائمة النشطة" : "Restaurer"}</span>
                  </Button>
                </div>
              )}

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/40 rounded-2xl border border-border/70">
                <a
                  href={`tel:${lead.phone}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-caption shadow-xs hover:bg-primary/90"
                >
                  <Phone className="w-4 h-4" />
                  <span>{isRtl ? "اتصال" : "Appeler"}</span>
                </a>

                <a
                  href={whatsappHref(lead.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-caption shadow-xs hover:bg-emerald-700"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveActionModal("status")}
                  className="text-caption font-semibold rounded-xl h-9"
                >
                  <span>{isRtl ? "تغيير الحالة" : "Statut"}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveActionModal("follow_up")}
                  className="text-caption font-semibold rounded-xl h-9 gap-1"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isRtl ? "موعد متابعة" : "Relance"}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveActionModal("objection")}
                  className="text-caption font-semibold rounded-xl h-9 gap-1"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-purple-500" />
                  <span>{isRtl ? "تسجيل اعتراض" : "Objection"}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveActionModal("offer")}
                  className="text-caption font-semibold rounded-xl h-9 gap-1"
                >
                  <DollarSign className="w-3.5 h-3.5 text-sky-500" />
                  <span>{isRtl ? "عرض سعر" : "Offre"}</span>
                </Button>

                {lead.status !== "confirmed" && (
                  <Button
                    size="sm"
                    onClick={() => setActiveActionModal("convert")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-caption font-bold rounded-xl h-9 gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isRtl ? "تأكيد الحجز" : "Confirmer"}</span>
                  </Button>
                )}

                {lead.status !== "lost" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveActionModal("lost")}
                    className="text-caption font-semibold text-destructive hover:bg-destructive/10 rounded-xl h-9"
                  >
                    <span>{isRtl ? "إلغاء / غير مهتم" : "Perdu"}</span>
                  </Button>
                )}

                {lead.archived_at ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRestore}
                    disabled={actionPending}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isRtl ? "استرجاع" : "Restaurer"}</span>
                  </Button>
                ) : onArchiveLead ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onArchiveLead(lead)}
                    className="text-caption font-semibold text-muted-foreground hover:text-foreground rounded-xl h-9 gap-1"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{isRtl ? "أرشفة" : "Archiver"}</span>
                  </Button>
                ) : null}

                {onDeleteLead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteLead(lead)}
                    className="text-caption font-semibold text-destructive hover:bg-destructive/10 rounded-xl h-9 gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isRtl ? "حذف" : "Supprimer"}</span>
                  </Button>
                )}
              </div>

              {/* Lifecycle Stepper */}
              <div className="bg-card border border-border/70 rounded-2xl p-4">
                <div className="text-caption font-bold text-muted-foreground mb-3">
                  {isRtl ? "مسار العميل في المبيعات (Pipeline)" : "Pipeline commercial"}
                </div>
                <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
                  {[
                    { id: "new", labelAr: "جديد", labelFr: "Nouveau" },
                    { id: "contacted", labelAr: "تم التواصل", labelFr: "Contacté" },
                    { id: "qualified", labelAr: "مؤهل", labelFr: "Qualifié" },
                    { id: "offer_sent", labelAr: "عرض مرسل", labelFr: "Offre" },
                    { id: "follow_up", labelAr: "متابعة", labelFr: "Relance" },
                    { id: "confirmed", labelAr: "مؤكد", labelFr: "Confirmé" },
                  ].map((step, idx) => {
                    const isCurrent = lead.status === step.id;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => handleUpdateStatus(step.id as LeadStatus)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-caption font-semibold transition-all shrink-0 flex items-center gap-1.5",
                          isCurrent
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <span className="w-4 h-4 rounded-full bg-background/20 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span>{isRtl ? step.labelAr : step.labelFr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Umrah Builder Configuration Snapshot (if present) */}
              {lead.builder_snapshot && (
                <div className="bg-card border border-primary/20 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <span>
                        {isRtl
                          ? "تفاصيل باقة العمرة المخصصة (Snapshot)"
                          : "Détail de l'Omra sur mesure"}
                      </span>
                    </h3>
                    <span className="text-caption font-semibold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                      {isRtl ? "مكتمل عبر الـ Builder" : "Configuré via Builder"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-small">
                    <div className="p-3 bg-muted/40 rounded-xl space-y-0.5">
                      <div className="text-caption text-muted-foreground">
                        {isRtl ? "فندق مكة" : "Hôtel Makkah"}
                      </div>
                      <div className="font-semibold text-foreground">
                        {lead.builder_snapshot.makkahHotelName ||
                          (isRtl ? "غير محدد" : "Non spécifié")}
                      </div>
                      <div className="text-caption text-primary">
                        {lead.builder_snapshot.makkahNights ?? 0} {isRtl ? "ليالٍ" : "nuits"}
                      </div>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-xl space-y-0.5">
                      <div className="text-caption text-muted-foreground">
                        {isRtl ? "فندق المدينة" : "Hôtel Médine"}
                      </div>
                      <div className="font-semibold text-foreground">
                        {lead.builder_snapshot.madinahHotelName ||
                          (isRtl ? "غير محدد" : "Non spécifié")}
                      </div>
                      <div className="text-caption text-primary">
                        {lead.builder_snapshot.madinahNights ?? 0} {isRtl ? "ليالٍ" : "nuits"}
                      </div>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-xl space-y-0.5">
                      <div className="text-caption text-muted-foreground">
                        {isRtl ? "المسافرون" : "Voyageurs"}
                      </div>
                      <div className="font-semibold text-foreground">
                        {lead.builder_snapshot.adults} {isRtl ? "بالغين" : "adultes"}
                      </div>
                      <div className="text-caption text-muted-foreground">
                        {lead.builder_snapshot.children > 0 &&
                          `${lead.builder_snapshot.children} أطفال`}
                      </div>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-xl space-y-0.5">
                      <div className="text-caption text-muted-foreground">
                        {isRtl ? "نوع الغرفة" : "Type chambre"}
                      </div>
                      <div className="font-semibold text-foreground">
                        {lead.builder_snapshot.roomType || (isRtl ? "ثنائية" : "Double")}
                      </div>
                      <div className="text-caption text-muted-foreground">
                        {lead.builder_snapshot.departureAirport || "TUN"} →{" "}
                        {lead.builder_snapshot.returnAirport || "MED"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Offer Card */}
              {lead.offer_amount && (
                <div className="p-4 bg-sky-500/10 border border-sky-500/30 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-caption text-sky-800 dark:text-sky-300 font-semibold">
                      {isRtl ? "عرض السعر المقدم للعميل:" : "Offre de prix active :"}
                    </div>
                    <div className="text-2xl font-bold text-sky-900 dark:text-sky-100 mt-0.5">
                      {lead.offer_amount} {lead.offer_currency}
                    </div>
                    {lead.offer_notes && (
                      <p className="text-caption text-sky-700 dark:text-sky-300 mt-1">
                        {lead.offer_notes}
                      </p>
                    )}
                  </div>
                  <span className="px-3 py-1 rounded-full text-caption font-bold bg-sky-500 text-white">
                    {lead.offer_status || "sent"}
                  </span>
                </div>
              )}

              {/* Next Follow-up Alert Card */}
              {lead.next_follow_up_date && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <div>
                      <div className="font-bold text-small text-amber-900 dark:text-amber-200">
                        {isRtl ? "موعد المتابعة القادم:" : "Prochaine relance :"}{" "}
                        {lead.next_follow_up_date}{" "}
                        {lead.next_follow_up_time && `الساعة ${lead.next_follow_up_time}`}
                      </div>
                      {lead.follow_up_note && (
                        <p className="text-caption text-amber-800 dark:text-amber-300 mt-0.5">
                          {lead.follow_up_note}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveActionModal("follow_up")}
                    className="h-8 text-caption font-semibold"
                  >
                    {isRtl ? "تعديل" : "Modifier"}
                  </Button>
                </div>
              )}

              {/* Note Composer */}
              <div className="bg-card border border-border/70 rounded-2xl p-4 space-y-3">
                <div className="font-bold text-small text-foreground">
                  {isRtl ? "إضافة ملاحظة اتصال أو متابعة" : "Ajouter une note de suivi"}
                </div>
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder={
                    isRtl ? "اكتب ما تم الاتفاق عليه مع العميل في المكالمة..." : "Note d'appel..."
                  }
                  rows={2}
                  className="resize-none text-small"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={submittingNote || !newNote.trim()}
                    onClick={() => handleAddNote("call")}
                    className="gap-1 text-caption font-semibold h-8"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{isRtl ? "ملاحظة مكالمة" : "Note d'appel"}</span>
                  </Button>
                  <Button
                    size="sm"
                    disabled={submittingNote || !newNote.trim()}
                    onClick={() => handleAddNote("note")}
                    className="gap-1 text-caption font-bold h-8"
                  >
                    {submittingNote ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>{isRtl ? "حفظ الملاحظة" : "Enregistrer"}</span>
                  </Button>
                </div>
              </div>

              {/* Chronological Activities Timeline */}
              <div className="space-y-3">
                <h3 className="font-bold text-base text-foreground">
                  {isRtl ? "سجل التفاعلات والمتابعة (Timeline)" : "Historique d'activité"}
                </h3>
                <div className="space-y-2.5">
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-3.5 bg-card border border-border/70 rounded-xl text-small space-y-1"
                    >
                      <div className="flex items-center justify-between text-caption text-muted-foreground">
                        <span className="font-semibold text-foreground">{act.title}</span>
                        <span>
                          {new Date(act.created_at).toLocaleString(isRtl ? "ar-TN" : "fr-FR")}
                        </span>
                      </div>
                      {act.description && (
                        <p className="text-small text-muted-foreground leading-relaxed">
                          {act.description}
                        </p>
                      )}
                      {act.author_name && (
                        <div className="text-[11px] text-muted-foreground font-mono">
                          بواسطة: {act.author_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Sub-modals inside Drawer */}
        {activeActionModal === "follow_up" && (
          <div className="p-4 bg-muted border-t border-border space-y-3 animate-in slide-in-from-bottom-5">
            <div className="font-bold text-small flex items-center justify-between">
              <span>{isRtl ? "تحديد موعد المتابعة" : "Planifier la relance"}</span>
              <Button variant="ghost" size="sm" onClick={() => setActiveActionModal("none")}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker
                value={followUpDate}
                onChange={(d) => setFollowUpDate(d || "")}
                placeholder={isRtl ? "تاريخ المتابعة" : "Date de relance"}
              />
              <TimePicker
                value={followUpTime}
                onChange={(t) => setFollowUpTime(t || "")}
                placeholder={isRtl ? "وقت المتابعة" : "Heure de relance"}
              />
            </div>
            <Input
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              placeholder={isRtl ? "ملاحظة موعد المتابعة..." : "Note de relance..."}
            />
            <Button
              onClick={handleScheduleFollowUp}
              disabled={actionPending}
              size="sm"
              className="w-full"
            >
              {actionPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>{isRtl ? "تأكيد الموعد" : "Confirmer"}</span>
              )}
            </Button>
          </div>
        )}

        {activeActionModal === "objection" && (
          <div className="p-4 bg-muted border-t border-border space-y-3 animate-in slide-in-from-bottom-5">
            <div className="font-bold text-small flex items-center justify-between">
              <span>{isRtl ? "تسجيل اعتراض العميل" : "Enregistrer une objection"}</span>
              <Button variant="ghost" size="sm" onClick={() => setActiveActionModal("none")}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Select
              value={selectedObjection}
              onValueChange={(val) => setSelectedObjection(val as LossReason)}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder={isRtl ? "اختر سبب الاعتراض" : "Raison de l'objection"} />
              </SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "price" && (isRtl ? "السعر مرتفع" : "Prix trop élevé")}
                    {r === "hotel" && (isRtl ? "الفندق أو المسافة" : "Hôtel / Distance")}
                    {r === "flight" && (isRtl ? "مواعيد الطيران أو الخطوط" : "Vols / Horaires")}
                    {r === "dates" && (isRtl ? "التواريخ غير ملائمة" : "Dates non convenables")}
                    {r === "family_decision" &&
                      (isRtl ? "قرار عائلي قيد الانتظار" : "Décision familiale")}
                    {r === "comparing_agencies" &&
                      (isRtl ? "مقارنة مع وكالات أخرى" : "Comparaison agences")}
                    {r === "not_ready" && (isRtl ? "غير جاهز الآن" : "Pas prêt")}
                    {r === "other" && (isRtl ? "سبب آخر" : "Autre")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={objectionNote}
              onChange={(e) => setObjectionNote(e.target.value)}
              placeholder={isRtl ? "توضيح إضافي حول الاعتراض..." : "Explication..."}
            />
            <Button
              onClick={handleRecordObjection}
              disabled={actionPending}
              size="sm"
              className="w-full"
            >
              {actionPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>{isRtl ? "تسجيل الاعتراض" : "Enregistrer"}</span>
              )}
            </Button>
          </div>
        )}

        {activeActionModal === "offer" && (
          <div className="p-4 bg-muted border-t border-border space-y-3 animate-in slide-in-from-bottom-5">
            <div className="font-bold text-small flex items-center justify-between">
              <span>{isRtl ? "تقديم عرض سعر مخصص" : "Créer une offre"}</span>
              <Button variant="ghost" size="sm" onClick={() => setActiveActionModal("none")}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <NumberInput
                  value={offerAmount}
                  onChange={(v) => setOfferAmount(v ?? 0)}
                  placeholder={isRtl ? "أدخل المبلغ" : "Montant"}
                  min={0}
                  max={9_999_999}
                  allowDecimal
                  showSteppers={false}
                />
              </div>
              <Input value={offerCurrency} onChange={(e) => setOfferCurrency(e.target.value)} />
            </div>
            <Input
              value={offerNotes}
              onChange={(e) => setOfferNotes(e.target.value)}
              placeholder={
                isRtl ? "تفاصيل العرض (الفنادق، الغرفة، التخفيض)..." : "Détails offre..."
              }
            />
            <Button
              onClick={handleSaveOffer}
              disabled={actionPending}
              size="sm"
              className="w-full"
            >
              {actionPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>{isRtl ? "حفظ وإرسال العرض" : "Enregistrer l'offre"}</span>
              )}
            </Button>
          </div>
        )}

        {activeActionModal === "convert" && (
          <div className="p-4 bg-emerald-500/10 border-t border-emerald-500/30 space-y-3 animate-in slide-in-from-bottom-5">
            <div className="font-bold text-small flex items-center justify-between text-emerald-900 dark:text-emerald-200">
              <span>{isRtl ? "تحويل الـ Lead إلى حجز مؤكد" : "Convertir en réservation"}</span>
              <Button variant="ghost" size="sm" onClick={() => setActiveActionModal("none")}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-caption text-emerald-800 dark:text-emerald-300">
              {isRtl
                ? "سيتم إنشاء حجز رسمي في جدول الحجوزات ونقل العميل إلى فئة العملاء المؤكدين."
                : "Créera une réservation officielle pour ce client."}
            </p>
            <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder={isRtl ? "اختر الرحلة" : "Sélectionner le package"} />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.title} ({pkg.price} {pkg.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleConvertBooking}
              disabled={actionPending}
              size="sm"
              className="w-full"
            >
              {actionPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>{isRtl ? "تأكيد وتحويل الحجز الآن" : "Confirmer la réservation"}</span>
              )}
            </Button>
          </div>
        )}

        {activeActionModal === "lost" && (
          <div className="p-4 bg-destructive/10 border-t border-destructive/30 space-y-3 animate-in slide-in-from-bottom-5">
            <div className="font-bold text-small flex items-center justify-between text-destructive">
              <span>{isRtl ? "تحديد الـ Lead كملغي أو غير مهتم" : "Marquer comme perdu"}</span>
              <Button variant="ghost" size="sm" onClick={() => setActiveActionModal("none")}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Select value={lossReason} onValueChange={(val) => setLossReason(val as LossReason)}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder={isRtl ? "اختر سبب الإلغاء" : "Raison de la perte"} />
              </SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "price" && (isRtl ? "السعر مرتفع" : "Prix")}
                    {r === "hotel" && (isRtl ? "الفندق" : "Hôtel")}
                    {r === "flight" && (isRtl ? "الطيران" : "Vol")}
                    {r === "dates" && (isRtl ? "التواريخ" : "Dates")}
                    {r === "family_decision" && (isRtl ? "قرار عائلي" : "Famille")}
                    {r === "comparing_agencies" && (isRtl ? "اختار وكالة أخرى" : "Autre agence")}
                    {r === "not_ready" && (isRtl ? "غير جاهز" : "Pas prêt")}
                    {r === "other" && (isRtl ? "سبب آخر" : "Autre")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={lossNotes}
              onChange={(e) => setLossNotes(e.target.value)}
              placeholder={isRtl ? "سبب الإلغاء بالتفصيل..." : "Détails..."}
            />
            <Button
              onClick={handleMarkLost}
              disabled={actionPending}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              {actionPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>{isRtl ? "تأكيد الإلغاء" : "Confirmer"}</span>
              )}
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
