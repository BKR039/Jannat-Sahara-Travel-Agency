import { z } from "zod";

export const PassengerInput = z.object({
  type: z.enum(["adult", "child", "infant"]),
  isPrimary: z.boolean().default(false),
  fullName: z.string().trim().min(1).max(120),
  passportNumber: z.string().trim().max(40).optional().nullable(),
  nationality: z.string().trim().max(80).optional().nullable(),
  gender: z.string().trim().max(20).optional().nullable(),
  dateOfBirth: z.string().trim().max(20).optional().nullable(),
  passportExpiry: z.string().trim().max(20).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().max(254).optional().nullable(),
  emergencyContact: z.string().trim().max(160).optional().nullable(),
  passportPath: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const BookingInput = z.object({
  packageId: z.string().uuid().nullable().optional(),
  packageTitle: z.string().trim().max(200).optional().nullable(),
  packageCategory: z.string().trim().max(50).optional().nullable(),
  adults: z.number().int().min(1).max(30),
  children: z.number().int().min(0).max(30),
  infants: z.number().int().min(0).max(30),
  totalPrice: z.number().min(0).nullable().optional(),
  currency: z.string().trim().max(10).default("TND"),
  communicationPreference: z.string().trim().max(30).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  passengers: z.array(PassengerInput).min(1).max(60),
});

export type PassengerInput = z.infer<typeof PassengerInput>;
export type BookingInput = z.infer<typeof BookingInput>;

