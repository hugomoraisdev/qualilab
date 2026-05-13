// Store de reuniões com recorrência e pautas postergáveis (POC).

export type AgendaStatus = "Pendente" | "Abordada" | "Postergada" | "Cancelada";

export interface AgendaItem {
  id: string;
  title: string;
  status: AgendaStatus;
  fromMeetingId?: string; // origem quando postergada
  notes?: string;
}

export interface Meeting {
  id: string;
  type: string;
  date: string;        // ISO date
  time?: string;
  participants: string[];
  agenda: AgendaItem[];
  status: "Agendada" | "Realizada" | "Cancelada";
  recurrenceParentId?: string;
  recurrence?: {
    frequency: "weekly" | "biweekly" | "monthly" | "quarterly";
    until: string; // ISO date — repetir até
  };
}

export type RecurrenceFrequency = NonNullable<Meeting["recurrence"]>["frequency"];

const KEY = "qualilab_meetings_v2";

function read(): Meeting[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(all: Meeting[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event(`storage:${KEY}`));
}

export function listMeetings(): Meeting[] {
  return read().sort((a, b) => a.date.localeCompare(b.date));
}
export function getMeeting(id: string): Meeting | undefined {
  return read().find((m) => m.id === id);
}
export function saveMeeting(m: Meeting) {
  const all = read().filter((x) => x.id !== m.id);
  all.push(m);
  write(all);
}
export function deleteMeeting(id: string) {
  write(read().filter((m) => m.id !== id));
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

export function addDate(iso: string, freq: RecurrenceFrequency, n: number): string {
  const d = new Date(iso + "T00:00:00");
  if (freq === "weekly") d.setDate(d.getDate() + 7 * n);
  else if (freq === "biweekly") d.setDate(d.getDate() + 14 * n);
  else if (freq === "monthly") d.setMonth(d.getMonth() + n);
  else d.setMonth(d.getMonth() + 3 * n); // quarterly
  return d.toISOString().slice(0, 10);
}

// Cria a reunião base + as ocorrências futuras até a data limite (recurrence.until)
export function createMeetingSeries(base: Omit<Meeting, "id">): Meeting[] {
  const created: Meeting[] = [];
  const parent: Meeting = { ...base, id: newId("RU") };
  saveMeeting(parent);
  created.push(parent);
  if (base.recurrence) {
    const limit = base.recurrence.until;
    for (let i = 1; i < 200; i++) {
      const nextDate = addDate(base.date, base.recurrence.frequency, i);
      if (nextDate > limit) break;
      const child: Meeting = {
        ...base,
        id: newId("RU"),
        date: nextDate,
        recurrenceParentId: parent.id,
        agenda: base.agenda.map((a) => ({ ...a, id: `${a.id}-${i}` })),
      };
      saveMeeting(child);
      created.push(child);
    }
  }
  return created;
}

// Encontra a próxima reunião futura (mesma série ou geral)
export function findNextMeeting(after: Meeting): Meeting | undefined {
  const all = listMeetings();
  return all.find((m) => m.date > after.date && m.id !== after.id);
}
