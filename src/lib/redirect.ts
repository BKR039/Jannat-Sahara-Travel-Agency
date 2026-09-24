/**
 * Redirect & URL Security Helpers (SEC-14, SEC-15).
 * Defends against open redirects, backslash escapes (/\evil.com), protocol-relative URLs (//evil.com),
 * pseudo-protocols (javascript:, data:, vbscript:), control characters, and encoded bypasses.
 */

export function safeNext(next: string | undefined): string | null {
  if (!next || typeof next !== "string") return null;
  const trimmed = next.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("\\")
  ) {
    return null;
  }
  // Disallow control characters
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F-\u009F]/.test(trimmed)) {
    return null;
  }
  // Disallow pseudo-protocols anywhere in redirect
  if (/javascript:|data:|vbscript:/i.test(trimmed)) {
    return null;
  }
  try {
    const parsed = new URL(trimmed, "https://janat-sahara.local");
    if (parsed.origin !== "https://janat-sahara.local") return null;
    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) return null;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return null;
  }
}

export function assertSafeRedirect(urlStr: string): boolean {
  try {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://janat-sahara.local";
    const parsed = new URL(urlStr, origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Invalid redirect URL protocol");
    }
    return true;
  } catch {
    throw new Error("Invalid redirect URL");
  }
}
