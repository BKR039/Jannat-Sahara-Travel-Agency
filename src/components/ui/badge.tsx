import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/** Badge / Chip — DS /components/07-data-display.md · --radius-badge (pill) */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-caption font-semibold transition-colors duration-fast [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
        success: "border-transparent bg-success-muted text-success",
        warning: "border-transparent bg-warning-muted text-warning",
        info: "border-transparent bg-info-muted text-info",
        destructive: "border-transparent bg-danger-muted text-destructive",
        outline: "border-border-strong text-foreground",
        gold: "border-transparent bg-secondary-muted text-brand-gold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
