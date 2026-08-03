import { supabase } from "@/integrations/supabase/client";

const MEDIA_BUCKET = "media";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function extOf(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "bin";
}

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

/**
 * Upload a file to the media bucket and return its public URL.
 * Requires an admin session (RLS on storage.objects enforces it).
 */
export async function uploadMedia(file: File, folder: string): Promise<string> {
  if (file.size > MAX_MEDIA_BYTES) {
    throw new Error("File is too large (max 10 MB)");
  }
  if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
    throw new Error("Unsupported file type. Use JPG, PNG, WebP, AVIF or GIF.");
  }
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/\.{2,}/g, "").slice(0, 64) || "misc";
  const path = `${safeFolder}/${randomId()}.${extOf(file.name)}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  // For private buckets, generate a long-lived signed URL (fallback for display).
  // Because we have a "media public read" policy on storage.objects, the object URL is publicly readable.
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteMediaByUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const marker = `/${MEDIA_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length).split("?")[0];
  if (!path) return;
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}
