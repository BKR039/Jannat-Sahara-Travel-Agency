/**
 * Server-only security helpers: client identification, rate limiting,
 * input sanitization and upload validation.
 *
 * Never import this from components — it reads request state and the
 * service-role Supabase client.
 */
import { getRequest } from "@tanstack/react-start/server";

/* -------------------------------------------------- client identity */

export function getClientIp(): string {
  try {
    const request = getRequest();
    const h = request?.headers;
    if (!h) return "unknown";
    const candidate =
      h.get("cf-connecting-ip") ??
      h.get("x-real-ip") ??
      h.get("x-forwarded-for")?.split(",")[0] ??
      "unknown";
    return candidate.trim().slice(0, 64) || "unknown";
  } catch {
    return "unknown";
  }
}

/* -------------------------------------------------- rate limiting */

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Please try again later.") {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Fixed-window rate limiter backed by public.rate_limits (service-role only).
 * Fails open on infrastructure errors so a logging outage can't block bookings.
 */
export async function enforceRateLimit(options: {
  scope: string;
  limit: number;
  windowSeconds: number;
  identifier?: string;
  message?: string;
}): Promise<void> {
  const { scope, limit, windowSeconds, message } = options;
  const identifier = (options.identifier ?? getClientIp()).slice(0, 128);

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

    const { count, error } = await supabaseAdmin
      .from("rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("scope", scope)
      .eq("identifier", identifier)
      .gte("created_at", since);

    if (error) {
      console.error("[rate-limit] lookup failed", error.message);
      return;
    }

    if ((count ?? 0) >= limit) {
      throw new RateLimitError(message);
    }

    await supabaseAdmin.from("rate_limits").insert({ scope, identifier });

    // Opportunistic housekeeping: drop entries far outside every window.
    if (Math.random() < 0.05) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabaseAdmin.from("rate_limits").delete().lt("created_at", cutoff);
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.error("[rate-limit] unavailable", err);
  }
}

/* -------------------------------------------------- sanitization */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Strip control characters, HTML markup and collapse whitespace.
 * Stored values are always rendered as text, this is defence in depth.
 */
export function sanitizeText(value: string, maxLength = 2000): string {
  return value
    .replace(CONTROL_CHARS, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeOptionalText(
  value: string | null | undefined,
  maxLength = 2000,
): string | null {
  if (value == null) return null;
  const clean = sanitizeText(value, maxLength);
  return clean.length ? clean : null;
}

export function sanitizeEmail(value: string): string {
  return sanitizeText(value, 254).toLowerCase().replace(/\s+/g, "");
}

/** Header values must never carry CR/LF (header injection). */
export function sanitizeHeaderValue(value: string, maxLength = 254): string {
  return value.replace(/[\r\n]/g, "").trim().slice(0, maxLength);
}

/* -------------------------------------------------- upload validation */

export const MAX_PASSPORT_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

export const ALLOWED_PASSPORT_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

export function extensionForMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? "bin";
}

/** Verify the declared MIME type against the file's magic bytes. */
export function magicBytesMatch(bytes: Uint8Array, mime: string): boolean {
  const startsWith = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  switch (mime) {
    case "image/jpeg":
      return startsWith(0xff, 0xd8, 0xff);
    case "image/png":
      return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/webp":
      return startsWith(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    case "image/heic":
      return String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
    case "application/pdf":
      return startsWith(0x25, 0x50, 0x44, 0x46);
    default:
      return false;
  }
}

export function decodeBase64(data: string): Uint8Array {
  const normalized = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
  const binary = atob(normalized.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
