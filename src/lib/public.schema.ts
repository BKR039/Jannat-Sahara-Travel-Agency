import { z } from "zod";

const NAME = z.string().trim().min(2).max(120);
const EMAIL = z.string().trim().email().max(254);
const PHONE = z
  .string()
  .trim()
  .max(32)
  .regex(/^[+()\d\s-]*$/, "Invalid phone number")
  .optional()
  .or(z.literal(""));

export const ContactMessageInput = z.object({
  name: NAME,
  email: EMAIL,
  phone: PHONE,
  subject: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().min(5).max(2000),
});
export type ContactMessageInputType = z.infer<typeof ContactMessageInput>;

export const NewsletterInput = z.object({
  email: EMAIL,
  locale: z.enum(["ar", "fr", "en"]).optional(),
});

export const PASSPORT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

export const PassportUploadInput = z.object({
  contentType: z.enum(PASSPORT_MIME_TYPES),
  // ~8 MB binary ≈ 11.2 MB base64; hard cap protects the request body too.
  dataBase64: z.string().min(16).max(12_000_000),
});
