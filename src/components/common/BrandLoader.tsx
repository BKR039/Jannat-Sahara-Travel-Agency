import { cn } from "@/lib/utils";

interface BrandLoaderProps {
  /** If true, renders fixed full-screen overlay (e.g. for initial shell) */
  fullScreen?: boolean;
  /** Optional accessible message or sub-label */
  message?: string;
  className?: string;
}

/**
 * BrandLoader — Phase 11 & 21
 *
 * Premium branded loading presentation for Jannat Sahara.
 * Displays only while real async loading takes place — never uses artificial delays.
 * Respects prefers-reduced-motion.
 */
export function BrandLoader({ fullScreen = false, message, className }: BrandLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-center select-none",
        fullScreen
          ? "fixed inset-0 z-[99998] bg-canvas/90 backdrop-blur-sm transition-opacity duration-300"
          : "w-full py-16 px-4 min-h-[220px]",
        className,
      )}
    >
      {/* Brand Icon — Golden Desert Sun & Crescent Monogram */}
      <div className="relative flex items-center justify-center">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-transparent p-2.5 border border-amber-500/20 shadow-xs">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full text-primary"
            aria-hidden="true"
          >
            {/* Elegant crescent and desert dunes geometry */}
            <path
              d="M24 4C12.954 4 4 12.954 4 24C4 35.046 12.954 44 24 44C27.314 44 30.436 43.195 33.18 41.776C25.184 39.522 19.333 32.19 19.333 23.5C19.333 14.81 25.184 7.478 33.18 5.224C30.436 3.805 27.314 4 24 4Z"
              fill="currentColor"
              className="text-amber-600 dark:text-amber-400 opacity-90"
            />
            <circle
              cx="34"
              cy="16"
              r="4"
              fill="currentColor"
              className="text-orange-500 dark:text-orange-400"
            />
          </svg>
        </div>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col items-center">
        <span className="font-arabic-display text-base md:text-lg font-bold text-foreground tracking-wide">
          جنة الصحراء للأسفار
        </span>
        <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.2em] uppercase mt-0.5">
          JANNAT SAHARA TRAVEL
        </span>
      </div>

      {/* Elegant Linear Progress Beam */}
      <div
        aria-hidden="true"
        className="relative h-[2.5px] w-28 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div className="h-full w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 animate-route-progress motion-reduce:animate-none" />
      </div>

      {message && (
        <p className="text-xs text-muted-foreground animate-pulse motion-reduce:animate-none">
          {message}
        </p>
      )}

      <span className="sr-only">جاري التحميل... / Loading...</span>
    </div>
  );
}
