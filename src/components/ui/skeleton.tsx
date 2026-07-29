import { cn } from "@/lib/utils";

/** Skeleton — DS /components/06-feedback.md · sunken surface, shimmer honors reduced motion */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-sunken", className)}
      {...props}
    />
  );
}

export { Skeleton };
