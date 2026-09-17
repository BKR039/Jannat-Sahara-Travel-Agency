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
  if (!src.includes("/storage/v1/render/image/public/")) return undefined;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return undefined;
  }
  const declared = Number(url.searchParams.get("width"));
  if (!Number.isFinite(declared) || declared <= 0) return undefined;
  // Never upscale past the width the content author chose.
  const widths = SRCSET_WIDTHS.filter((w) => w < declared).concat(declared);
  return widths
    .map((w) => {
      const u = new URL(url);
      u.searchParams.set("width", String(w));
      // A stored URL missing this would otherwise generate cropped variants.
      if (!u.searchParams.has("height")) u.searchParams.set("resize", RESIZE_MODE);
      return `${u.toString()} ${w}w`;
    })
    .join(", ");
}
