import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { from, to, subject, html } = await req.json();
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return new Response("RESEND_API_KEY not set", { status: 500 });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: from ?? "Qualilab <onboarding@resend.dev>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  const body = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(body), {
    status: res.ok ? 200 : res.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
