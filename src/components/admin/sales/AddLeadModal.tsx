import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumberInput } from "@/components/ui/number-input";
import { useServerFn } from "@tanstack/react-start";
import { createManualLead, type LeadRow } from "@/lib/leads/leads.functions";
import { toast } from "sonner";
import { Loader2, AlertCircle, Plus, Sparkles, Phone, MessageCircle } from "lucide-react";
import {
  LEAD_SOURCES,
  TUNISIAN_GOVERNORATES,
  type LeadSource,
  type ContactPreference,
  type PreferredContactTime,
} from "@/lib/leads/leads.schema";
import { normalizePhone } from "@/lib/admin/customer-identity";

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLeads?: LeadRow[];
  onLeadCreated: () => void;
  isRtl?: boolean;
}

export function AddLeadModal({
  open,
  onOpenChange,
  existingLeads = [],
  onLeadCreated,
  isRtl = true,
}: AddLeadModalProps) {
  const createLeadFn = useServerFn(createManualLead);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [governorate, setGovernorate] = useState("tunis");
  const [travelersCount, setTravelersCount] = useState(2);
  const [tripName, setTripName] = useState("");
  const [source, setSource] = useState<LeadSource>("phone");
  const [contactPreference, setContactPreference] = useState<ContactPreference>("phone");
  const [preferredContactTime, setPreferredContactTime] = useState<PreferredContactTime>("anytime");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Real-time Duplicate Detection by phone
  const cleanPhone = normalizePhone(phone);
  const matchedDuplicate =
    cleanPhone.length >= 8
      ? existingLeads.find((l) => l.phone_normalized.endsWith(cleanPhone.slice(-8)))
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error(isRtl ? "يرجى إدخال اسم العميل" : "Nom requis");
      return;
    }
    if (cleanPhone.length < 8) {
      toast.error(isRtl ? "رقم الهاتف غير صالح" : "Numéro de téléphone invalide");
      return;
    }

    setSubmitting(true);
    try {
      const selectedGov = TUNISIAN_GOVERNORATES.find((g) => g.id === governorate);
      const govName = isRtl ? (selectedGov?.ar ?? governorate) : (selectedGov?.fr ?? governorate);

      await createLeadFn({
        data: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          governorate: govName,
          tripName: tripName.trim() || undefined,
          travelersCount,
          adults: travelersCount,
          children: 0,
          infants: 0,
          source,
          contactPreference,
          preferredContactTime,
          notes: notes.trim() || undefined,
          initialStatus: "new",
        },
      });

      toast.success(isRtl ? "تم إضافة الـ Lead بنجاح" : "Lead créé avec succès");
      onLeadCreated();
      onOpenChange(false);
      // Reset
      setFullName("");
      setPhone("");
      setEmail("");
      setNotes("");
      setTripName("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (isRtl ? "فشل إنشاء الـ Lead" : "Erreur lors de la création"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Plus className="w-5 h-5 text-primary" />
            <span>{isRtl ? "إضافة Lead يدويًا" : "Ajouter un lead manuellement"}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Duplicate Lead Warning Alert */}
          {matchedDuplicate && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-small text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold">
                  {isRtl
                    ? "عميل مسجل مسبقاً بنفس رقم الهاتف!"
                    : "Client déjà enregistré avec ce numéro !"}
                </div>
                <p className="text-caption">
                  {isRtl
                    ? `مسجل باسم: ${matchedDuplicate.full_name} (${matchedDuplicate.reference}) — الحالة: ${matchedDuplicate.status}`
                    : `Nom: ${matchedDuplicate.full_name} (${matchedDuplicate.reference})`}
                </p>
              </div>
            </div>
          )}

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-caption font-bold text-foreground">
                {isRtl ? "الاسم واللقب" : "Nom complet"} <span className="text-primary">*</span>
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isRtl ? "اسم العميل" : "Nom du client"}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-caption font-bold text-foreground">
                {isRtl ? "رقم الهاتف" : "Numéro de téléphone"}{" "}
                <span className="text-primary">*</span>
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={isRtl ? "رقم الهاتف" : "Numéro de téléphone"}
                dir="ltr"
                required
              />
            </div>
          </div>

          {/* Source & Governorate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-caption font-bold text-foreground">
                {isRtl ? "مصدر الطلب" : "Canal d'origine"} <span className="text-primary">*</span>
              </label>
              <Select value={source} onValueChange={(val) => setSource(val as LeadSource)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isRtl ? "اختر مصدر الطلب" : "Canal d'origine"} />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "phone" && (isRtl ? "مكالمة هاتفية" : "Téléphone")}
                      {s === "whatsapp" && "WhatsApp"}
                      {s === "messenger" && "Messenger"}
                      {s === "branch" && (isRtl ? "زيارة فرع" : "Agence / Succursale")}
                      {s === "meta_ads" && "Meta Ads"}
                      {s === "website" && (isRtl ? "الموقع" : "Site web")}
                      {s === "umrah_builder" && (isRtl ? "مصمم العمرة" : "Builder")}
                      {s === "other" && (isRtl ? "أخرى" : "Autre")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-caption font-bold text-foreground">
                {isRtl ? "الولاية" : "Gouvernorat"}
              </label>
              <Select value={governorate} onValueChange={setGovernorate}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isRtl ? "اختر الولاية" : "Gouvernorat"} />
                </SelectTrigger>
                <SelectContent>
                  {TUNISIAN_GOVERNORATES.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {isRtl ? g.ar : g.fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trip Interest & Travelers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-caption font-bold text-foreground">
                {isRtl ? "الرحلة المهتم بها" : "Voyage d'intérêt"}
              </label>
              <Input
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder={isRtl ? "اسم أو نوع الرحلة المطلوبة" : "Voyage d'intérêt"}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-caption font-bold text-foreground">
                {isRtl ? "المسافرين" : "Voyageurs"}
              </label>
              <NumberInput
                min={1}
                max={50}
                value={travelersCount}
                onChange={(val) => setTravelersCount(val || 1)}
              />
            </div>
          </div>

          {/* Email (optional) */}
          <div className="space-y-1.5">
            <label className="text-caption font-bold text-foreground flex items-center justify-between">
              <span>{isRtl ? "البريد الإلكتروني" : "E-mail"}</span>
              <span className="text-muted-foreground font-normal">
                {isRtl ? "اختياري" : "Optionnel"}
              </span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isRtl ? "البريد الإلكتروني" : "Adresse e-mail"}
              dir="ltr"
            />
          </div>

          {/* Initial Notes */}
          <div className="space-y-1.5">
            <label className="text-caption font-bold text-foreground">
              {isRtl ? "ملاحظات وتفاصيل الاستفسار" : "Notes initiales"}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isRtl ? "ماذا طلب العميل في المكالمة أو الرسالة..." : "Détails de la demande..."
              }
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {isRtl ? "إلغاء" : "Annuler"}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isRtl ? "جاري الحفظ..." : "Enregistrement..."}</span>
                </>
              ) : (
                <span>{isRtl ? "حفظ الـ Lead" : "Créer le lead"}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
