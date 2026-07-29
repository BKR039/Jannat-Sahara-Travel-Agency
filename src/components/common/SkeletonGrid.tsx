import { Inbox } from "lucide-react";

/** Skeleton grid — DS /components/06-feedback.md · matches PackageCard geometry */
export function SkeletonGrid({
  count = 4,
  aspect = "aspect-[4/3]",
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
          className="animate-pulse space-y-4 overflow-hidden rounded-lg border border-border-subtle bg-card p-3 shadow-sm"
        >
          <div className={`${aspect} rounded-md bg-surface-sunken`} />
          <div className="h-4 w-3/4 rounded-xs bg-surface-sunken" />
          <div className="h-3 w-1/2 rounded-xs bg-surface-sunken" />
        </div>
      ))}
    </div>
  );
}

/** Empty state — DS /components/06-feedback.md */
export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface p-12 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <p className="text-body text-muted-foreground">{label}</p>
    </div>
  );
}
