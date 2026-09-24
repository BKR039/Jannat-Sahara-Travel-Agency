import { createFileRoute, Link } from "@tanstack/react-router";
import i18n from "@/lib/i18n";
import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Calendar,
  Users,
  Building2,
  Plane,
  Sparkles,
  DollarSign,
  HelpCircle,
  Clock,
  Send,
  Home,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Section, Container } from "@/components/common/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerFn } from "@tanstack/react-start";
import { submitLeadFromContact } from "@/lib/leads/leads.functions";
import { branchesQuery, contactInfoQuery, packagesQuery } from "@/lib/queries";
import { useLocalized } from "@/lib/localize";
import { BranchCard } from "@/components/branches/BranchCard";
import { canonical } from "@/lib/seo";
import { cn } from "@/lib/utils";
import {
  TUNISIAN_GOVERNORATES,
  type ContactPreference,
  type PreferredContactTime,
} from "@/lib/leads/leads.schema";

export const Route = createFileRoute("/contact")({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    trip?: string;
  } => ({
    ...(typeof s.trip === "string" && s.trip ? { trip: s.trip } : {}),
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(contactInfoQuery()).catch(() => []),
      context.queryClient.ensureQueryData(branchesQuery()).catch(() => []),
      context.queryClient.ensureQueryData(packagesQuery("umrah")).catch(() => []),
    ]);
  },
  head: () => ({
    meta: [
      { title: i18n.t("seo.contact.title") },
      { name: "description", content: i18n.t("seo.contact.description") },
      { property: "og:title", content: i18n.t("seo.contact.title") },
      { property: "og:description", content: i18n.t("seo.contact.ogDescription") },
      { property: "og:type", content: "website" },
    ],
    links: [canonical("/contact")],
  }),
  component: ContactPage,
});

/** wa.me needs a country code; Tunisian numbers are stored as 8 bare digits. */
function whatsappHref(val: string) {
  if (!val) return "";
  if (val.startsWith("http://") || val.startsWith("https://")) return val;
  const digits = val.replace(/[^\d]/g, "");
  return `https://wa.me/${digits.length === 8 ? `216${digits}` : digits}`;
}

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  governorate: string;
  travelersCount: number;
  tripId: string | null;
  tripName: string;
  customTripText: string;
  interests: string[];
  contactPreference: ContactPreference;
  preferredContactTime: PreferredContactTime;
  notes: string;
}

const INITIAL_FORM: FormState = {
  fullName: "",
  phone: "",
  email: "",
  governorate: "",
  travelersCount: 2,
  tripId: null,
  tripName: "",
  customTripText: "",
  interests: ["price_program", "hotels"],
  contactPreference: "phone",
  preferredContactTime: "evening",
  notes: "",
};

function ContactPage() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const isRtl = i18n.dir() === "rtl";
  const search = Route.useSearch();
  const { data: info } = useQuery(contactInfoQuery());
  const { data: branches = [] } = useQuery(branchesQuery());
  const { data: umrahPackages = [] } = useQuery(packagesQuery("umrah"));

  const submitLead = useServerFn(submitLeadFromContact);

  const [step, setStep] = useState<number>(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    reference: string;
    tripName: string;
    travelers: number;
    preferredTime: string;
  } | null>(null);

  // Auto-select trip from URL query if provided
  useEffect(() => {
    if (search.trip && umrahPackages.length > 0) {
      const matched = umrahPackages.find((p) => p.id === search.trip || p.slug === search.trip);
      if (matched) {
        setForm((prev) => ({
          ...prev,
          tripId: matched.id,
          tripName: matched.title,
        }));
      }
    }
  }, [search.trip, umrahPackages]);

  const validateStep = (currentStep: number): boolean => {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!form.fullName.trim() || form.fullName.trim().length < 2) {
        nextErrors.fullName = isRtl ? "يرجى كتابة الاسم واللقب" : "Nom complet requis";
      }
      const cleanPhone = form.phone.replace(/[^0-9+]/g, "");
      if (cleanPhone.length < 8) {
        nextErrors.phone = isRtl
          ? "رقم الهاتف غير صالح (8 أرقام على الأقل)"
          : "Numéro de téléphone invalide";
      }
      if (!form.governorate) {
        nextErrors.governorate = isRtl ? "يرجى اختيار الولاية" : "Gouvernorat requis";
      }
    }

    if (currentStep === 2) {
      if (form.travelersCount < 1) {
        nextErrors.travelersCount = isRtl
          ? "عدد المسافرين يجب أن يكون 1 على الأقل"
          : "Au moins 1 voyageur";
      }
    }

    if (currentStep === 3) {
      if (form.interests.length === 0) {
        nextErrors.interests = isRtl
          ? "يرجى اختيار نقطة واحدة على الأقل"
          : "Veuillez sélectionner au moins un choix";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const toggleInterest = (id: string) => {
    setForm((prev) => {
      const exists = prev.interests.includes(id);
      const nextInterests = exists
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id];
      return { ...prev, interests: nextInterests };
    });
    if (errors.interests) {
      setErrors((prev) => ({ ...prev, interests: "" }));
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setIsSubmitting(true);
    try {
      const selectedGov = TUNISIAN_GOVERNORATES.find((g) => g.id === form.governorate);
      const govName = isRtl
        ? (selectedGov?.ar ?? form.governorate)
        : (selectedGov?.fr ?? form.governorate);
      const finalTripName = form.tripName || form.customTripText || "عمرة مخصصة";

      const res = await submitLead({
        data: {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          governorate: govName,
          tripId: form.tripId,
          tripName: finalTripName,
          travelersCount: form.travelersCount,
          adults: form.travelersCount,
          children: 0,
          infants: 0,
          interests: form.interests,
          contactPreference: form.contactPreference,
          preferredContactTime: form.preferredContactTime,
          notes: form.notes.trim() || undefined,
          source: "website",
        },
      });

      const timeLabels: Record<string, string> = {
        morning: isRtl ? "صباحًا" : "Matin",
        afternoon: isRtl ? "بعد الظهر" : "Après-midi",
        evening: isRtl ? "مساءً" : "Soir",
        anytime: isRtl ? "أي وقت" : "À tout moment",
      };

      setSubmissionResult({
        reference: res.reference,
        tripName: finalTripName,
        travelers: form.travelersCount,
        preferredTime: timeLabels[form.preferredContactTime] || form.preferredContactTime,
      });

      toast.success(isRtl ? "وصلتنا طلبيتك بنجاح!" : "Demande enregistrée avec succès !");
    } catch (err: any) {
      console.error(err);
      toast.error(
        isRtl ? "تعذر إرسال الطلب، يرجى المحاولة لاحقاً" : "Erreur lors de l'envoi de la demande",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const agencyPhone = info?.find((c) => c.key === "phone")?.value || "+216 71 000 000";
  const agencyWhatsapp = info?.find((c) => c.key === "whatsapp")?.value || "";
  const agencyEmail = info?.find((c) => c.key === "email")?.value || "contact@janatsahara.tn";

  return (
    <SiteLayout>
      <div className="bg-gradient-to-b from-primary/5 via-background to-background py-10 lg:py-16">
        <Container>
          {/* Main Hero Header */}
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-small font-medium border border-primary/20 shadow-xs">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>
                {isRtl ? "استشارة مجانية مع خبير رحلات" : "Consultation gratuite avec un expert"}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
              {isRtl
                ? "خلّي فريق جنة الصحراء يتصل بيك"
                : "Laissez l'équipe Jannat Sahara vous contacter"}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {isRtl
                ? "خلّي معلوماتك ونوع الرحلة اللي تهمك، ومستشار من فريق جنة الصحراء يتواصل معاك في الوقت المناسب ويفسرلك كل التفاصيل."
                : "Renseignez vos coordonnées et votre projet de voyage. Un conseiller expert vous contactera au moment idéal pour répondre à toutes vos questions."}
            </p>
          </div>

          {/* Consultation Lead Card vs Confirmation State */}
          <div className="max-w-2xl mx-auto">
            {!submissionResult ? (
              <div className="bg-card border border-border/80 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm relative overflow-hidden">
                {/* Visual Step Progress Bar */}
                <div className="mb-8">
                  <div className="flex items-center justify-between text-caption font-medium text-muted-foreground mb-2">
                    <span>{isRtl ? `الخطوة ${step} من 5` : `Étape ${step} sur 5`}</span>
                    <span className="text-primary font-semibold">
                      {step === 1 && (isRtl ? "معلوماتك الشخصية" : "Vos coordonnées")}
                      {step === 2 && (isRtl ? "تفاصيل رحلتك" : "Votre voyage")}
                      {step === 3 && (isRtl ? "شنو تحب تعرف؟" : "Vos centres d'intérêt")}
                      {step === 4 && (isRtl ? "طريقة التواصل" : "Canal de contact")}
                      {step === 5 && (isRtl ? "وقت الاتصال" : "Créneau d'appel")}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${(step / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Step 1: Contact Information */}
                {step === 1 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        {isRtl ? "معلوماتك الأساسية" : "Vos informations"}
                      </h2>
                      <p className="text-small text-muted-foreground mt-1">
                        {isRtl
                          ? "باش نعرفوا شكون نكلموا وكيفاش نتواصلوا معاك"
                          : "Pour savoir à qui nous adresser et vous joindre"}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-small font-semibold text-foreground flex items-center justify-between">
                          <span>
                            {isRtl ? "الاسم واللقب" : "Nom complet"}{" "}
                            <span className="text-primary">*</span>
                          </span>
                        </label>
                        <Input
                          value={form.fullName}
                          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                          placeholder={isRtl ? "اسمك الكامل" : "Votre nom complet"}
                          className={cn(
                            errors.fullName && "border-destructive focus-visible:ring-destructive",
                          )}
                        />
                        {errors.fullName && (
                          <p className="text-caption text-destructive">{errors.fullName}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-small font-semibold text-foreground flex items-center justify-between">
                          <span>
                            {isRtl ? "رقم الهاتف (تونس)" : "Numéro de téléphone"}{" "}
                            <span className="text-primary">*</span>
                          </span>
                          <span className="text-caption text-muted-foreground font-normal">
                            +216
                          </span>
                        </label>
                        <div className="relative">
                          <Input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder={isRtl ? "رقم هاتفك" : "Votre numéro de téléphone"}
                            className={cn(
                              "font-mono",
                              errors.phone && "border-destructive focus-visible:ring-destructive",
                            )}
                            dir="ltr"
                          />
                        </div>
                        {errors.phone && (
                          <p className="text-caption text-destructive">{errors.phone}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-small font-semibold text-foreground">
                          {isRtl ? "الولاية" : "Gouvernorat"}{" "}
                          <span className="text-primary">*</span>
                        </label>
                        <Select
                          value={form.governorate}
                          onValueChange={(val) => {
                            setForm((prev) => ({ ...prev, governorate: val }));
                            if (errors.governorate) setErrors((e) => ({ ...e, governorate: "" }));
                          }}
                        >
                          <SelectTrigger
                            className={cn(
                              errors.governorate && "border-destructive focus:ring-destructive/20",
                            )}
                          >
                            <SelectValue
                              placeholder={
                                isRtl ? "اختر الولاية" : "Sélectionnez votre gouvernorat"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {TUNISIAN_GOVERNORATES.map((gov) => (
                              <SelectItem key={gov.id} value={gov.id}>
                                {isRtl ? gov.ar : gov.fr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.governorate && (
                          <p className="text-caption text-destructive">{errors.governorate}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-small font-semibold text-foreground flex items-center justify-between">
                          <span>{isRtl ? "البريد الإلكتروني" : "E-mail"}</span>
                          <span className="text-caption text-muted-foreground font-normal">
                            {isRtl ? "اختياري" : "Optionnel"}
                          </span>
                        </label>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder={isRtl ? "بريدك الإلكتروني" : "Votre adresse e-mail"}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Trip & Travelers */}
                {step === 2 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        {isRtl ? "رحلتك وعدد المسافرين" : "Votre projet & voyageurs"}
                      </h2>
                      <p className="text-small text-muted-foreground mt-1">
                        {isRtl
                          ? "اختر الرحلة المهتم بيها وعدد الأشخاص"
                          : "Sélectionnez votre voyage et le nombre de personnes"}
                      </p>
                    </div>

                    {/* Travelers Count */}
                    <div className="p-4 bg-muted/50 rounded-xl border border-border/60 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          <span>{isRtl ? "عدد المسافرين" : "Nombre de voyageurs"}</span>
                        </div>
                        <p className="text-caption text-muted-foreground mt-0.5">
                          {isRtl ? "بما في ذلك نفسك ومرافقيك" : "Vous et vos accompagnateurs"}
                        </p>
                      </div>
                      <div className="w-36">
                        <NumberInput
                          value={form.travelersCount}
                          min={1}
                          max={20}
                          onChange={(val) =>
                            setForm((prev) => ({
                              ...prev,
                              travelersCount: val ?? 1,
                            }))
                          }
                          aria-label={isRtl ? "عدد المسافرين" : "Nombre de voyageurs"}
                        />
                      </div>
                    </div>

                    {/* Trip Selection Cards */}
                    <div className="space-y-2">
                      <label className="text-small font-semibold text-foreground">
                        {isRtl ? "الرحلة المهتم بها" : "Voyage qui vous intéresse"}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                        {umrahPackages.map((pkg) => {
                          const isSelected = form.tripId === pkg.id;
                          return (
                            <button
                              key={pkg.id}
                              type="button"
                              onClick={() =>
                                setForm({ ...form, tripId: pkg.id, tripName: pkg.title })
                              }
                              className={cn(
                                "p-3 rounded-xl border text-start transition-all flex flex-col justify-between",
                                isSelected
                                  ? "border-primary bg-primary/10 ring-2 ring-primary/20 font-semibold"
                                  : "border-border bg-card hover:border-primary/40",
                              )}
                            >
                              <div className="text-small font-semibold text-foreground line-clamp-1">
                                {pkg.title}
                              </div>
                              <div className="text-caption text-primary mt-1 font-medium">
                                {pkg.price
                                  ? `${pkg.price} ${pkg.currency || "TND"}`
                                  : isRtl
                                    ? "باقة مميزة"
                                    : "Offre"}
                              </div>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() =>
                            setForm({ ...form, tripId: null, tripName: "عمرة مخصصة / أخرى" })
                          }
                          className={cn(
                            "p-3 rounded-xl border text-start transition-all flex flex-col justify-between",
                            form.tripId === null && form.tripName.includes("عمرة")
                              ? "border-primary bg-primary/10 ring-2 ring-primary/20 font-semibold"
                              : "border-border bg-card hover:border-primary/40",
                          )}
                        >
                          <div className="text-small font-semibold text-foreground">
                            {isRtl ? "🕋 عمرة مخصصة / موعد آخر" : "🕋 Omra personnalisée"}
                          </div>
                          <div className="text-caption text-muted-foreground mt-1">
                            {isRtl ? "تحديد حسب طلبك" : "Sur mesure"}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({ ...form, tripId: null, tripName: "رحلة سياحية / Tour" })
                          }
                          className={cn(
                            "p-3 rounded-xl border text-start transition-all flex flex-col justify-between",
                            form.tripName.includes("سياحية")
                              ? "border-primary bg-primary/10 ring-2 ring-primary/20 font-semibold"
                              : "border-border bg-card hover:border-primary/40",
                          )}
                        >
                          <div className="text-small font-semibold text-foreground">
                            {isRtl ? "✈️ رحلة سياحية / دولية" : "✈️ Voyage touristique"}
                          </div>
                          <div className="text-caption text-muted-foreground mt-1">
                            {isRtl ? "تركيا، ماليزيا، دبي..." : "Turquie, Dubaï..."}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Interests */}
                {step === 3 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        {isRtl ? "شنو تحب تعرف؟" : "Que souhaitez-vous savoir ?"}
                      </h2>
                      <p className="text-small text-muted-foreground mt-1">
                        {isRtl
                          ? "اختر النقاط اللي تحب المستشار يركز عليها معاك (يمكنك اختيار أكثر من نقطة)"
                          : "Sélectionnez les points que vous souhaitez clarifier avec notre conseiller"}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          id: "price_program",
                          icon: DollarSign,
                          titleAr: "السعر والبرنامج التفصيلي",
                          titleFr: "Tarifs et programme détaillé",
                          descAr: "تفاصيل الأيام، المزارات، وأفضل الأسعار",
                          descFr: "Programme jour par jour et meilleurs prix",
                        },
                        {
                          id: "hotels",
                          icon: Building2,
                          titleAr: "الفنادق ومسافة الحرم",
                          titleFr: "Hôtels et proximité du Haram",
                          descAr: "أسماء الفنادق والإقامة بمكة والمدينة",
                          descFr: "Options d'hébergement à Makkah et Médine",
                        },
                        {
                          id: "flights",
                          icon: Plane,
                          titleAr: "الطيران ومواعيد الرحلات",
                          titleFr: "Vols et horaires",
                          descAr: "الخطوط، الترانزيت، ومطارات المغادرة",
                          descFr: "Compagnies aériennes et aéroports",
                        },
                        {
                          id: "services",
                          icon: Sparkles,
                          titleAr: "الخدمات والتأشيرات المرافقة",
                          titleFr: "Services & Visas",
                          descAr: "التأشيرات، التنقلات، والمرشد الديني",
                          descFr: "Visas, transferts et encadrement",
                        },
                        {
                          id: "booking",
                          icon: Check,
                          titleAr: "نحب نحجز مباشرة",
                          titleFr: "Je souhaite réserver directement",
                          descAr: "جاهز لتأكيد المقاعد وإتمام الإجراءات",
                          descFr: "Prêt à bloquer les places immédiatement",
                        },
                      ].map((item) => {
                        const isSelected = form.interests.includes(item.id);
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleInterest(item.id)}
                            className={cn(
                              "p-4 rounded-xl border text-start transition-all flex items-start gap-3.5",
                              isSelected
                                ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                                : "border-border bg-card hover:border-primary/40",
                            )}
                          >
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="font-semibold text-foreground text-small">
                                {isRtl ? item.titleAr : item.titleFr}
                              </div>
                              <p className="text-caption text-muted-foreground leading-snug">
                                {isRtl ? item.descAr : item.descFr}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {errors.interests && (
                      <p className="text-caption text-destructive">{errors.interests}</p>
                    )}
                  </div>
                )}

                {/* Step 4: Contact Preference */}
                {step === 4 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        {isRtl
                          ? "كيفاش تحب نتواصلوا معاك؟"
                          : "Comment préférez-vous être contacté ?"}
                      </h2>
                      <p className="text-small text-muted-foreground mt-1">
                        {isRtl
                          ? "اختر الوسيلة الأنسب ليك للتحدث مع المستشار"
                          : "Choisissez le canal le plus pratique pour vous"}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          id: "phone" as ContactPreference,
                          icon: Phone,
                          labelAr: "مكالمة هاتفية",
                          labelFr: "Appel téléphonique",
                          descAr: "محادثة سريعة ومباشرة",
                          descFr: "Direct et rapide",
                        },
                        {
                          id: "whatsapp" as ContactPreference,
                          icon: MessageCircle,
                          labelAr: "WhatsApp",
                          labelFr: "WhatsApp",
                          descAr: "رسائل وصور البرامج",
                          descFr: "Messages & brochures",
                        },
                        {
                          id: "messenger" as ContactPreference,
                          icon: Mail,
                          labelAr: "Messenger / بريد",
                          labelFr: "Messenger / Email",
                          descAr: "عبر الرسائل المكتوبة",
                          descFr: "Par écrit",
                        },
                      ].map((item) => {
                        const isSelected = form.contactPreference === item.id;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setForm({ ...form, contactPreference: item.id })}
                            className={cn(
                              "p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2",
                              isSelected
                                ? "border-primary bg-primary/10 ring-2 ring-primary/20 font-semibold"
                                : "border-border bg-card hover:border-primary/40",
                            )}
                          >
                            <div
                              className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              <Icon className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground text-small">
                                {isRtl ? item.labelAr : item.labelFr}
                              </div>
                              <div className="text-caption text-muted-foreground mt-0.5">
                                {isRtl ? item.descAr : item.descFr}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 5: Preferred Time & Notes */}
                {step === 5 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        {isRtl ? "وقت الاتصال المناسب ليك" : "Créneau d'appel idéal"}
                      </h2>
                      <p className="text-small text-muted-foreground mt-1">
                        {isRtl
                          ? "وقتاش يساعدك المستشار يكلمك؟"
                          : "À quel moment de la journée êtes-vous disponible ?"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        {
                          id: "morning" as PreferredContactTime,
                          labelAr: "صباحًا (9:00 - 12:00)",
                          labelFr: "Matin (9h - 12h)",
                        },
                        {
                          id: "afternoon" as PreferredContactTime,
                          labelAr: "بعد الظهر (13:00 - 17:00)",
                          labelFr: "Après-midi (13h - 17h)",
                        },
                        {
                          id: "evening" as PreferredContactTime,
                          labelAr: "مساءً (17:00 - 20:00)",
                          labelFr: "Soir (17h - 20h)",
                        },
                        {
                          id: "anytime" as PreferredContactTime,
                          labelAr: "في أي وقت",
                          labelFr: "À tout moment",
                        },
                      ].map((item) => {
                        const isSelected = form.preferredContactTime === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setForm({ ...form, preferredContactTime: item.id })}
                            className={cn(
                              "p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center",
                              isSelected
                                ? "border-primary bg-primary/10 ring-2 ring-primary/20 font-semibold"
                                : "border-border bg-card hover:border-primary/40",
                            )}
                          >
                            <Clock
                              className={cn(
                                "w-4 h-4 mb-1.5",
                                isSelected ? "text-primary" : "text-muted-foreground",
                              )}
                            />
                            <span className="text-caption font-medium text-foreground">
                              {isRtl ? item.labelAr : item.labelFr}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-small font-semibold text-foreground flex items-center justify-between">
                        <span>
                          {isRtl
                            ? "عندك حاجة أخرى تحب تقولها للفريق؟"
                            : "Autre précision pour l'équipe ?"}
                        </span>
                        <span className="text-caption text-muted-foreground font-normal">
                          {isRtl ? "اختياري" : "Optionnel"}
                        </span>
                      </label>
                      <Textarea
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder={
                          isRtl
                            ? "اكتب أي متطلبات أو تفاصيل إضافية تود إبلاغ المستشار بها..."
                            : "Précisez vos besoins particuliers ou toute demande spécifique..."
                        }
                        rows={3}
                        className="text-small resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-8 border-t border-border/60 mt-8">
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={isSubmitting}
                    >
                      {isRtl ? (
                        <ArrowRight className="h-4 w-4" />
                      ) : (
                        <ArrowLeft className="h-4 w-4" />
                      )}
                      <span>{isRtl ? "السابق" : "Précédent"}</span>
                    </Button>
                  ) : (
                    <div />
                  )}

                  {step < 5 ? (
                    <Button type="button" onClick={handleNext}>
                      <span>{isRtl ? "التالي" : "Suivant"}</span>
                      {isRtl ? (
                        <ArrowLeft className="w-4 h-4" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleSubmit} disabled={isSubmitting} size="lg">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{isRtl ? "جاري الإرسال..." : "Envoi en cours..."}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>{isRtl ? "اطلب اتصال من مستشار" : "Demander un appel"}</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* Premium Success Experience */
              <div className="bg-card border border-border/80 rounded-2xl p-8 md:p-10 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    {isRtl ? "وصلتنا طلبيتك بنجاح ✓" : "Demande bien reçue ✓"}
                  </h2>
                  <p className="text-base text-muted-foreground max-w-md mx-auto">
                    {isRtl
                      ? "مستشار من فريق جنة الصحراء باش يتصل بيك باش يفسرلك البرنامج، الأسعار والخدمات المناسبة ليك."
                      : "Un conseiller dédié de l'équipe Jannat Sahara vous appellera pour vous présenter le programme et les disponibilités."}
                  </p>
                </div>

                {/* Summary Box */}
                <div className="bg-muted/50 border border-border/60 rounded-xl p-4 max-w-sm mx-auto text-start space-y-2 text-small">
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">
                      {isRtl ? "رقم المرجع:" : "Référence :"}
                    </span>
                    <span className="font-mono font-bold text-primary">
                      {submissionResult.reference}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">{isRtl ? "الرحلة:" : "Voyage :"}</span>
                    <span className="font-semibold text-foreground">
                      {submissionResult.tripName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">
                      {isRtl ? "عدد المسافرين:" : "Voyageurs :"}
                    </span>
                    <span className="font-semibold text-foreground">
                      {submissionResult.travelers}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">
                      {isRtl ? "وقت الاتصال:" : "Créneau :"}
                    </span>
                    <span className="font-semibold text-foreground">
                      {submissionResult.preferredTime}
                    </span>
                  </div>
                </div>

                {/* Instant Actions */}
                <div className="pt-2 space-y-3 max-w-sm mx-auto">
                  <p className="text-caption text-muted-foreground">
                    {isRtl
                      ? "إذا تحب تتواصل معانا مباشرة عبر واتساب الآن:"
                      : "Besoin d'une réponse instantanée ?"}
                  </p>
                  <a
                    href={whatsappHref(agencyWhatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{isRtl ? "تواصل مباشرة عبر WhatsApp" : "Contacter sur WhatsApp"}</span>
                  </a>

                  <Button
                    variant="ghost"
                    asChild
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    <Link to="/">
                      <Home className="w-4 h-4 mr-2" />
                      <span>{isRtl ? "العودة للصفحة الرئيسية" : "Retour à l'accueil"}</span>
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Container>
      </div>

      {/* Agency Operational Presence & Branches Section */}
      <Section className="border-t border-border/60 bg-muted/20">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 bg-card border border-border/70 rounded-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <div className="text-caption text-muted-foreground">
                  {isRtl ? "الهاتف المباشر" : "Téléphone direct"}
                </div>
                <a
                  href={`tel:${agencyPhone}`}
                  className="text-base font-bold text-foreground hover:text-primary transition-colors"
                  dir="ltr"
                >
                  {agencyPhone}
                </a>
              </div>
            </div>

            <div className="p-6 bg-card border border-border/70 rounded-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-caption text-muted-foreground">
                  {isRtl ? "واتساب الوكالة" : "WhatsApp"}
                </div>
                <a
                  href={whatsappHref(agencyWhatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-bold text-foreground hover:text-emerald-600 transition-colors"
                  dir="ltr"
                >
                  +216 {agencyWhatsapp}
                </a>
              </div>
            </div>

            <div className="p-6 bg-card border border-border/70 rounded-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <div className="text-caption text-muted-foreground">
                  {isRtl ? "البريد الرسمي" : "Email officiel"}
                </div>
                <a
                  href={`mailto:${agencyEmail}`}
                  className="text-base font-bold text-foreground hover:text-primary transition-colors"
                  dir="ltr"
                >
                  {agencyEmail}
                </a>
              </div>
            </div>
          </div>

          {/* Agency Branches */}
          {branches.length > 0 && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-bold text-foreground">
                  {isRtl ? "فروع وكالة جنة الصحراء" : "Nos agences et succursales"}
                </h3>
                <p className="text-small text-muted-foreground">
                  {isRtl
                    ? "يمكنك زيارة أي من فروعنا الرسمية في تونس والجنوب"
                    : "Rendez-nous visite dans nos agences officielles"}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {branches.map((b) => (
                  <BranchCard key={b.id} branch={b} />
                ))}
              </div>
            </div>
          )}
        </Container>
      </Section>
    </SiteLayout>
  );
}
