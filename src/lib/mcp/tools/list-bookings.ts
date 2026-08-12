import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_bookings",
  title: "List bookings",
  description:
    "List customer bookings with contact details, package, traveller counts, total price and status. Requires an admin or staff account.",
  inputSchema: {
    status: z.enum(["new", "pending", "confirmed", "cancelled"]).optional().describe("Filter by booking status."),
    search: z.string().trim().min(1).optional().describe("Case-insensitive match on the customer name."),
    limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of bookings to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("bookings")
      .select(
        "id, package_title, package_category, name, phone, email, adults, children, infants, total_price, currency, status, notes, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { bookings: data ?? [] },
    };
  },
});
