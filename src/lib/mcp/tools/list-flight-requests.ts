import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_flight_requests",
  title: "List flight requests",
  description:
    "List customer flight quote requests with route, dates, passengers, cabin class and status. Requires an admin or staff account.",
  inputSchema: {
    status: z.string().trim().min(1).optional().describe("Filter by request status (e.g. new, in_progress, completed)."),
    reference: z.string().trim().min(1).optional().describe("Look up a single request by its reference number."),
    limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of requests to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, reference, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("flight_requests")
      .select(
        "id, reference, status, name, phone, email, from_airport, to_airport, trip_type, departure_date, return_date, adults, children, infants, cabin_class, notes, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) query = query.eq("status", status);
    if (reference) query = query.eq("reference", reference);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { flight_requests: data ?? [] },
    };
  },
});
