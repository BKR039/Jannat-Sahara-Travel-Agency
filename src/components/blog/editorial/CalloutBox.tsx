import React from "react";
import { AlertCircle, AlertTriangle, Info, Sparkles, BookOpen } from "lucide-react";

export type CalloutVariant = "caution" | "important" | "info" | "verse" | "quote";

interface CalloutBoxProps {
  title?: string;
  variant?: CalloutVariant;
  children: React.ReactNode;
  className?: string;
}

export function CalloutBox({ title, variant = "info", children, className = "" }: CalloutBoxProps) {
  const getStyles = () => {
    switch (variant) {
      case "caution":
        return {
          container:
            "border-amber-500/30 bg-amber-500/[0.04] text-foreground dark:border-amber-500/20 dark:bg-amber-500/[0.06]",
          iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
          icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
          defaultTitle: "أخطاء شائعة يجب تجنبها",
        };
      case "important":
        return {
          container:
            "border-primary/30 bg-primary/[0.04] text-foreground dark:border-primary/20 dark:bg-primary/[0.06]",
          iconBg: "bg-primary/15 text-primary",
          icon: <AlertCircle className="h-4 w-4" aria-hidden />,
          defaultTitle: "ملاحظة مهمة",
        };
      case "verse":
      case "quote":
        return {
          container:
            "border-primary/40 bg-surface-raised/80 text-foreground shadow-xs dark:bg-surface-raised/40",
          iconBg: "bg-primary/15 text-primary",
          icon: <BookOpen className="h-4 w-4" aria-hidden />,
          defaultTitle: "",
        };
      case "info":
      default:
        return {
          container: "border-border-subtle bg-muted/40 text-foreground dark:bg-muted/20",
          iconBg: "bg-muted text-muted-foreground",
          icon: <Info className="h-4 w-4" aria-hidden />,
          defaultTitle: "معلومة",
        };
    }
  };

  const config = getStyles();
  const displayTitle = title || config.defaultTitle;

  return (
    <aside
      role="note"
      className={`my-6 rounded-card border p-5 md:p-6 transition-all ${config.container} ${className}`}
    >
      {displayTitle && (
        <div className="mb-3 flex items-center gap-2.5">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${config.iconBg}`}
          >
            {config.icon}
          </span>
          <h4 className="text-body font-bold tracking-normal">{displayTitle}</h4>
        </div>
      )}
      <div className="text-[1.05rem] md:text-[1.125rem] leading-[1.85] md:leading-[1.95] text-foreground/90 space-y-2">
        {children}
      </div>
    </aside>
  );
}
