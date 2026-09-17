import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { IconBadge } from "@/components/common/IconBadge";
import { cn } from "@/lib/utils";

/**
 * Composition pieces for the public programme detail page.
 *
 * The page they replace showed the same four facts three times — once in a
 * summary strip, again in a details table, and again in the sticky booking
 * card — which is what made it read as assembled rather than designed. These
 * parts exist so each fact has exactly one home, and so a programme the agency
 * has only half-filled still produces a page with a deliberate shape instead
 * of a scaffold with holes in it.
 */

/* ------------------------------------------------------------------ heading */

export function SectionHeading({
  id,
  title,
  description,
  className,
}: {
  id?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-5", className)}>
      <h2 id={id} className="text-h4 font-bold leading-tight text-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-1.5 text-small leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

/** Border-first card. No resting shadow — the page's default surface. */
export function Surface({
  children,
  className,
  tinted,
}: {
  children: ReactNode;
  className?: string;
  tinted?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border",
        tinted ? "border-primary/15 bg-accent/40" : "border-border-subtle bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------- facts */

export type Fact = {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

/**
 * Every published fact about the programme, in one place.
 *
 * Callers filter before passing, so an unpublished field is absent rather than
 * blank: no "Hotel: —" rows, and nothing plausible invented to fill a gap.
 */
export function FactGrid({ facts, className }: { facts: Fact[]; className?: string }) {
  if (facts.length === 0) return null;
  return (
    <dl className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {facts.map((f) => (
        <div
          key={f.key}
          className="flex items-start gap-3 rounded-card border border-border-subtle bg-card p-4"
        >
          {/* Bordered container, not a filled colour chip: the icon is a
              signpost for the label, not a decoration competing with it. */}
          <IconBadge icon={f.icon} size="sm" className="text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              {f.label}
            </dt>
            <dd className="mt-0.5 text-small font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
              {f.value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/* ---------------------------------------------------------------- itinerary */

export type ItineraryStep = { day: string; title: string; description: string };

/**
 * The programme day by day.
 *
 * A numbered rail rather than a stack of identical cards: the point of an
 * itinerary is the progression, and that has to be visible before any of the
 * text is read. The day marker keeps the agency's own label when it published
 * one and falls back to the position in the list.
 */
export function Itinerary({ steps }: { steps: ItineraryStep[] }) {
  if (steps.length === 0) return null;
  return (
    <ol className="relative space-y-4">
      {steps.map((step, i) => (
        <li key={i} className="relative flex gap-4">
          {/* The rail: a line between markers, absent after the last one. */}
          <div className="flex flex-col items-center">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-accent/60 text-small font-bold tabular-nums text-primary">
              {String(i + 1).padStart(2, "0")}
            </span>
            {i < steps.length - 1 && (
              <span className="mt-1 w-px flex-1 bg-border-subtle" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1 rounded-card border border-border-subtle bg-card p-4 sm:p-5">
            {step.day && (
              <p className="text-caption font-semibold uppercase tracking-wide text-primary">
                {step.day}
              </p>
            )}
            {step.title && (
              <h3 className="mt-1 text-body font-bold leading-snug text-foreground">
                {step.title}
              </h3>
            )}
            {step.description && (
              <p className="mt-1.5 text-small leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------ include lists */

/**
 * What the price covers, and what it does not.
 *
 * Exclusions used to be drawn in the destructive red, which reads as an error
 * rather than as information — nothing has gone wrong when a visa fee is not
 * included. Both lists share one surface; the difference is carried by the
 * mark and the text weight.
 */
export function InclusionList({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: "included" | "excluded";
}) {
  if (items.length === 0) return null;
  const included = variant === "included";
  return (
    <div>
      <h3 className="mb-3 text-small font-bold text-foreground">{title}</h3>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-small leading-relaxed">
            <span
              aria-hidden="true"
              className={cn(
                "mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full",
                included ? "bg-brand-green" : "bg-muted-foreground/40",
              )}
            />
            <span className={included ? "text-foreground" : "text-muted-foreground"}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
