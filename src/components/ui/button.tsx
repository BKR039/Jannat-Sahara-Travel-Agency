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
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button",
    "font-semibold cursor-pointer select-none",
    "transition-[background-color,color,box-shadow,transform] duration-fast ease-standard",
    "active:scale-[0.98]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        /* The sunrise gradient is the brand signature (audit §07). It was
           defined as a token and never rendered anywhere; putting it on the
           primary action — and only there — is what makes it a signature
           rather than decoration. */
        default:
          "bg-gradient-sunrise text-primary-foreground hover:shadow-brand-glow hover:brightness-[1.04]",
        primary:
          "bg-gradient-sunrise text-primary-foreground hover:shadow-brand-glow hover:brightness-[1.04]",
        /* Flat brand fill, for surfaces where the gradient would compete. */
        solid: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm",
        outline:
          "border-[1.5px] border-primary text-primary bg-transparent hover:bg-accent hover:text-primary",
        ghost: "text-foreground hover:bg-accent",
        link: "text-link underline-offset-4 hover:underline",
        destructive: "bg-destructive text-primary-foreground hover:bg-destructive/90",
        danger: "bg-destructive text-primary-foreground hover:bg-destructive/90",
        dark: "bg-surface-dark-alt text-primary-foreground hover:bg-surface-dark",
        /* Frosted translucent glass for hero or dark photographic backdrops. */
        glass:
          "border border-white/20 bg-white/10 text-white hover:bg-white/15 hover:border-white/35 hover:text-white backdrop-blur-md shadow-xs",
      },
      /*
       * The compact sizes grow to the 44px touch floor below `md`.
       *
       * `sm` is a pointer-density size — it is what list rows, panel headers
       * and card action bars use — and on a phone those are exactly the
       * controls a thumb has to hit. Measured at 390px the admin programme
       * list alone put 33 controls under 44px, all of them `size="sm"`.
       * Raising the floor in the primitive fixes every screen at once rather
       * than leaving each one to remember.
       */
      /*
       * Radius is a function of height, and the size owns it.
       *
       * Compact controls take `rounded-input` (10px) and the standing sizes
       * take the base `rounded-button` (14px). Stated here because it was
       * previously only half-true — `sm` set a radius and nothing else did —
       * which left call sites free to reach for `rounded-xl`. On a 40px
       * button that token is 28px and reads as a pill, which is how the Sales
       * Center header came to look like a different product from the
       * Control Center's.
       *
       * `xs` exists because it was already being used without existing: 27
       * call sites had written `h-8` by hand and 13 more `h-7`, because the
       * scale started at 36px and dense admin rows needed less. A size that
       * is missing gets invented locally, one page at a time.
       */
      size: {
        xs: "h-8 max-md:h-11 px-3 gap-1.5 text-caption [&_svg]:size-3.5 rounded-input",
        sm: "h-9 max-md:h-11 px-4 text-small [&_svg]:size-4 rounded-input",
        default: "h-11 px-5 text-button [&_svg]:size-5",
        md: "h-11 px-5 text-button [&_svg]:size-5",
        lg: "h-13 px-6 text-[1.0625rem] [&_svg]:size-5",
        icon: "h-11 w-11 [&_svg]:size-5",
        "icon-sm": "h-9 w-9 max-md:h-11 max-md:w-11 rounded-input [&_svg]:size-4",
        "icon-xs": "h-8 w-8 max-md:h-11 max-md:w-11 rounded-input [&_svg]:size-3.5",
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
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      isLoading,
      children,
      disabled,
      ...props
    },
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
