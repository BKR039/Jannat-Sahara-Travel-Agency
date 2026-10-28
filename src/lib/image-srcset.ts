/**
 * Responsive `srcSet` for agency media served through Supabase's image
 * transform, which resizes from the `width` query parameter.
 *
 * Without this the `sizes` attribute on `LazyImage` has nothing to choose
 * between, so a card roughly 300px wide downloads the full-size cover. Any
 * other host (an absolute stock URL, a local asset) is returned untouched.
 */

/** Widths offered to the browser; it picks one using `sizes`. */
const SRCSET_WIDTHS = [400, 640, 900, 1280, 1920];

/**
 * `width` on its own does NOT scale the image: the transform keeps the source
 * height and crops the width to fit, so a 6000x4000 photo came back 1920x4000
 * — a narrow slice of the middle, which is what put a zoomed minaret behind the
 * hero. `resize=contain` is what performs a proportional resize.
 */
const RESIZE_MODE = "contain";

export function transformSrcSet(src: string): string | undefined {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return undefined;
  }

  // Admin uploads use getPublicUrl(), which returns `/object/public/` URLs.
  // Convert those to Supabase's image-rendering endpoint so cards and hero
  // images can request a right-sized variant instead of downloading originals.
  const objectPath = "/storage/v1/object/public/";
  const renderPath = "/storage/v1/render/image/public/";
  if (url.pathname.includes(objectPath)) {
    url.pathname = url.pathname.replace(objectPath, renderPath);
  } else if (!url.pathname.includes(renderPath)) {
    return undefined;
  }

  let declared = Number(url.searchParams.get("width"));
  if (!Number.isFinite(declared) || declared <= 0) {
    declared = 1920;
  }
  // Never upscale past the width the content author chose.
  const widths = SRCSET_WIDTHS.filter((w) => w < declared).concat(declared);
  return widths
    .map((w) => {
      const u = new URL(url);
      u.searchParams.set("width", String(w));
      u.searchParams.set("quality", u.searchParams.get("quality") ?? "75");
      // Avoid a server-side center crop when no explicit dimensions were saved.
      if (!u.searchParams.has("height")) u.searchParams.set("resize", RESIZE_MODE);
      return `${u.toString()} ${w}w`;
    })
    .join(", ");
}
