// Mapa de Processos — entidade rica armazenada em `app_data` (sem migração).
// Cada processo possui dono, entradas/saídas, etapas (workflow), vínculos
// para documentos / riscos / ocorrências / indicadores / planos de ação,
// e histórico completo de alterações.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProcessStep {
  id: string;
  order: number;
  title: string;
  responsible_id: string | null;
  description: string | null;
}

export interface ProcessHistoryEvent {
  id: string;
  at: string;
  actor: string | null;
  action: string;
  detail?: string | null;
}

export interface ProcessRow {
  id: string;
  code: string;
  name: string;
  area: string | null;
  objective: string | null;
  owner_id: string | null;          // responsável principal
  inputs: string[];                  // entradas
  outputs: string[];                 // saídas
  steps: ProcessStep[];              // fluxo de trabalho
  linked_document_ids: string[];
  linked_risk_ids: string[];
  linked_occurrence_ids: string[];
  linked_indicator_ids: string[];
  linked_action_ids: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  history: ProcessHistoryEvent[];
}

export const emptyProcess = (id?: string): ProcessRow => ({
  id: id ?? `PRC-${Date.now().toString(36).toUpperCase()}`,
  code: "",
  name: "",
  area: null,
  objective: null,
  owner_id: null,
  inputs: [],
  outputs: [],
  steps: [],
  linked_document_ids: [],
  linked_risk_ids: [],
  linked_occurrence_ids: [],
  linked_indicator_ids: [],
  linked_action_ids: [],
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  history: [],
});

const KEY = "processes:all";

export async function readProcesses(): Promise<ProcessRow[]> {
  const { data } = await supabase.from("app_data").select("value").eq("key", KEY).maybeSingle();
  return ((data?.value as unknown as ProcessRow[]) ?? []);
}

export async function writeProcesses(list: ProcessRow[]) {
  const { error } = await supabase.from("app_data").upsert({ key: KEY, value: list as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("storage:processes"));
}

function pushHistory(p: ProcessRow, ev: { action: string; detail?: string; actor?: string | null }) {
  const entry: ProcessHistoryEvent = {
    id: `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    actor: ev.actor ?? null,
    action: ev.action,
    detail: ev.detail ?? null,
  };
  return { ...p, history: [entry, ...(p.history ?? [])].slice(0, 200) };
}

export async function upsertProcess(
  p: ProcessRow,
  ev?: { action: string; detail?: string; actor?: string | null },
) {
  const list = await readProcesses();
  const idx = list.findIndex((x) => x.id === p.id);
  let next = { ...p, updated_at: new Date().toISOString() };
  if (ev) next = pushHistory(next, ev);
  if (idx >= 0) list[idx] = next; else list.push(next);
  await writeProcesses(list);
  return next;
}

export async function softDeleteProcess(id: string, actor?: string | null) {
  const list = await readProcesses();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return;
  list[idx] = pushHistory(
    { ...list[idx], deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { action: "deleted", actor: actor ?? null },
  );
  await writeProcesses(list);
}

export function useProcesses() {
  const [list, setList] = useState<ProcessRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const l = await readProcesses();
    setList(l);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const onStorage = () => load();
    window.addEventListener("storage:processes", onStorage);
    return () => window.removeEventListener("storage:processes", onStorage);
  }, []);

  return {
    list: list.filter((p) => !p.deleted_at),
    all: list,
    loading,
    reload: load,
    get: (id: string) => list.find((p) => p.id === id),
  };
}
