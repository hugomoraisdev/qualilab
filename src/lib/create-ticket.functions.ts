import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
  // fallback único por timestamp — garante ausência de colisão
  const yr = new Date().getFullYear();
  return `SAC-${yr}-${Date.now().toString(36).toUpperCase()}`;
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

    return { protocol };
  });
