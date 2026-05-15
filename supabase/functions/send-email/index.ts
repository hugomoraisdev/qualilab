import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { from, to, subject, html } = await req.json();
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!RESEND_API_KEY) return new Response("RESEND_API_KEY not set", { status: 500 });
  if (!LOVABLE_API_KEY) return new Response("LOVABLE_API_KEY not set", { status: 500 });

  // Resend está conectado via connector da Lovable: precisa passar pelo gateway
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: from ?? "Qualilab <noreply@notify.montseguro.com.br>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) console.error("[send-email] resend error", res.status, body);
  return new Response(JSON.stringify(body), {
    status: res.ok ? 200 : res.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
