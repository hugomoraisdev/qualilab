import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TYPE_LABELS: Record<string, string> = {
  reclamacao: "Reclamação",
  sugestao: "Sugestão",
  elogio: "Elogio",
  duvida: "Dúvida",
};

const InputSchema = z.object({
  id: z.string().uuid(),
  customer_name: z.string().min(1).max(120),
  contact_email: z.string().email().max(150).nullable(),
  type: z.enum(["reclamacao", "sugestao", "elogio", "duvida"]),
  description: z.string().min(1).max(1500),
  timeline_id: z.string().uuid(),
});

async function resolveProtocol(): Promise<string> {
  const { data } = await (supabaseAdmin as any).rpc("next_ticket_protocol");
  if (data) return data as string;
  const yr = new Date().getFullYear();
  return `SAC-${yr}-${Date.now().toString(36).toUpperCase()}`;
}

function buildConfirmationHtml(params: {
  name: string;
  protocol: string;
  type: string;
  description: string;
}): string {
  return `<!DOCTYPE html><html lang="pt-BR"><body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:32px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e4e4e7">
  <h2 style="margin:0 0 8px;font-size:18px;color:#18181b">Manifestação recebida</h2>
  <p style="margin:0 0 24px;color:#71717a;font-size:14px">Recebemos sua mensagem e retornaremos em breve.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
    <tr><td style="padding:8px 0;color:#71717a;width:110px">Protocolo</td><td style="padding:8px 0;font-weight:600;font-family:monospace">${params.protocol}</td></tr>
    <tr><td style="padding:8px 0;color:#71717a">Tipo</td><td style="padding:8px 0">${params.type}</td></tr>
    <tr><td style="padding:8px 0;color:#71717a">Descrição</td><td style="padding:8px 0;white-space:pre-wrap">${params.description.slice(0, 300)}${params.description.length > 300 ? "…" : ""}</td></tr>
  </table>
  <p style="margin:0;font-size:12px;color:#a1a1aa">Guarde o número do protocolo para acompanhar sua manifestação.</p>
</div></body></html>`;
}

export const createPublicTicket = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const protocol = await resolveProtocol();

    const { error: tErr } = await (supabaseAdmin as any)
      .from("tickets")
      .insert({
        id: data.id,
        protocol,
        customer_name: data.customer_name,
        contact_email: data.contact_email,
        type: data.type,
        description: data.description,
        status: "aberto",
        priority: "media",
        origin: "portal",
        linked_occurrence_id: null,
        satisfaction_score: null,
        assigned_to: null,
        assigned_to_name: null,
      });
    if (tErr) throw new Error(tErr.message);

    const { error: evErr } = await (supabaseAdmin as any)
      .from("ticket_timeline")
      .insert({
        id: data.timeline_id,
        ticket_id: data.id,
        author_id: null,
        author_name: "Portal Público",
        action: "Ticket aberto via /sac",
      });
    if (evErr) throw new Error(evErr.message);

    if (data.contact_email) {
      await (supabaseAdmin as any).functions.invoke("send-email", {
        body: {
          from: "Qualilab <noreply@montseguro.com.br>",
          to: [data.contact_email],
          subject: `Qualilab — Manifestação recebida (${protocol})`,
          html: buildConfirmationHtml({
            name: data.customer_name,
            protocol,
            type: TYPE_LABELS[data.type] ?? data.type,
            description: data.description,
          }),
        },
      });
    }

    return { protocol };
  });
