import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

function checkAuth(request: Request): Response | null {
  const expected = process.env.EXTERNAL_API_KEY;
  if (!expected) return json({ error: "API not configured" }, 500);
  const provided = request.headers.get("x-api-key");
  if (!provided || provided !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }
  return null;
}

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.string().min(1).max(50).optional(),
  type: z.string().min(1).max(50).optional(),
});

const CreateSchema = z.object({
  type: z.string().min(1).max(80),
  origin: z.string().min(1).max(80),
  description: z.string().min(1).max(2000),
  occurred_at: z.string().datetime().optional(),
  severity: z.enum(["baixa", "media", "alta", "critica"]).default("media"),
  status: z.string().min(1).max(40).default("aberta"),
  responsible_id: z.string().uuid().nullable().optional(),
  immediate_action: z.string().max(2000).nullable().optional(),
});

export const Route = createFileRoute("/api/public/v1/occurrences")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request }) => {
        const unauth = checkAuth(request);
        if (unauth) return unauth;

        const url = new URL(request.url);
        const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          return json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
        }
        const { limit, offset, status, type } = parsed.data;

        let q = supabaseAdmin
          .from("occurrences")
          .select("*", { count: "exact" })
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (status) q = q.eq("status", status);
        if (type) q = q.eq("type", type);

        const { data, error, count } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ data, count, limit, offset });
      },

      POST: async ({ request }) => {
        const unauth = checkAuth(request);
        if (unauth) return unauth;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = CreateSchema.safeParse(body);
        if (!parsed.success) {
          return json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
        }

        const payload = {
          ...parsed.data,
          occurred_at: parsed.data.occurred_at ?? new Date().toISOString(),
        };

        const { data, error } = await supabaseAdmin
          .from("occurrences")
          .insert(payload)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ data }, 201);
      },
    },
  },
});
