// Metadados estendidos da reunião — participantes internos/externos/extras,
// presença, materiais prévios, decisões/deliberações, setor, configuração de
// envio automático da ata, lembretes e histórico. Persistido em `app_data`.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ParticipantOrigin = "interno" | "externo" | "extra_antes" | "extra_durante";

export interface MeetingParticipant {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
  organization?: string | null;
  origin: ParticipantOrigin;
  confirmed: boolean;
  attended: boolean;
}

export interface MeetingMaterial {
  id: string;
  name: string;
  url?: string | null;
  description?: string | null;
  uploaded_at: string;
}

export interface MeetingDecision {
  id: string;
  topic: string;
  decision: string;
  responsible?: string | null;
  at: string;
}

export interface MeetingActionLink {
  id: string;        // id local
  action_id: string; // id do action_plans
  title: string;
}

export interface MeetingHistoryEvent {
  id: string;
  at: string;
  actor: string | null;
  action: string;
  detail?: string | null;
}

export interface MeetingMeta {
  sector: string | null;
  participants: MeetingParticipant[];
  materials: MeetingMaterial[];
  decisions: MeetingDecision[];
  action_links: MeetingActionLink[];
  auto_send_minutes: boolean;
  reminder_sent_at: string | null;
  minutes_sent_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  history: MeetingHistoryEvent[];
}

export const emptyMeetingMeta = (): MeetingMeta => ({
  sector: null,
  participants: [],
  materials: [],
  decisions: [],
  action_links: [],
  auto_send_minutes: false,
  reminder_sent_at: null,
  minutes_sent_at: null,
  started_at: null,
  ended_at: null,
  history: [],
});

const k = (id: string) => `meeting-meta:${id}`;

export async function readMeetingMeta(id: string): Promise<MeetingMeta> {
  const { data } = await supabase.from("app_data").select("value").eq("key", k(id)).maybeSingle();
  if (!data) return emptyMeetingMeta();
  return { ...emptyMeetingMeta(), ...(data.value as Partial<MeetingMeta>) };
}

export async function writeMeetingMeta(id: string, meta: MeetingMeta): Promise<void> {
  const { error } = await supabase.from("app_data").upsert({ key: k(id), value: meta as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(`storage:meeting-meta:${id}`));
}

export async function updateMeetingMeta(
  id: string,
  updater: (prev: MeetingMeta) => MeetingMeta,
  history?: { action: string; detail?: string; actor?: string | null },
) {
  const prev = await readMeetingMeta(id);
  let next = updater(prev);
  if (history) {
    const ev: MeetingHistoryEvent = {
      id: `h-${Date.now().toString(36)}`,
      at: new Date().toISOString(),
      actor: history.actor ?? null,
      action: history.action,
      detail: history.detail ?? null,
    };
    next = { ...next, history: [ev, ...next.history].slice(0, 200) };
  }
  await writeMeetingMeta(id, next);
  return next;
}

export function useMeetingMeta(id: string | undefined) {
  const [meta, setMeta] = useState<MeetingMeta>(emptyMeetingMeta());
  const [loading, setLoading] = useState(!!id);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setMeta(await readMeetingMeta(id));
    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    void load();
    const handler = () => { void load(); };
    window.addEventListener(`storage:meeting-meta:${id}`, handler);
    const channel = supabase
      .channel(`meeting-meta:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data", filter: `key=eq.${k(id)}` }, () => { void load(); })
      .subscribe();
    return () => {
      window.removeEventListener(`storage:meeting-meta:${id}`, handler);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { meta, loading, refresh: load };
}

export function useAllMeetingMeta(ids: string[]): Record<string, MeetingMeta> {
  const [map, setMap] = useState<Record<string, MeetingMeta>>({});
  const joinKey = ids.join("|");
  useEffect(() => {
    if (!ids.length) { setMap({}); return; }
    let cancelled = false;
    const keys = ids.map(k);
    const load = async () => {
      const { data } = await supabase.from("app_data").select("key,value").in("key", keys);
      if (cancelled) return;
      const out: Record<string, MeetingMeta> = {};
      for (const id of ids) {
        const row = data?.find((r) => r.key === k(id));
        out[id] = row ? { ...emptyMeetingMeta(), ...(row.value as Partial<MeetingMeta>) } : emptyMeetingMeta();
      }
      setMap(out);
    };
    void load();
    const channel = supabase
      .channel("meeting-meta-bulk")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data" }, () => { void load(); })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinKey]);
  return map;
}

export const originLabel: Record<ParticipantOrigin, string> = {
  interno: "Interno",
  externo: "Externo",
  extra_antes: "Extra (antes)",
  extra_durante: "Extra (durante)",
};

/** Status derivado considerando data/horário e meta. */
export type DerivedStatus = "Agendada" | "Em andamento" | "Atrasada" | "Realizada" | "Cancelada";
export function deriveMeetingStatus(
  m: { meeting_date: string; meeting_time: string | null; status: string },
  meta?: MeetingMeta,
): DerivedStatus {
  if (m.status === "Realizada") return "Realizada";
  if (m.status === "Cancelada") return "Cancelada";
  const now = new Date();
  const start = new Date(`${m.meeting_date}T${m.meeting_time ?? "00:00"}:00`);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // janela 2h
  if (meta?.started_at && !meta.ended_at) return "Em andamento";
  if (now >= start && now <= end) return "Em andamento";
  if (now > end) return "Atrasada";
  return "Agendada";
}

export function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
