import { transformSrcSet } from "@/lib/image-srcset";

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
  objectPosition,
}: {
  image: string | null;
  alt: string;
  objectPosition: string;
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
          sizes="(min-width: 1024px) 55vw, 100vw"
          style={{ objectPosition }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full bg-surface-sunken" aria-hidden="true" />
      )}

      {/* Directional wash that softly dissolves the inner edge towards the copy */}
      <div className="ds-hero-wash pointer-events-none absolute inset-0" aria-hidden="true" />
    </div>
  );
}
