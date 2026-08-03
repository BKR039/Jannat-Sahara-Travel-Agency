import type { ReactNode } from "react";
import { Suspense } from "react";
import { useInView } from "@/hooks/useInView";

/**
 * Defers mounting (and therefore chunk download + data fetching) of a
 * below-the-fold section until it approaches the viewport.
 * Reserves vertical space with a skeleton so scrolling never jumps.
 */
export function LazySection({
  children,
  minHeight = "24rem",
  fallback,
  rootMargin = "300px 0px",
}: {
  children: ReactNode;
  minHeight?: string;
  fallback?: ReactNode;
  rootMargin?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin });

  const placeholder = fallback ?? (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-7xl animate-pulse rounded-[var(--radius-card)] bg-surface-sunken/60"
      style={{ minHeight }}
    />
  );

  return (
    <div ref={ref} style={inView ? undefined : { minHeight }}>
      {inView ? <Suspense fallback={placeholder}>{children}</Suspense> : placeholder}
    </div>
  );
}
