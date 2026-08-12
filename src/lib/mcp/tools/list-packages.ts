import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_packages",
  title: "List travel packages",
  description:
    "List travel packages (Umrah, trips, flights, visa) with title, slug, destination, duration, price and status.",
  inputSchema: {
    category: z.enum(["umrah", "trip", "flight", "visa"]).optional().describe("Filter by service category."),
    status: z.enum(["published", "draft"]).optional().describe("Filter by publication status."),
    search: z.string().trim().min(1).optional().describe("Case-insensitive match on the package title."),
    limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of packages to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, status, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("packages")
      .select(
        "id, slug, title, category, destination, city, country, duration, price, discount_price, currency, seats, status, featured, departure_date, return_date",
      )
      .order("sort_order", { ascending: true })
      .limit(limit);
    if (category) query = query.eq("category", category);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("title", `%${search}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { packages: data ?? [] },
    };
  },
});
