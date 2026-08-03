import { memo, useState } from "react";
import { cn } from "@/lib/utils";

type LazyImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  /** wrapper class — controls aspect ratio / rounding */
  wrapperClassName?: string;
  /** true for above-the-fold LCP images (hero) */
  priority?: boolean;
  sizes?: string;
  onClick?: () => void;
};

/**
 * Optimized image primitive.
 * - native lazy loading + async decoding for below-fold media
 * - `priority` opts into eager loading + high fetch priority (LCP hero)
 * - skeleton shimmer placeholder + fade-in on decode (no layout shift)
 */
function LazyImageBase({
  src,
  alt,
  className,
  wrapperClassName,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
  onClick,
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={cn("relative overflow-hidden bg-surface-sunken", wrapperClassName)}
      onClick={onClick}
    >
      {!loaded && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-surface-sunken" />}
      {src && (
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-slow ease-standard",
            loaded ? "opacity-100" : "opacity-0",
            className,
          )}
        />
      )}
    </div>
  );
}

export const LazyImage = memo(LazyImageBase);
