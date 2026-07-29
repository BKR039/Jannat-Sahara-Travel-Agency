import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Button — Janat Sahara Design System (/components/01-buttons.md)
 * Sizes: sm 36px · md 44px · lg 52px · icon 44x44
 * Radius: --radius-button (14px) · Focus: --shadow-focus-ring
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md",
    "font-semibold cursor-pointer select-none",
    "transition-[background-color,color,box-shadow,transform] duration-150 ease-standard",
    "active:scale-[0.98]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover hover:shadow-brand-glow",
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover hover:shadow-brand-glow",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm",
        outline:
          "border-[1.5px] border-primary text-primary bg-transparent hover:bg-accent hover:text-primary",
        ghost: "text-foreground hover:bg-accent",
        link: "text-link underline-offset-4 hover:underline",
        destructive: "bg-destructive text-primary-foreground hover:bg-danger-700",
        danger: "bg-destructive text-primary-foreground hover:bg-danger-700",
        dark: "bg-surface-dark-alt text-primary-foreground hover:bg-surface-dark",
      },
      size: {
        sm: "h-9 px-4 text-sm [&_svg]:size-4 rounded-sm",
        default: "h-11 px-5 text-base [&_svg]:size-5",
        md: "h-11 px-5 text-base [&_svg]:size-5",
        lg: "h-13 px-6 text-[1.0625rem] [&_svg]:size-5",
        icon: "h-11 w-11 [&_svg]:size-5",
        "icon-sm": "h-9 w-9 rounded-sm [&_svg]:size-4",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, fullWidth, asChild = false, isLoading, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, fullWidth, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        aria-busy={isLoading || undefined}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            <span className="sr-only">…</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
