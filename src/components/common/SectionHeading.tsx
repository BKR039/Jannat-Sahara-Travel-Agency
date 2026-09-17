import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Section Heading — DS /components/08-marketing.md · eyebrow chip + .text-h2 + lead
 *
 * The eyebrow takes an optional lucide icon rather than the emoji that used to
 * be passed in as text ("✦", "★★★★★", "📷", "📰"). Emoji render in the system
 * font at a different weight and colour to every other glyph on the page, so
 * they broke the icon system; these now match the rest of the UI.
 */
export function SectionHeading({
  eyebrow,
  icon: Icon,
  title,
  description,
  align = "center",
  className,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  icon?: LucideIcon;
  title: string;
  description?: string;
  align?: "center" | "start";
  className?: string;
  /**
   * `h1` is allowed because several pages are built entirely from this
   * component and so had no top-level heading at all — /contact, /blog and
   * /branches opened with an `h2`, leaving the document outline headless for
   * a screen reader and the page without an h1 for a crawler. The visual size
   * is unchanged; only the element differs.
   */
  as?: "h1" | "h2" | "h3";
}) {
  const centred = align === "center";
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-3 md:mb-11",
        centred ? "items-center text-center" : "items-start text-start",
        className,
      )}
    >
      {eyebrow && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-caption font-semibold uppercase tracking-[0.14em] text-primary">
          {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
          {eyebrow}
        </span>
      )}
      <Heading className={cn("text-h2 text-foreground", centred && "max-w-3xl text-balance")}>
        {title}
      </Heading>
      {description && (
        <p
          className={cn(
            "text-body-lg leading-relaxed text-muted-foreground",
            centred ? "max-w-2xl" : "max-w-xl",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
