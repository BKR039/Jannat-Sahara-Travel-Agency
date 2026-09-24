import { useState, useEffect } from "react";
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
import { updateLead, type LeadRow } from "@/lib/leads/leads.functions";
import { toast } from "sonner";
import { Loader2, Edit3, ShieldAlert, Sparkles } from "lucide-react";
import {
  LEAD_SOURCES,
  TUNISIAN_GOVERNORATES,
  CONTACT_PREFERENCES,
  PREFERRED_CONTACT_TIMES,
  type LeadSource,
  type ContactPreference,
  type PreferredContactTime,
} from "@/lib/leads/leads.schema";
import { normalizePhone } from "@/lib/admin/customer-identity";

interface EditLeadModalProps {
  lead: LeadRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdated: () => void;
  isRtl?: boolean;
}

export function EditLeadModal({
  lead,
  open,
  onOpenChange,
  onLeadUpdated,
  isRtl = true,
}: EditLeadModalProps) {
  const updateLeadFn = useServerFn(updateLead);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [city, setCity] = useState("");
  const [tripName, setTripName] = useState("");
  const [travelersCount, setTravelersCount] = useState(1);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [source, setSource] = useState<LeadSource>("phone");
  const [contactPreference, setContactPreference] = useState<ContactPreference>("phone");
  const [preferredContactTime, setPreferredContactTime] = useState<PreferredContactTime>("anytime");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lead) {
      setFullName(lead.full_name || "");
      setPhone(lead.phone || "");
      setEmail(lead.email || "");
      setGovernorate(lead.governorate || "");
      setCity(lead.city || "");
      setTripName(lead.trip_name || "");
      setTravelersCount(lead.travelers_count || 1);
      setAdults(lead.adults || 1);
      setChildren(lead.children || 0);
      setInfants(lead.infants || 0);
      setSource(lead.source || "phone");
      setContactPreference((lead.contact_preference as ContactPreference) || "phone");
      setPreferredContactTime((lead.preferred_contact_time as PreferredContactTime) || "anytime");
      setNotes(lead.notes || "");
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    if (!fullName.trim()) {
      toast.error(isRtl ? "يرجى إدخال اسم العميل" : "Nom requis");
      return;
    }

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.replace(/\D/g, "").length < 8) {
      toast.error(isRtl ? "رقم الهاتف غير صالح" : "Numéro de téléphone invalide");
      return;
    }

    setSubmitting(true);
    try {
      await updateLeadFn({
        data: {
          leadId: lead.id,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          governorate: governorate || null,
          city: city.trim() || null,
          tripId: lead.trip_id,
          tripName: tripName.trim() || null,
          travelersCount,
          adults,
          children,
          infants,
          interests: lead.interests || [],
          contactPreference,
          preferredContactTime,
          notes: notes.trim() || null,
          source,
        },
      });

      toast.success(isRtl ? "تم حفظ تعديلات الـ Lead بنجاح" : "Lead modifié avec succès");
      onOpenChange(false);
      onLeadUpdated();
    } catch (err: any) {
      console.error("update lead error", err);
      toast.error(err?.message || (isRtl ? "تعذر حفظ التعديلات" : "Erreur de modification"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {isRtl ? "تعديل بيانات Lead" : "Modifier le lead"}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-caption font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                  {lead?.reference}
                </span>
                <span className="text-caption text-muted-foreground">
                  {isRtl
                    ? "الحقول المحمية في السجل محفوظة تلقائيًا"
                    : "Historique immuable protégé"}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Section 1: Client Identity */}
          <div className="space-y-3">
            <h4 className="text-caption font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1.5">
              {isRtl ? "بيانات الهوية والاتصال" : "Identité & Contact"}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-foreground">
                  {isRtl ? "اسم العميل الكامل" : "Nom et prénom"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isRtl ? "اسم العميل" : "Nom du client"}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-foreground">
                  {isRtl ? "رقم الهاتف" : "Numéro de téléphone"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  placeholder={isRtl ? "رقم الهاتف" : "Numéro de téléphone"}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-foreground">
                  {isRtl ? "البريد الإلكتروني" : "E-mail"}
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  placeholder={isRtl ? "البريد الإلكتروني" : "Adresse e-mail"}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-foreground">
                  {isRtl ? "الولاية" : "Gouvernorat"}
                </label>
                <Select value={governorate} onValueChange={setGovernorate}>
                  <SelectTrigger>
                    <SelectValue placeholder={isRtl ? "اختر الولاية" : "Gouvernorat"} />
                  </SelectTrigger>
                  <SelectContent>
                    {TUNISIAN_GOVERNORATES.map((g) => (
                      <SelectItem key={g.id} value={isRtl ? g.ar : g.fr}>
                        {isRtl ? g.ar : g.fr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 2: Trip & Group Size */}
          <div className="space-y-3">
            <h4 className="text-caption font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1.5">
              {isRtl ? "الرحلة وعدد المسافرين" : "Voyage & Voyageurs"}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-caption font-semibold text-foreground">
                  {isRtl ? "اسم أو نوع الرحلة المطلوبة" : "Programme ou voyage"}
                </label>
                <Input
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder={isRtl ? "اسم الرحلة" : "Nom du voyage"}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-foreground">
                  {isRtl ? "إجمالي المسافرين" : "Total voyageurs"}
                </label>
                <NumberInput
                  value={travelersCount}
                  onChange={(v) => setTravelersCount(v ?? 1)}
                  min={1}
                  max={50}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-foreground">
                  {isRtl ? "البالغين" : "Adultes"}
                </label>
                <NumberInput value={adults} onChange={(v) => setAdults(v ?? 1)} min={1} max={50} />
              </div>

              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-foreground">
                  {isRtl ? "الأطفال (2 - 11 سنة)" : "Enfants"}
                </label>
                <NumberInput
                  value={children}
                  onChange={(v) => setChildren(v ?? 0)}
                  min={0}
                  max={20}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-foreground">
                  {isRtl ? "الرضع (أقل من سنتين)" : "Bébés"}
                </label>
                <NumberInput
                  value={infants}
                  onChange={(v) => setInfants(v ?? 0)}
                  min={0}
                  max={10}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Source & Contact Preferences */}
          <div className="space-y-3">
            <h4 className="text-caption font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1.5">
              {isRtl ? "المصدر وتفضيلات التواصل" : "Source & Préférences"}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-foreground">
                  {isRtl ? "مصدر الـ Lead" : "Source"}
                </label>
                <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "website" && (isRtl ? "الموقع (تواصل)" : "Site web")}
                        {s === "umrah_builder" && (isRtl ? "مصمم العمرة" : "Builder Omra")}
                        {s === "meta_ads" && "Meta Ads"}
                        {s === "instagram_organic" && "Instagram"}
                        {s === "facebook" && "Facebook"}
                        {s === "whatsapp" && "WhatsApp"}
                        {s === "phone" && (isRtl ? "مكالمة هاتفية" : "Téléphone")}
                        {s === "branch" && (isRtl ? "زيارة فرع" : "Agence")}
                        {s === "messenger" && "Messenger"}
                        {s === "other" && (isRtl ? "أخرى" : "Autre")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-foreground">
                  {isRtl ? "قناة الاتصال المفضلة" : "Canal préféré"}
                </label>
                <Select
                  value={contactPreference}
                  onValueChange={(v) => setContactPreference(v as ContactPreference)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_PREFERENCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p === "phone" && (isRtl ? "مكالمة هاتفية" : "Téléphone")}
                        {p === "whatsapp" && "WhatsApp"}
                        {p === "messenger" && "Messenger"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-foreground">
                  {isRtl ? "الوقت المفضل للاتصال" : "Horaire d'appel"}
                </label>
                <Select
                  value={preferredContactTime}
                  onValueChange={(v) => setPreferredContactTime(v as PreferredContactTime)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PREFERRED_CONTACT_TIMES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t === "morning" && (isRtl ? "صباحاً (9 - 12)" : "Matin")}
                        {t === "afternoon" && (isRtl ? "ظهراً (12 - 16)" : "Après-midi")}
                        {t === "evening" && (isRtl ? "مساءً (16 - 19)" : "Soir")}
                        {t === "anytime" && (isRtl ? "في أي وقت" : "À tout moment")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-caption font-semibold text-foreground">
                {isRtl ? "ملاحظات وتفاصيل إضافية" : "Remarques"}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={
                  isRtl ? "ملاحظات إضافية حول العميل أو الطلب..." : "Notes supplémentaires..."
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {isRtl ? "إلغاء" : "Annuler"}
            </Button>
            <Button type="submit" disabled={submitting} className="min-w-[120px]">
              {submitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              <span>{isRtl ? "حفظ التعديلات" : "Enregistrer"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
