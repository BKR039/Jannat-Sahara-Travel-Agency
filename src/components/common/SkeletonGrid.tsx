/** Skeleton grid — DS /components/06-feedback.md · matches PackageCard geometry */
export function SkeletonGrid({
  count = 4,
  aspect = "aspect-[16/10]",
}: {
  count?: number;
  aspect?: string;
}) {
  return (
    <div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="animate-pulse overflow-hidden rounded-[var(--radius-card)] border border-border-subtle bg-card shadow-sm"
        >
          <div className={`${aspect} w-full bg-surface-sunken`} />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 rounded-xs bg-surface-sunken" />
            <div className="h-3 w-full rounded-xs bg-surface-sunken" />
            <div className="h-3 w-1/2 rounded-xs bg-surface-sunken" />
            <div className="flex gap-2 pt-2">
              <div className="h-9 flex-1 rounded-[var(--radius-button)] bg-surface-sunken" />
              <div className="h-9 flex-1 rounded-[var(--radius-button)] bg-surface-sunken" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
