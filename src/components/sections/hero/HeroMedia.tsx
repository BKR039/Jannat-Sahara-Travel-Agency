import { transformSrcSet } from "@/lib/image-srcset";
import fallbackImage from "@/img/umrah images (13).jpg";

/**
 * The photograph.
 *
 * Two different compositions, because one does not survive both widths.
 *
 * From `lg` it is full bleed behind the whole hero and the copy sits on a warm
 * wash over one side of it. Confining the picture to a column beside the text
 * made it read as an illustration next to some copy rather than as the first
 * impression of the agency.
 *
 * Below `lg` that inverts: the frame's subject sits in the vertical middle, so
 * on a phone — where the picture is cropped to roughly a fifth of its width and
 * the copy needs most of the height — anything that keeps the copy readable
 * also buries the Kaaba. The photograph gets its own block under the copy
 * instead, cropped to a landscape band that holds the subject, and no wash
 * touches it at all.
 *
 * `objectPosition` follows from that: a wide desktop shows essentially the
 * whole frame so the horizontal anchor changes nothing, while the narrow band
 * shows a slice, and anchoring it near the subject is what keeps the Kaaba in
 * view. The vertical anchor sits below centre to favour the courtyard and the
 * pilgrims over empty sky.
 */
export function HeroMedia({
  image,
  alt,
  objectPosition = "center 38%",
}: {
  image: string | null;
  alt: string;
  objectPosition?: string;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {image ? (
        <img
          src={image}
          srcSet={transformSrcSet(image)}
          alt={alt}
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          sizes="100vw"
          onError={(event) => {
            const imageElement = event.currentTarget;
            imageElement.onerror = null;
            imageElement.removeAttribute("srcset");
            imageElement.src = fallbackImage;
          }}
          style={{ objectPosition }}
          className="h-full w-full object-cover transition-opacity duration-700 ease-out"
        />
      ) : (
        <div
          className="h-full w-full bg-gradient-to-b from-[var(--hero-frame-top)] to-[var(--hero-frame-bottom)]"
          aria-hidden="true"
        />
      )}

      {/* Layered cinematic overlay for full-bleed photography and contrast */}
      <div
        className="ds-hero-cinematic-overlay pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
    </div>
  );
}
