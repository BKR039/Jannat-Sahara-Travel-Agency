/**
 * Client CRM domain types for the Jannat Sahara CRM system.
 */

export type CustomerLifecycleStatus = "lead" | "customer" | "vip" | "inactive" | "cancelled";

export interface CustomerSummary {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  bookings: number;
  requests: number;
  umrahRequests: number;
  lastTrip: string | null;
  lastActivity: string;
  totalSpent: number;
  totalPaid: number;
  totalRemaining: number;
  currency: string;
  status: CustomerLifecycleStatus;
  hasActiveTrip: boolean;
  hasUnpaidBalance: boolean;
  installmentsCount: number;
  overdueCount: number;
  branchId: string | null;
  branchName: string | null;
  archived_at?: string | null;
}

export interface CustomerInstallment {
  id: string;
  customer_key: string;
  booking_id: string | null;
  request_id: string | null;
  installment_number: number;
  title: string;
  amount: number;
  currency: string;
  due_date: string | null;
  paid_at: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  payment_method: string | null;
  note: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerPassenger {
  id: string;
  booking_id: string;
  passenger_type: string;
  sort_order: number;
  is_primary: boolean;
  full_name: string;
  passport_number: string | null;
  nationality: string | null;
  gender: string | null;
  date_of_birth: string | null;
  passport_expiry: string | null;
  phone: string | null;
  email: string | null;
  emergency_contact: string | null;
  passport_path: string | null;
  notes: string | null;
}

export interface CustomerBooking {
  id: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  package_id?: string | null;
  package_title: string | null;
  package_category?: string | null;
  status: string;
  payment_status: string;
  paid_amount: number | null;
  total_price: number | null;
  currency: string | null;
  people: number | null;
  adults?: number | null;
  children?: number | null;
  infants?: number | null;
  notes?: string | null;
  created_at: string;
  branch_id?: string | null;
  passengers?: CustomerPassenger[];
  installments?: CustomerInstallment[];
}

export interface CustomerUmrahRequest {
  id: string;
  reference: string | null;
  customer_key?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  departure_date?: string | null;
  return_date?: string | null;
  makkah_nights: number | null;
  madinah_nights: number | null;
  adults: number | null;
  children: number | null;
  infants: number | null;
  created_at: string;
  last_contact_at?: string | null;
  offer_amount?: number | null;
  offer_sent_at?: string | null;
}

export interface CustomerFlightRequest {
  id: string;
  reference: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  status: string;
  from_airport: string;
  to_airport: string;
  trip_type: string;
  created_at: string;
  last_contact_at?: string | null;
}

export interface CustomerMessage {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  status: string;
  handled: boolean;
  created_at: string;
}

export interface CustomerTimelineEvent {
  id: string;
  type:
    | "customer_created"
    | "booking_created"
    | "request_submitted"
    | "flight_request"
    | "message_received"
    | "payment_made"
    | "installment_paid"
    | "installment_due"
    | "status_changed"
    | "note_added"
    | "offer_sent";
  date: string;
  title: string;
  description: string;
  badge?: string;
  amount?: number;
  currency?: string;
  notes?: string | null;
  relatedId?: string;
  authorEmail?: string | null;
}

export interface CustomerInternalNote {
  id: string;
  note: string;
  author_id?: string | null;
  author_email: string | null;
  created_at: string;
}

export interface CustomerDetail extends CustomerSummary {
  bookingRows: CustomerBooking[];
  flightRows: CustomerFlightRequest[];
  messageRows: CustomerMessage[];
  customRows: CustomerUmrahRequest[];
  installments: CustomerInstallment[];
  internalNotes: CustomerInternalNote[];
  notes: CustomerInternalNote[];
  timeline: CustomerTimelineEvent[];
  profileNotes: string | null;
}
