import type { LucideIcon } from "lucide-react";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { cn } from "@/lib/utils";

/**
 * The one icon container used by the public sections.
 *
 * Before this existed every section invented its own: a 48px rounded-input box
 * with a 24px glyph on the service cards, a `p-3` box with a 20px glyph on the
 * features, a 40px circle on the hero, a `p-3` `rounded-lg` tint on the stats.
 * Same visual idea, four different optical sizes and three different radii, so
 * the icons read as decoration rather than as one language — which is exactly
 * the complaint. Sizing, radius, border and hover behaviour now live here, and
 * a section picks a size instead of hand-rolling a box.
 *
 * Sizes follow the rule the design system already implies: primary
 * service/feature icons are 20–24px so they carry a card, compact UI is 16px so
 * it sits inside a row without shouting. The container scales with them, so the
 * glyph keeps the same optical weight inside the box at every size.
 */

const BOX = {
  sm: "h-9 w-9 rounded-input",
  md: "h-11 w-11 rounded-input",
  lg: "h-12 w-12 rounded-card",
} as const;

const GLYPH = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
} as const;

const TONE = {
  /* Border-first, the default surface treatment of this design system. */
  surface: "border border-border-subtle bg-surface-sunken/60 text-primary",
  /* Tinted, no border — for cards that already sit on a bordered surface. */
  accent: "bg-primary/10 text-primary",
} as const;

export interface IconBadgeProps {
  /** CMS icon name (resolved through DynamicIcon). */
  name?: string | null;
  /** Static icon, when the section owns the choice rather than the CMS. */
  icon?: LucideIcon;
  size?: keyof typeof BOX;
  tone?: keyof typeof TONE;
  /**
   * Fills on hover of the nearest `group`. Only for badges inside a card that
   * is itself a link or a button — a static badge that reacts to hover reads
   * as clickable when it is not.
   */
  interactive?: boolean;
  className?: string;
}

export function IconBadge({
  name,
  icon: Icon,
  size = "md",
  tone = "surface",
  interactive = false,
  className,
}: IconBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid shrink-0 place-items-center transition-colors duration-base ease-standard",
        BOX[size],
        TONE[tone],
        interactive &&
          "group-hover:border-primary/40 group-hover:bg-primary group-hover:text-primary-foreground",
        className,
      )}
    >
      {Icon ? (
        <Icon className={GLYPH[size]} />
      ) : (
        <DynamicIcon name={name} className={GLYPH[size]} />
      )}
    </span>
  );
}
