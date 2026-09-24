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
      className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 opacity-70"
      style={{ minHeight }}
    >
      <div className="flex flex-col items-center mb-8 space-y-2.5">
        <div className="h-3 w-24 rounded-full bg-surface-sunken motion-reduce:animate-none" />
        <div className="h-5 w-44 rounded-md bg-surface-sunken motion-reduce:animate-none" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-44 rounded-[var(--radius-card)] border border-border-subtle/50 bg-surface/30 p-4 space-y-3"
          >
            <div className="h-3 w-20 rounded-xs bg-surface-sunken motion-reduce:animate-none" />
            <div className="h-4 w-3/4 rounded-xs bg-surface-sunken motion-reduce:animate-none" />
            <div className="h-3 w-full rounded-xs bg-surface-sunken/60 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div ref={ref} style={inView ? undefined : { minHeight }}>
      {inView ? <Suspense fallback={placeholder}>{children}</Suspense> : placeholder}
    </div>
  );
}
