export function SkeletonGrid({ count = 4, aspect = "aspect-[4/3]" }: { count?: number; aspect?: string }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-3 rounded-2xl border border-border bg-card p-3">
          <div className={`${aspect} rounded-xl bg-muted`} />
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
