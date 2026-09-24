import { z } from "zod";

/**
 * Supported lead sources in the Jannat Sahara Sales Center.
 */
export const LEAD_SOURCES = [
  "website",
  "umrah_builder",
  "meta_ads",
  "instagram_organic",
  "facebook",
  "whatsapp",
  "messenger",
  "phone",
  "branch",
  "other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

/**
 * Standard sales pipeline statuses.
 */
export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "offer_sent",
  "follow_up",
  "confirmed",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/**
 * Structured loss reasons when lead status transitions to 'lost'.
 */
export const LOSS_REASONS = [
  "price",
  "hotel",
  "flight",
  "dates",
  "family_decision",
  "comparing_agencies",
  "not_ready",
  "other",
] as const;

export type LossReason = (typeof LOSS_REASONS)[number];

/**
 * Observable behavior-derived intent levels.
 */
export const LEAD_INTENTS = ["high", "medium", "low"] as const;
export type LeadIntent = (typeof LEAD_INTENTS)[number];

/**
 * Contact preference channels.
 */
export const CONTACT_PREFERENCES = ["phone", "whatsapp", "messenger"] as const;
export type ContactPreference = (typeof CONTACT_PREFERENCES)[number];

/**
 * Preferred contact times during the day.
 */
export const PREFERRED_CONTACT_TIMES = ["morning", "afternoon", "evening", "anytime"] as const;
export type PreferredContactTime = (typeof PREFERRED_CONTACT_TIMES)[number];

/**
 * Customer interests requested in the progressive contact form.
 */
export const LEAD_INTERESTS = [
  "price_program",
  "hotels",
  "flights",
  "services",
  "booking",
] as const;
export type LeadInterest = (typeof LEAD_INTERESTS)[number];

/**
 * The 24 official Tunisian Governorates (ولايات الجمهورية التونسية).
 */
export const TUNISIAN_GOVERNORATES = [
  { id: "tunis", ar: "تونس", fr: "Tunis" },
  { id: "ariana", ar: "أريانة", fr: "Ariana" },
  { id: "ben_arous", ar: "بن عروس", fr: "Ben Arous" },
  { id: "manouba", ar: "منوبة", fr: "Manouba" },
  { id: "nabeul", ar: "نابل", fr: "Nabeul" },
  { id: "zaghouan", ar: "زغوان", fr: "Zaghouan" },
  { id: "bizerte", ar: "بنزرت", fr: "Bizerte" },
  { id: "beja", ar: "باجة", fr: "Béja" },
  { id: "jendouba", ar: "جندوبة", fr: "Jendouba" },
  { id: "kef", ar: "الكاف", fr: "Le Kef" },
  { id: "siliana", ar: "سليانة", fr: "Siliana" },
  { id: "sousse", ar: "سوسة", fr: "Sousse" },
  { id: "monastir", ar: "المنستير", fr: "Monastir" },
  { id: "mahdia", ar: "المهدية", fr: "Mahdia" },
  { id: "sfax", ar: "صفاقس", fr: "Sfax" },
  { id: "kairouan", ar: "القيروان", fr: "Kairouan" },
  { id: "kasserine", ar: "القصرين", fr: "Kasserine" },
  { id: "sidi_bouzid", ar: "سيدي بوزيد", fr: "Sidi Bouzid" },
  { id: "gafsa", ar: "قفصة", fr: "Gafsa" },
  { id: "tozeur", ar: "توزر", fr: "Tozeur" },
  { id: "kebili", ar: "قبلي", fr: "Kébili" },
  { id: "gabes", ar: "قابس", fr: "Gabès" },
  { id: "medenine", ar: "مدنين", fr: "Médenine" },
  { id: "tataouine", ar: "تطاوين", fr: "Tataouine" },
] as const;

export type GovernorateId = (typeof TUNISIAN_GOVERNORATES)[number]["id"];

/**
 * Offer status tracking.
 */
export const OFFER_STATUSES = ["draft", "sent", "accepted", "rejected", "expired"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

/**
 * UTM & Meta Ads source attribution details.
 */
export const SourceDetailsSchema = z.object({
  campaign: z.string().max(200).optional(),
  adset: z.string().max(200).optional(),
  ad: z.string().max(200).optional(),
  utm_source: z.string().max(120).optional(),
  utm_medium: z.string().max(120).optional(),
  utm_campaign: z.string().max(120).optional(),
  utm_content: z.string().max(120).optional(),
  utm_term: z.string().max(120).optional(),
  fbclid: z.string().max(200).optional(),
  landing_page: z.string().max(300).optional(),
  referrer: z.string().max(300).optional(),
});

export type SourceDetails = z.infer<typeof SourceDetailsSchema>;

/**
 * Umrah Builder full configuration snapshot.
 */
export const BuilderSnapshotSchema = z.object({
  tripId: z.string().nullable().optional(),
  tripTitle: z.string().max(200).optional(),
  departureDate: z.string().optional(),
  returnDate: z.string().optional(),
  totalNights: z.number().int().nonnegative().optional(),
  departureAirport: z.string().max(120).nullable().optional(),
  returnAirport: z.string().max(120).nullable().optional(),
  airportFlexible: z.boolean().optional(),
  flightPreference: z.string().max(50).optional(),
  transitHub: z.string().max(120).optional(),
  additionalDestination: z.string().max(120).optional(),
  destinationTiming: z.string().max(50).optional(),
  makkahHotelId: z.string().nullable().optional(),
  makkahHotelName: z.string().max(200).nullable().optional(),
  makkahNights: z.number().int().nonnegative().optional(),
  makkahArea: z.string().max(100).nullable().optional(),
  makkahPreference: z.string().max(50).nullable().optional(),
  madinahHotelId: z.string().nullable().optional(),
  madinahHotelName: z.string().max(200).nullable().optional(),
  madinahNights: z.number().int().nonnegative().optional(),
  madinahArea: z.string().max(100).nullable().optional(),
  madinahPreference: z.string().max(50).nullable().optional(),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().nonnegative().default(0),
  infants: z.number().int().nonnegative().default(0),
  roomType: z.string().max(50).nullable().optional(),
  estimatedPrice: z.number().nonnegative().nullable().optional(),
  currency: z.string().max(10).default("TND"),
});

export type BuilderSnapshot = z.infer<typeof BuilderSnapshotSchema>;

/**
 * Input Schema for Contact Us progressive lead capture.
 */
export const ContactLeadInput = z.object({
  fullName: z.string().trim().min(2, "الاسم مطلوب").max(120),
  phone: z.string().trim().min(6, "رقم الهاتف غير صالح").max(32),
  email: z.string().trim().email("البريد الإلكتروني غير صالح").optional().or(z.literal("")),
  governorate: z.string().trim().min(1, "الولاية مطلوبة").max(60),
  city: z.string().trim().max(60).optional(),
  tripId: z.string().uuid().optional().nullable(),
  tripName: z.string().trim().max(200).optional(),
  travelersCount: z.number().int().min(1).max(50).default(1),
  adults: z.number().int().min(1).max(50).default(1),
  children: z.number().int().min(0).max(20).default(0),
  infants: z.number().int().min(0).max(10).default(0),
  interests: z.array(z.string().max(50)).default([]),
  contactPreference: z.enum(CONTACT_PREFERENCES).default("phone"),
  preferredContactTime: z.enum(PREFERRED_CONTACT_TIMES).default("anytime"),
  notes: z.string().trim().max(2000).optional(),
  source: z.enum(LEAD_SOURCES).default("website"),
  sourceDetails: SourceDetailsSchema.optional(),
  website_hp: z.string().optional(),
});

export type ContactLeadInputType = z.infer<typeof ContactLeadInput>;

/**
 * Input Schema for Umrah Builder lead capture.
 */
export const BuilderLeadInput = z.object({
  fullName: z.string().trim().min(2, "الاسم مطلوب").max(120),
  phone: z.string().trim().min(6, "رقم الهاتف غير صالح").max(32),
  email: z.string().trim().email("البريد الإلكتروني غير صالح").optional().or(z.literal("")),
  governorate: z.string().trim().max(60).optional(),
  city: z.string().trim().max(60).optional(),
  tripId: z.string().uuid().optional().nullable(),
  tripName: z.string().trim().max(200).optional(),
  contactPreference: z.enum(CONTACT_PREFERENCES).default("whatsapp"),
  preferredContactTime: z.enum(PREFERRED_CONTACT_TIMES).default("anytime"),
  notes: z.string().trim().max(2000).optional(),
  source: z.enum(LEAD_SOURCES).default("umrah_builder"),
  sourceDetails: SourceDetailsSchema.optional(),
  builderSnapshot: BuilderSnapshotSchema,
  builderStepReached: z.string().max(50).default("submitted"),
});

export type BuilderLeadInputType = z.infer<typeof BuilderLeadInput>;

/**
 * Input Schema for manual lead creation by admin/staff in Sales Center.
 */
export const ManualLeadInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(32),
  email: z.string().trim().email().optional().or(z.literal("")),
  governorate: z.string().trim().max(60).optional(),
  city: z.string().trim().max(60).optional(),
  tripId: z.string().uuid().optional().nullable(),
  tripName: z.string().trim().max(200).optional(),
  travelersCount: z.number().int().min(1).max(50).default(1),
  adults: z.number().int().min(1).max(50).default(1),
  children: z.number().int().min(0).max(20).default(0),
  infants: z.number().int().min(0).max(10).default(0),
  interests: z.array(z.string().max(50)).default([]),
  contactPreference: z.enum(CONTACT_PREFERENCES).default("phone"),
  preferredContactTime: z.enum(PREFERRED_CONTACT_TIMES).default("anytime"),
  notes: z.string().trim().max(2000).optional(),
  source: z.enum(LEAD_SOURCES).default("phone"),
  sourceDetails: SourceDetailsSchema.optional(),
  branchId: z.string().uuid().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  initialStatus: z.enum(LEAD_STATUSES).default("new"),
});

export type ManualLeadInputType = z.infer<typeof ManualLeadInput>;

/**
 * Input Schema for updating lead status & loss reason.
 */
export const UpdateLeadStatusInput = z.object({
  leadId: z.string().uuid(),
  status: z.enum(LEAD_STATUSES),
  lossReason: z.enum(LOSS_REASONS).optional().nullable(),
  lossNotes: z.string().trim().max(1000).optional().nullable(),
  note: z.string().trim().max(1000).optional(),
});

/**
 * Input Schema for adding a lead interaction note.
 */
export const AddLeadNoteInput = z.object({
  leadId: z.string().uuid(),
  note: z.string().trim().min(1).max(2000),
  activityType: z
    .enum(["note", "call", "whatsapp", "status_change", "objection"])
    .default("note"),
});

/**
 * Input Schema for scheduling follow-up.
 */
export const ScheduleLeadFollowUpInput = z.object({
  leadId: z.string().uuid(),
  nextFollowUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح"),
  nextFollowUpTime: z.string().max(20).optional().nullable(),
  followUpNote: z.string().trim().max(500).optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
});

/**
 * Input Schema for recording structured objection.
 */
export const RecordLeadObjectionInput = z.object({
  leadId: z.string().uuid(),
  objection: z.enum(LOSS_REASONS),
  explanation: z.string().trim().max(1000).optional().nullable(),
});

/**
 * Input Schema for saving/sending custom offer.
 */
export const SaveLeadOfferInput = z.object({
  leadId: z.string().uuid(),
  offerAmount: z.number().positive("المبلغ يجب أن يكون موجباً"),
  offerCurrency: z.string().max(10).default("TND"),
  offerNotes: z.string().trim().max(2000).optional().nullable(),
  offerStatus: z.enum(OFFER_STATUSES).default("draft"),
});

/**
 * Input Schema for converting confirmed lead into a booking.
 */
export const ConvertLeadToBookingInput = z.object({
  leadId: z.string().uuid(),
  packageId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  emergencyContact: z.string().trim().max(60).optional().nullable(),
  specialRequests: z.string().trim().max(2000).optional().nullable(),
});

/**
 * Input Schema for editing an existing lead.
 */
export const EditLeadInput = z.object({
  leadId: z.string().uuid(),
  fullName: z.string().trim().min(2, "الاسم مطلوب").max(120),
  phone: z.string().trim().min(6, "رقم الهاتف غير صالح").max(32),
  email: z.string().trim().email("البريد الإلكتروني غير صالح").optional().or(z.literal("")).nullable(),
  governorate: z.string().trim().max(60).optional().nullable(),
  city: z.string().trim().max(60).optional().nullable(),
  tripId: z.string().uuid().optional().nullable(),
  tripName: z.string().trim().max(200).optional().nullable(),
  travelersCount: z.number().int().min(1).max(50).default(1),
  adults: z.number().int().min(1).max(50).default(1),
  children: z.number().int().min(0).max(20).default(0),
  infants: z.number().int().min(0).max(10).default(0),
  interests: z.array(z.string().max(50)).default([]),
  contactPreference: z.enum(CONTACT_PREFERENCES).default("phone"),
  preferredContactTime: z.enum(PREFERRED_CONTACT_TIMES).default("anytime"),
  notes: z.string().trim().max(2000).optional().nullable(),
  source: z.enum(LEAD_SOURCES).default("phone"),
});
export type EditLeadInputType = z.infer<typeof EditLeadInput>;

/**
 * Input Schema for archiving a lead.
 */
export const ArchiveLeadInput = z.object({
  leadId: z.string().uuid(),
  reason: z.string().trim().max(500).optional().nullable(),
});

/**
 * Input Schema for restoring an archived lead.
 */
export const RestoreLeadInput = z.object({
  leadId: z.string().uuid(),
});

/**
 * Input Schema for permanently deleting a lead.
 */
export const DeleteLeadInput = z.object({
  leadId: z.string().uuid(),
});

/**
 * Input Schema for bulk updating lead status.
 */
export const BulkUpdateLeadStatusInput = z.object({
  leadIds: z.array(z.string().uuid()).min(1, "حدد على الأقل Lead واحد"),
  status: z.enum(LEAD_STATUSES),
});

/**
 * Input Schema for bulk archiving leads.
 */
export const BulkArchiveLeadsInput = z.object({
  leadIds: z.array(z.string().uuid()).min(1, "حدد على الأقل Lead واحد"),
  reason: z.string().trim().max(500).optional().nullable(),
});

/**
 * Input Schema for bulk deleting leads.
 */
export const BulkDeleteLeadsInput = z.object({
  leadIds: z.array(z.string().uuid()).min(1, "حدد على الأقل Lead واحد"),
});

/**
 * Input Schema for assigning a lead to a team member.
 */
export const AssignLeadInput = z.object({
  leadId: z.string().uuid(),
  assignedTo: z.string().uuid().nullable().optional(),
  assignedToName: z.string().trim().max(120).nullable().optional(),
});

/**
 * Input Schema for bulk assigning leads.
 */
export const BulkAssignLeadsInput = z.object({
  leadIds: z.array(z.string().uuid()).min(1, "حدد على الأقل Lead واحد"),
  assignedTo: z.string().uuid().nullable().optional(),
  assignedToName: z.string().trim().max(120).nullable().optional(),
});

/**
 * Row-level schema for imported leads.
 */
export const ImportLeadRowInput = z.object({
  fullName: z.string().trim().min(2, "الاسم مطلوب").max(120),
  phone: z.string().trim().min(6, "رقم الهاتف غير صالح").max(32),
  email: z.string().trim().email().optional().or(z.literal("")).nullable(),
  governorate: z.string().trim().max(60).optional().nullable(),
  city: z.string().trim().max(60).optional().nullable(),
  tripName: z.string().trim().max(200).optional().nullable(),
  travelersCount: z.number().int().min(1).max(50).default(1),
  source: z.enum(LEAD_SOURCES).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(LEAD_STATUSES).optional().nullable(),
});
export type ImportLeadRowInputType = z.infer<typeof ImportLeadRowInput>;

/**
 * Batch import request schema.
 */
export const ImportLeadsBatchInput = z.object({
  rows: z.array(ImportLeadRowInput).min(1, "لا توجد صفوف للاستيراد").max(1000, "الحد الأقصى 1000 صف في الدفعة الواحدة"),
  duplicateStrategy: z.enum(["skip", "update", "new"]).default("skip"),
  defaultSource: z.enum(LEAD_SOURCES).default("other"),
  defaultStatus: z.enum(LEAD_STATUSES).default("new"),
});
export type ImportLeadsBatchInputType = z.infer<typeof ImportLeadsBatchInput>;

