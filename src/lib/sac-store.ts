// Store de tickets de SAC (atendimento ao cliente) em localStorage.

export type TicketType = "reclamacao" | "sugestao" | "elogio" | "duvida";
export type TicketStatus = "aberto" | "em_andamento" | "aguardando_cliente" | "encerrado";
export type TicketPriority = "baixa" | "media" | "alta" | "critica";

export interface TicketTimelineEntry {
  date: string;
  action: string;
  author: string;
}

export interface CustomerTicket {
  id: string;
  protocol: string;
  customerName: string;
  contactEmail: string;
  type: TicketType;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  origin: "interno" | "portal";
  linkedOccurrenceId?: string;
  satisfactionScore?: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  updatedAt: string;
  assignedTo: string;
  timeline: TicketTimelineEntry[];
}

const KEY = "qualilab_sac_tickets";

const SEED: CustomerTicket[] = [
  {
    id: "SAC-001", protocol: "SAC-2026-001",
    customerName: "Indústria Alfa Ltda", contactEmail: "qualidade@alfa.com.br",
    type: "reclamacao", description: "Atraso na entrega do laudo de análise #4521.",
    status: "em_andamento", priority: "alta", origin: "interno",
    linkedOccurrenceId: "OC-002",
    createdAt: "2026-04-12 09:30", updatedAt: "2026-04-15 16:10",
    assignedTo: "Carla Administradora",
    timeline: [
      { date: "2026-04-12 09:30", author: "Sistema", action: "Ticket aberto" },
      { date: "2026-04-12 14:00", author: "Carla Administradora", action: "Investigação iniciada" },
      { date: "2026-04-15 16:10", author: "Carla Administradora", action: "NC OC-002 vinculada" },
    ],
  },
  {
    id: "SAC-002", protocol: "SAC-2026-002",
    customerName: "Beta Engenharia", contactEmail: "compras@beta.com.br",
    type: "elogio", description: "Excelente atendimento da equipe técnica.",
    status: "encerrado", priority: "baixa", origin: "interno",
    satisfactionScore: 5,
    createdAt: "2026-04-20 11:00", updatedAt: "2026-04-22 10:00",
    assignedTo: "Roberto Gestor",
    timeline: [
      { date: "2026-04-20 11:00", author: "Sistema", action: "Ticket aberto" },
      { date: "2026-04-22 10:00", author: "Roberto Gestor", action: "Encerrado com avaliação 5★" },
    ],
  },
  {
    id: "SAC-003", protocol: "SAC-2026-003",
    customerName: "Gamma Indústria", contactEmail: "lab@gamma.com.br",
    type: "duvida", description: "Dúvida sobre incerteza expressa em laudo.",
    status: "aguardando_cliente", priority: "media", origin: "portal",
    createdAt: "2026-05-02 08:15", updatedAt: "2026-05-04 09:00",
    assignedTo: "Paulo Auditor",
    timeline: [
      { date: "2026-05-02 08:15", author: "Portal Público", action: "Ticket aberto via /sac" },
      { date: "2026-05-04 09:00", author: "Paulo Auditor", action: "Resposta enviada — aguardando cliente" },
    ],
  },
];

function read(): CustomerTicket[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw);
  } catch {
    return SEED;
  }
}

function write(value: CustomerTicket[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(value));
}

export function listTickets(): CustomerTicket[] {
  return read();
}

export function getTicket(id: string): CustomerTicket | undefined {
  return read().find((t) => t.id === id);
}

export function saveTicket(t: CustomerTicket) {
  const all = read().filter((x) => x.id !== t.id);
  all.unshift(t);
  write(all);
}

export function nextProtocol(): string {
  const year = new Date().getFullYear();
  const count = read().filter((t) => t.protocol.includes(String(year))).length + 1;
  return `SAC-${year}-${String(count).padStart(3, "0")}`;
}
