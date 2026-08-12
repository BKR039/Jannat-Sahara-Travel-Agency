import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_contact_messages",
  title: "List contact messages",
  description:
    "List messages sent through the website contact form, including whether they have been handled. Requires an admin or staff account.",
  inputSchema: {
    handled: z.boolean().optional().describe("Filter by handled state."),
    limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of messages to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ handled, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("contact_messages")
      .select("id, name, email, phone, subject, message, handled, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (handled !== undefined) query = query.eq("handled", handled);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { messages: data ?? [] },
    };
  },
});
