import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Page rhythm primitives.
 *
 * Landing sections had been setting their own padding and container ad hoc
 * (`py-16`, `py-20`, `py-24`, some with `max-w-7xl`, some without), which is
 * why the page read as a stack of unrelated components. These two wrappers are
 * the single place that decides vertical rhythm and content width, so every
 * section lines up.
 */

type Tone = "default" | "sunken" | "dark";

const TONE: Record<Tone, string> = {
  default: "bg-background",
  sunken: "bg-surface-sunken/50",
  dark: "bg-brand-green text-brand-green-foreground",
};

/**
 * Three steps only, so spacing stays a scale rather than a set of guesses.
 *
 * Tightened once: the previous `md` step (py-16 md:py-24) plus a 14-unit
 * heading margin left roughly 200px of empty page between the last card of one
 * section and the first word of the next, which read as dead space rather than
 * breathing room. Sections are still clearly separated — by tone changes and
 * borders as much as by padding.
 *
 * The steps now read from the layout spacing tokens (48 / 72 / 96) rather than
 * their own Tailwind pairs, so page rhythm and component spacing come from one
 * scale. This is the single place that decides it.
 */
const SPACE = {
  sm: "py-[var(--space-layout-sm)]",
  md: "py-[var(--space-layout-md)]",
  lg: "py-[var(--space-layout-lg)]",
} as const;

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>
  );
}

export function Section({
  children,
  tone = "default",
  space = "md",
  className,
  containerClassName,
  id,
  bare = false,
}: {
  children: ReactNode;
  tone?: Tone;
  space?: keyof typeof SPACE;
  className?: string;
  containerClassName?: string;
  id?: string;
  /** Opt out of the container for full-bleed content that manages its own width. */
  bare?: boolean;
}) {
  return (
    <section id={id} className={cn(TONE[tone], SPACE[space], className)}>
      {bare ? children : <Container className={containerClassName}>{children}</Container>}
    </section>
  );
}
