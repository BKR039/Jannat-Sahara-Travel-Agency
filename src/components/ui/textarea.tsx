import * as React from "react";

import { cn } from "@/lib/utils";

/** Textarea — DS /components/02-forms.md */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-24 w-full rounded-sm border border-input bg-surface px-3 py-3 text-base text-foreground",
          "leading-relaxed transition-[border-color,box-shadow] duration-150 ease-standard",
          "placeholder:text-muted-foreground hover:border-border-strong",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
          "aria-[invalid=true]:border-destructive",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
