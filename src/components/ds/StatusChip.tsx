import { useTranslation } from "react-i18next";
import { statusLabelKey } from "@/lib/admin/request-status";
import { cn } from "@/lib/utils";

/**
 * The only way a state value should reach the screen.
 *
 * Both previous status badges rendered `status.replace(/_/g, " ")` in
 * uppercase — the raw database enum, untranslated, in every language. The
 * programme table did the same for `category`, so Arabic operators read
 * `UMRAH`, `TRIP`, `FLIGHT`. Passing a value through a translation key here,
 * with no code path that prints the raw value, is what makes that leak hard to
 * reintroduce: a caller supplies a `vocab`, not a label.
 *
 * Unknown values still render — an operator seeing an unfamiliar state is far
 * better than a blank cell — but they are marked visually so the gap is
 * obvious rather than silent.
 */

export type ChipVocab = "status" | "category" | "publication";

/** Vocabulary -> i18n key. `status` reuses the shared request lifecycle keys. */
function labelKey(vocab: ChipVocab, value: string): string {
  if (vocab === "status") return statusLabelKey(value);
  if (vocab === "category") return `ops.categories.${value}`;
  return `ops.packagesList.publication.${value}`;
}

/** Tone per state. Semantic colour only — never the brand accent. */
const TONE: Record<string, string> = {
  // lifecycle
  new: "bg-info-muted text-info",
  reviewing: "bg-info-muted text-info",
  contacted: "bg-info-muted text-info",
  offer_preparing: "bg-warning-muted text-warning",
  waiting: "bg-warning-muted text-warning",
  pending: "bg-warning-muted text-warning",
  quoted: "bg-warning-muted text-warning",
  confirmed: "bg-success-muted text-success",
  completed: "bg-success-muted text-success",
  resolved: "bg-success-muted text-success",
  cancelled: "bg-destructive/10 text-destructive",
  // publication
  published: "bg-success-muted text-success",
  draft: "bg-info-muted text-info",
  archived: "bg-muted text-muted-foreground",
  sold_out: "bg-warning-muted text-warning",
};

/** Categories are a taxonomy, not a state, so they stay visually quiet. */
const CATEGORY_TONE = "bg-surface-sunken text-secondary-foreground";

export function StatusChip({
  value,
  vocab = "status",
  className = "",
}: {
  value: string | null | undefined;
  vocab?: ChipVocab;
  className?: string;
}) {
  const { t } = useTranslation("admin");

  if (value === null || value === undefined || value === "") {
    return <span className={cn("text-caption text-muted-foreground", className)}>—</span>;
  }

  const key = labelKey(vocab, value);
  const label = t(key);
  // i18next returns the key itself when it does not resolve.
  const missing = label === key;
  const tone =
    vocab === "category" ? CATEGORY_TONE : (TONE[value] ?? "bg-muted text-muted-foreground");

  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-badge px-2.5 py-0.5",
        "text-caption font-semibold",
        tone,
        missing && "outline-1 outline-dashed outline-warning",
        className,
      )}
      // A missing translation is a bug worth surfacing to whoever inspects it,
      // not something to hide behind a prettified enum.
      title={missing ? `missing translation: ${key}` : undefined}
    >
      {missing ? value : label}
    </span>
  );
}
