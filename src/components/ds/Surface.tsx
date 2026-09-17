import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The card. One radius, one border, one elevation ramp.
 *
 * Tailwind's radius scale is already remapped onto the design system in
 * `styles.css`, so `rounded-lg` genuinely renders `--radius-card`. What was
 * missing is a single place that decides *which* step a card takes, which is
 * why the same product rendered 14px, 20px and 44px cards side by side.
 *
 * Elevation is a prop rather than a class so a card cannot quietly acquire a
 * heavier shadow than its role deserves.
 *
 * The default is deliberately `flat`. The Astrix reference defines its cards
 * with a border and a surface-contrast step (`rounded-xl border bg-card`) and
 * carries no shadow at rest — that restraint is most of why it reads as
 * expensive rather than busy. Shadow is reserved for things that genuinely
 * float above the page: dropdowns, popovers, dialogs, and a card while it is
 * being hovered.
 */

type Elevation = "flat" | "resting" | "raised" | "floating";
type Tone = "surface" | "sunken" | "accent";

const ELEVATION: Record<Elevation, string> = {
  /* Border-defined, like the reference. */
  flat: "shadow-none",
  resting: "shadow-xs",
  raised: "shadow-sm",
  /* Genuinely above the page: menus, popovers, dialogs. */
  floating: "shadow-lg",
};

const TONE: Record<Tone, string> = {
  surface: "bg-surface",
  sunken: "bg-surface-sunken/60",
  accent: "bg-primary/5",
};

const PADDING = {
  none: "",
  sm: "p-[var(--space-4)]",
  md: "p-[var(--space-5)]",
  lg: "p-[var(--space-6)]",
} as const;

export function Surface({
  children,
  as: Tag = "div",
  elevation = "flat",
  tone = "surface",
  padding = "md",
  featured = false,
  interactive = false,
  className = "",
  ...rest
}: {
  children: ReactNode;
  as?: ElementType;
  elevation?: Elevation;
  tone?: Tone;
  padding?: keyof typeof PADDING;
  /** Featured surfaces take the larger radius — the only permitted step up. */
  featured?: boolean;
  /** Adds the hover lift. Only for surfaces that are actually clickable. */
  interactive?: boolean;
  className?: string;
} & Record<string, unknown>) {
  return (
    <Tag
      className={cn(
        featured ? "rounded-card-lg" : "rounded-card",
        "border border-border-subtle",
        TONE[tone],
        ELEVATION[elevation],
        PADDING[padding],
        interactive && [
          "transition-[box-shadow,transform] duration-fast ease-standard",
          "hover:-translate-y-0.5 hover:border-border hover:shadow-sm",
          "motion-reduce:transform-none motion-reduce:transition-none",
        ],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
