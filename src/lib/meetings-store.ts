// Reuniões e pautas — Fase 2B (tabelas dedicadas).
import { createTableStore } from "./table-store";

export type AgendaStatus = "Pendente" | "Abordada" | "Postergada" | "Cancelada";
export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly" | "quarterly";

export interface MeetingRow {
  id: string;
  type: string;
  meeting_date: string;
  meeting_time: string | null;
  participants: string[];
  status: "Agendada" | "Realizada" | "Cancelada";
  recurrence_parent_id: string | null;
  recurrence_frequency: RecurrenceFrequency | null;
  recurrence_until: string | null;
  notes: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AgendaRow {
  id: string;
  meeting_id: string;
  title: string;
  status: AgendaStatus;
  from_meeting_id: string | null;
  notes: string | null;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export const meetingsStore = createTableStore<MeetingRow>("meetings", "meeting_date", true);
export const agendaStore = createTableStore<AgendaRow>("meeting_agenda", "position", true);

export const listMeetings = () =>
  [...meetingsStore.list()].sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
export const getMeeting = (id: string) => meetingsStore.list().find((m) => m.id === id);
export const saveMeeting = (m: MeetingRow) => meetingsStore.upsert(m);
export const deleteMeeting = (id: string) => meetingsStore.remove(id);

export const listAgenda = (meetingId: string) =>
  agendaStore.list().filter((a) => a.meeting_id === meetingId).sort((a, b) => a.position - b.position);
export const saveAgenda = (a: AgendaRow) => agendaStore.upsert(a);
export const deleteAgenda = (id: string) => agendaStore.remove(id);

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

export function addDate(iso: string, freq: RecurrenceFrequency, n: number): string {
  const d = new Date(iso + "T00:00:00");
  if (freq === "weekly") d.setDate(d.getDate() + 7 * n);
  else if (freq === "biweekly") d.setDate(d.getDate() + 14 * n);
  else if (freq === "monthly") d.setMonth(d.getMonth() + n);
  else d.setMonth(d.getMonth() + 3 * n);
  return d.toISOString().slice(0, 10);
}

export interface MeetingSeriesInput {
  type: string;
  meeting_date: string;
  meeting_time: string | null;
  participants: string[];
  agenda: { title: string }[];
  recurrence?: { frequency: RecurrenceFrequency; until: string };
}

export async function createMeetingSeries(base: MeetingSeriesInput): Promise<MeetingRow[]> {
  const created: MeetingRow[] = [];
  const parent: MeetingRow = {
    id: newId("RU"),
    type: base.type,
    meeting_date: base.meeting_date,
    meeting_time: base.meeting_time,
    participants: base.participants,
    status: "Agendada",
    recurrence_parent_id: null,
    recurrence_frequency: base.recurrence?.frequency ?? null,
    recurrence_until: base.recurrence?.until ?? null,
    notes: null,
  };
  await saveMeeting(parent);
  created.push(parent);
  // pautas do pai
  for (let i = 0; i < base.agenda.length; i++) {
    await saveAgenda({
      id: newId("A"),
      meeting_id: parent.id,
      title: base.agenda[i].title,
      status: "Pendente",
      from_meeting_id: null,
      notes: null,
      position: i,
    });
  }
  if (base.recurrence) {
    const limit = base.recurrence.until;
    for (let i = 1; i < 200; i++) {
      const nextDate = addDate(base.meeting_date, base.recurrence.frequency, i);
      if (nextDate > limit) break;
      const child: MeetingRow = {
        ...parent,
        id: newId("RU"),
        meeting_date: nextDate,
        recurrence_parent_id: parent.id,
        recurrence_frequency: null,
        recurrence_until: null,
      };
      await saveMeeting(child);
      for (let j = 0; j < base.agenda.length; j++) {
        await saveAgenda({
          id: newId("A"),
          meeting_id: child.id,
          title: base.agenda[j].title,
          status: "Pendente",
          from_meeting_id: null,
          notes: null,
          position: j,
        });
      }
      created.push(child);
    }
  }
  return created;
}

export function findNextMeeting(after: MeetingRow): MeetingRow | undefined {
  const all = listMeetings();
  return all.find((m) => m.meeting_date > after.meeting_date && m.id !== after.id);
}
