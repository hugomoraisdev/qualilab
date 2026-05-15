import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
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
  if (!provided || provided !== expected) return json({ error: "Unauthorized" }, 401);
  return null;
}

const ResultSchema = z.object({
  period: z.string().min(1).max(20), // ex: "2026-05" ou "2026-Q2"
  value: z.number(),
  status: z.string().max(40).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const Route = createFileRoute("/api/public/v1/indicators/$id/results")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request, params }) => {
        const unauth = checkAuth(request);
        if (unauth) return unauth;
        const { data, error } = await supabaseAdmin
          .from("indicator_results")
          .select("*")
          .eq("indicator_id", params.id)
          .order("period", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      },

      POST: async ({ request, params }) => {
        const unauth = checkAuth(request);
        if (unauth) return unauth;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = ResultSchema.safeParse(body);
        if (!parsed.success) {
          return json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
        }

        const { data, error } = await supabaseAdmin
          .from("indicator_results")
          .insert({ ...parsed.data, indicator_id: params.id })
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ data }, 201);
      },
    },
  },
});
