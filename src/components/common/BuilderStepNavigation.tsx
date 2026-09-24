import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BuilderStepNavigationProps {
  /** Callback when user clicks the previous/back button */
  onBack?: () => void;
  /** Callback when user clicks next or submit */
  onNext: () => void;
  /** Whether the back button is disabled (e.g., on first step or while submitting) */
  backDisabled?: boolean;
  /** Whether the next/submit button is disabled */
  nextDisabled?: boolean;
  /** Whether the form is currently in flight / submitting */
  isSubmitting?: boolean;
  /** Whether this is the final confirmation/submission step */
  isFinalStep?: boolean;
  /** Custom label for previous button */
  backLabel?: string;
  /** Custom label for next button */
  nextLabel?: string;
  /** Custom label when submitting */
  submittingLabel?: string;
  /**
   * Compact summary chip of the item currently selected in this step
   * (e.g. "فندق مكة: سويس أوتيل المقام · 7 ليالٍ")
   */
  selectedSummary?: ReactNode;
  /** Optional secondary status badge or note */
  statusBadge?: ReactNode;
  /** Whether to use sticky bottom positioning (defaults to true) */
  sticky?: boolean;
  /** Additional container styling */
  className?: string;
}

/**
 * Reusable persistent step navigation bar for multi-step workflows.
 *
 * Keeps the primary "Next" / "Submit" action immediately reachable even when
 * the active step contains deep vertical content (such as 100 hotel options
 * or multiple passenger forms), without forcing users to scroll to the end.
 *
 * Fully responsive, RTL/LTR compatible, and accessible.
 */
export function BuilderStepNavigation({
  onBack,
  onNext,
  backDisabled = false,
  nextDisabled = false,
  isSubmitting = false,
  isFinalStep = false,
  backLabel,
  nextLabel,
  submittingLabel,
  selectedSummary,
  statusBadge,
  sticky = true,
  className,
}: BuilderStepNavigationProps) {
  const { t } = useTranslation();

  const resolvedBackLabel = backLabel ?? t("umrahBuilder.nav.back", "السابق");
  const resolvedNextLabel =
    nextLabel ??
    (isFinalStep
      ? isSubmitting
        ? (submittingLabel ?? t("umrahBuilder.nav.submitting", "جاري الإرسال…"))
        : t("umrahBuilder.nav.submit", "تأكيد وإرسال الطلب")
      : t("umrahBuilder.nav.next", "التالي"));

  return (
    <nav
      aria-label={t("common.stepNavigation", "التنقل بين الخطوات")}
      className={cn(
        "z-30 w-full transition-all duration-200",
        sticky &&
          "sticky bottom-0 border-t border-border-subtle bg-card/95 backdrop-blur-md shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.08)] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 px-3 sm:px-6 sm:py-3.5",
        !sticky && "pt-4",
        className,
      )}
    >
      <div className="mx-auto flex max-w-full flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {/* Selected Item Summary Chip / Status on start side */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {selectedSummary ? (
            <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.07] px-3 py-1 text-caption font-semibold text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate text-start">{selectedSummary}</span>
            </div>
          ) : statusBadge ? (
            <div className="min-w-0">{statusBadge}</div>
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>

        {/* Action Controls on end side */}
        <div className="flex items-center justify-between gap-2.5 sm:justify-end">
          {onBack && (
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={onBack}
              disabled={backDisabled || isSubmitting}
              className="shrink-0"
            >
              <ArrowLeft className="me-1.5 h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
              <span>{resolvedBackLabel}</span>
            </Button>
          )}

          <Button
            type="button"
            size="default"
            onClick={onNext}
            disabled={nextDisabled || isSubmitting}
            className={cn(
              "min-w-[7.5rem]",
              !onBack && "w-full sm:w-auto",
              onBack && "flex-1 sm:flex-initial",
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin text-current" aria-hidden="true" />
                <span>{submittingLabel ?? t("common.loading", "جاري التحميل…")}</span>
              </>
            ) : (
              <>
                <span>{resolvedNextLabel}</span>
                {!isFinalStep && (
                  <ArrowRight className="ms-1.5 h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </nav>
  );
}
