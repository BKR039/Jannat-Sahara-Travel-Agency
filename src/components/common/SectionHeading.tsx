import { cn } from "@/lib/utils";

/** Section Heading — DS /components/08-marketing.md · eyebrow chip + .text-h2 + lead */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-12 flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-start",
        className,
      )}
    >
      {eyebrow && (
        <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-caption font-semibold text-primary">
          {eyebrow}
        </span>
      )}
      <h2 className="text-h2 text-foreground">{title}</h2>
      {description && (
        <p className="max-w-2xl text-body-lg text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
