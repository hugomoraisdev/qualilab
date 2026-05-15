import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

export const Route = createFileRoute("/api/public/v1/occurrences/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request, params }) => {
        const unauth = checkAuth(request);
        if (unauth) return unauth;

        const { data, error } = await supabaseAdmin
          .from("occurrences")
          .select("*")
          .eq("id", params.id)
          .is("deleted_at", null)
          .maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "Not found" }, 404);
        return json({ data });
      },
    },
  },
});
