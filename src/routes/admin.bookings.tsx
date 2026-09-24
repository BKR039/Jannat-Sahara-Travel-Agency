import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The standalone /admin/bookings screen is retired in favor of the unified
 * Request Management inbox at /admin/requests (which contains full booking
 * lifecycle management, filters, and passport attachments).
 * Any direct visit to /admin/bookings is safely redirected to /admin/requests.
 */
export const Route = createFileRoute("/admin/bookings")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/requests" });
  },
});
