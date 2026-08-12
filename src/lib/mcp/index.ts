import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPackages from "./tools/list-packages";
import listBookings from "./tools/list-bookings";
import updateBookingStatus from "./tools/update-booking-status";
import listFlightRequests from "./tools/list-flight-requests";
import listContactMessages from "./tools/list-contact-messages";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "sahara-travel-foundation",
  title: "Sahara Travel Foundation",
  version: "0.1.0",
  instructions:
    "Tools for the Janat Sahara Travel agency platform. Use `list_packages` to browse Umrah, trip, flight and visa packages. Admin and staff accounts can also review bookings, flight quote requests and contact messages, and update booking status. All access runs as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPackages, listBookings, updateBookingStatus, listFlightRequests, listContactMessages],
});
