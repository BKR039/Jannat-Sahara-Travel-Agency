import { createServerFn } from "@tanstack/react-start";
import { ContactMessageInput, NewsletterInput, PassportUploadInput } from "./public.schema";

/**
 * Public (unauthenticated) write endpoints. Visitors have no direct database
 * write access — every write is validated, sanitized and rate limited here.
 */

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ContactMessageInput.parse(d))
  .handler(async ({ data }) => {
    const { enforceRateLimit, sanitizeText, sanitizeOptionalText, sanitizeEmail } = await import(
      "./security.server"
    );
    await enforceRateLimit({ scope: "contact_message", limit: 5, windowSeconds: 600 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      name: sanitizeText(data.name, 120),
      email: sanitizeEmail(data.email),
      phone: sanitizeOptionalText(data.phone, 32),
      subject: sanitizeOptionalText(data.subject, 160),
      message: sanitizeText(data.message, 2000),
    });

    if (error) {
      console.error("[contact] insert failed", error.message);
      throw new Error("Failed to send message");
    }
    return { ok: true };
  });

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => NewsletterInput.parse(d))
  .handler(async ({ data }) => {
    const { enforceRateLimit, sanitizeEmail } = await import("./security.server");
    await enforceRateLimit({ scope: "newsletter", limit: 5, windowSeconds: 600 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = sanitizeEmail(data.email);

    const { error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .insert({ email, locale: data.locale ?? "ar" });

    if (error) {
      const message = error.message?.toLowerCase() ?? "";
      if (error.code === "23505" || message.includes("duplicate") || message.includes("unique")) {
        return { ok: true, duplicate: true };
      }
      console.error("[newsletter] insert failed", error.message);
      throw new Error("Failed to subscribe");
    }
    return { ok: true, duplicate: false };
  });

/**
 * Passport upload. The private bucket accepts no anonymous writes; bytes are
 * validated (size + declared MIME + magic bytes) before they are stored, and
 * the storage path is generated server-side.
 */
export const uploadPassport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PassportUploadInput.parse(d))
  .handler(async ({ data }) => {
    const {
      enforceRateLimit,
      decodeBase64,
      magicBytesMatch,
      extensionForMime,
      MAX_PASSPORT_UPLOAD_BYTES,
    } = await import("./security.server");

    await enforceRateLimit({ scope: "passport_upload", limit: 20, windowSeconds: 3600 });

    const bytes = decodeBase64(data.dataBase64);
    if (bytes.byteLength === 0) throw new Error("Empty file");
    if (bytes.byteLength > MAX_PASSPORT_UPLOAD_BYTES) throw new Error("File too large");
    if (!magicBytesMatch(bytes, data.contentType)) throw new Error("File content does not match its type");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `bookings/${crypto.randomUUID()}/passport.${extensionForMime(data.contentType)}`;

    const { error } = await supabaseAdmin.storage.from("passports").upload(path, bytes, {
      contentType: data.contentType,
      upsert: false,
    });

    if (error) {
      console.error("[passport] upload failed", error.message);
      throw new Error("Failed to upload file");
    }
    return { path };
  });
