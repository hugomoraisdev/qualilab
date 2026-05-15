// SAC — tickets e timeline (Fase 2B, tabelas dedicadas).
import { supabase } from "@/integrations/supabase/client";
import { createTableStore } from "./table-store";

export type TicketType = "reclamacao" | "sugestao" | "elogio" | "duvida";
export type TicketStatus = "aberto" | "em_andamento" | "aguardando_cliente" | "encerrado";
export type TicketPriority = "baixa" | "media" | "alta" | "critica";

export interface TicketRow {
  id: string;
  protocol: string;
  customer_name: string;
  contact_email: string | null;
  type: TicketType;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  origin: "interno" | "portal";
  linked_occurrence_id: string | null;
  satisfaction_score: number | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TimelineRow {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name: string;
  action: string;
  created_at?: string;
}

export const ticketsStore = createTableStore<TicketRow>("tickets", "created_at", false);
export const timelineStore = createTableStore<TimelineRow>("ticket_timeline", "created_at", true);

export const listTickets = () => ticketsStore.list();
export const getTicket = (id: string) => ticketsStore.list().find((t) => t.id === id);
export const saveTicket = (t: TicketRow) => ticketsStore.upsert(t);

export const listTimeline = (ticketId: string) =>
  timelineStore.list().filter((e) => e.ticket_id === ticketId)
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
export const addTimeline = (e: TimelineRow) => timelineStore.upsert(e);

export async function nextProtocol(): Promise<string> {
  const { data, error } = await (supabase as any).rpc("next_ticket_protocol");
  if (error || !data) {
    const yr = new Date().getFullYear();
    const cnt = listTickets().filter((t) => t.protocol?.includes(String(yr))).length + 1;
    return `SAC-${yr}-${String(cnt).padStart(3, "0")}`;
  }
  return data as string;
}

export function newId(_prefix?: string) {
  return crypto.randomUUID();
}
