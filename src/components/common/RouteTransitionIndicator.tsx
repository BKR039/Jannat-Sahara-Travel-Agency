import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * RouteTransitionIndicator — Phase 10 & 21
 *
 * Lightweight, unblocking top progress bar that activates exclusively while
 * TanStack Router is resolving asynchronous route loaders.
 *
 * - Zero artificial delays: activates when router status is "pending", ends the
 *   exact instant navigation resolves.
 * - Non-blocking (`pointer-events-none`).
 * - Jannat Sahara gold/orange gradient palette.
 * - Respects `prefers-reduced-motion`.
 */
export function RouteTransitionIndicator() {
  const isNavigating = useRouterState({
    select: (state) => state.status === "pending" || state.isLoading,
  });

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isNavigating) {
      // Small threshold to avoid flashing on near-instant (<60ms) local cache hits
      timer = setTimeout(() => setVisible(true), 60);
    } else {
      setVisible(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isNavigating]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 right-0 z-[99999] h-[2.5px] overflow-hidden bg-transparent"
    >
      <div className="h-full w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 animate-route-progress motion-reduce:animate-none shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
    </div>
  );
}
