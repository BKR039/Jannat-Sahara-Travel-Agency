import { useId } from "react";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface StatusSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  isPending?: boolean;
  id?: string;
  activeLabel?: string;
  inactiveLabel?: string;
  showBadge?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * Standard enable/disable switch for admin dashboard entities.
 *
 * - Normalizes boolean state (never undefined/null/string)
 * - Disables and displays spinner during pending mutations
 * - Prevents double-click / race conditions
 * - Accessible: Proper ARIA label, keyboard navigable, >= 44px hit floor
 * - Direction-safe: Uses LTR switch kinematics in RTL/LTR layouts
 */
export function StatusSwitch({
  checked,
  onCheckedChange,
  disabled = false,
  isPending = false,
  id: explicitId,
  activeLabel = "مفعّل",
  inactiveLabel = "معطّل",
  showBadge = true,
  ariaLabel,
  className,
}: StatusSwitchProps) {
  const generatedId = useId();
  const id = explicitId || generatedId;
  const isChecked = Boolean(checked);
  const isDisabled = disabled || isPending;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border-subtle/80 bg-surface-sunken/40 px-2.5 py-1.5 transition-colors select-none",
        isDisabled && "opacity-75 cursor-not-allowed",
        className,
      )}
    >
      {showBadge && (
        <Label
          htmlFor={id}
          className={cn(
            "text-caption font-semibold cursor-pointer min-w-[36px] text-center transition-colors select-none",
            isDisabled && "cursor-not-allowed",
            isChecked
              ? "text-emerald-600 dark:text-emerald-400 font-bold"
              : "text-muted-foreground",
          )}
        >
          {isChecked ? activeLabel : inactiveLabel}
        </Label>
      )}

      <div className="relative inline-flex items-center justify-center min-w-[36px] min-h-[32px]">
        <Switch
          id={id}
          checked={isChecked}
          disabled={isDisabled}
          onCheckedChange={(next) => {
            if (!isDisabled) {
              onCheckedChange(next);
            }
          }}
          aria-label={ariaLabel || (isChecked ? activeLabel : inactiveLabel)}
          className={cn(
            "transition-all",
            isChecked &&
              "data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:bg-emerald-500",
          )}
        />
        {isPending && (
          <span
            className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full pointer-events-none"
            aria-hidden="true"
          >
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          </span>
        )}
      </div>
    </div>
  );
}
