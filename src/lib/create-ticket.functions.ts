import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TicketSchema = z.object({
  id: z.string().uuid(),
  protocol: z.string(),
  customer_name: z.string().min(1).max(120),
  contact_email: z.string().email().max(150).nullable(),
  type: z.enum(["reclamacao", "sugestao", "elogio", "duvida"]),
  description: z.string().min(1).max(1500),
  status: z.string(),
  priority: z.string(),
  origin: z.enum(["interno", "portal"]),
  linked_occurrence_id: z.string().nullable(),
  satisfaction_score: z.number().nullable(),
  assigned_to: z.string().nullable(),
  assigned_to_name: z.string().nullable(),
});

const TimelineSchema = z.object({
  id: z.string().uuid(),
  ticket_id: z.string().uuid(),
  author_id: z.string().nullable(),
  author_name: z.string(),
  action: z.string(),
});

const InputSchema = z.object({
  ticket: TicketSchema,
  timeline: TimelineSchema,
});

export const createPublicTicket = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { error: tErr } = await (supabaseAdmin as any)
      .from("tickets")
      .insert(data.ticket);
    if (tErr) throw new Error(tErr.message);

    const { error: evErr } = await (supabaseAdmin as any)
      .from("ticket_timeline")
      .insert(data.timeline);
    if (evErr) throw new Error(evErr.message);

    return { protocol: data.ticket.protocol };
  });
