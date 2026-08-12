import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_booking_status",
  title: "Update booking status",
  description: "Change the status of a booking. Requires an admin or staff account.",
  inputSchema: {
    booking_id: z.string().uuid().describe("The booking id."),
    status: z.enum(["new", "pending", "confirmed", "cancelled"]).describe("The new booking status."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ booking_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", booking_id)
      .select("id, name, package_title, status")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: "No booking was updated — it may not exist or you may lack permission." }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { booking: data } };
  },
});
