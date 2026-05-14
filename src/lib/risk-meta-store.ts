// Metadados estendidos do risco: vínculos (documentos / ocorrências),
// prazo de tratamento, ações de contingência, anexos de evidência,
// campos personalizados e histórico de alterações. Persistido em
// `app_data` para evitar migração de schema, seguindo o padrão dos
// demais meta-stores (audit-meta, occurrence-meta, document-meta).
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RiskAttachment {
  id: string;
  name: string;
  url: string;
  description?: string | null;
  uploaded_at: string;
}

export interface RiskCustomField {
  id: string;
  label: string;
  value: string;
}

export interface RiskHistoryEvent {
  id: string;
  at: string;
  actor: string | null;
  action: string;
  detail?: string | null;
}

export interface RiskMeta {
  treatment_deadline: string | null;
  contingency_plan: string | null;
  linked_document_ids: string[];
  linked_occurrence_ids: string[];
  attachments: RiskAttachment[];
  custom_fields: RiskCustomField[];
  history: RiskHistoryEvent[];
}

export const emptyRiskMeta = (): RiskMeta => ({
  treatment_deadline: null,
  contingency_plan: null,
  linked_document_ids: [],
  linked_occurrence_ids: [],
  attachments: [],
  custom_fields: [],
  history: [],
});

const riskKey = (id: string) => `risk-meta:${id}`;

export async function readRiskMeta(id: string): Promise<RiskMeta> {
  const { data } = await supabase.from("app_data").select("value").eq("key", riskKey(id)).maybeSingle();
  if (!data) return emptyRiskMeta();
  return { ...emptyRiskMeta(), ...(data.value as Partial<RiskMeta>) };
}

export async function writeRiskMeta(id: string, meta: RiskMeta): Promise<void> {
  const { error } = await supabase.from("app_data").upsert({ key: riskKey(id), value: meta as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(`storage:risk-meta:${id}`));
}

export async function updateRiskMeta(
  id: string,
  updater: (prev: RiskMeta) => RiskMeta,
  historyEntry?: { action: string; detail?: string; actor?: string | null },
) {
  const prev = await readRiskMeta(id);
  let next = updater(prev);
  if (historyEntry) {
    const ev: RiskHistoryEvent = {
      id: `h-${Date.now().toString(36)}`,
      at: new Date().toISOString(),
      actor: historyEntry.actor ?? null,
      action: historyEntry.action,
      detail: historyEntry.detail ?? null,
    };
    next = { ...next, history: [ev, ...next.history].slice(0, 200) };
  }
  await writeRiskMeta(id, next);
  return next;
}

export function useRiskMeta(id: string | undefined): {
  meta: RiskMeta;
  loading: boolean;
  refresh: () => void;
} {
  const [meta, setMeta] = useState<RiskMeta>(emptyRiskMeta());
  const [loading, setLoading] = useState(!!id);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const m = await readRiskMeta(id);
    setMeta(m);
    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    void load();
    const handler = () => { void load(); };
    window.addEventListener(`storage:risk-meta:${id}`, handler);
    const channel = supabase
      .channel(`risk-meta:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data", filter: `key=eq.${riskKey(id)}` }, () => { void load(); })
      .subscribe();
    return () => {
      window.removeEventListener(`storage:risk-meta:${id}`, handler);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { meta, loading, refresh: load };
}

/** Carrega meta de vários riscos de uma só vez (notificações, listas). */
export function useAllRiskMeta(ids: string[]): Record<string, RiskMeta> {
  const [map, setMap] = useState<Record<string, RiskMeta>>({});
  const joinKey = ids.join("|");
  // Unique per hook instance to avoid channel name collision when used in multiple components
  const channelName = useRef(`risk-meta-bulk:${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    if (ids.length === 0) { setMap({}); return; }
    let cancelled = false;
    const keys = ids.map(riskKey);
    const load = async () => {
      const { data } = await supabase.from("app_data").select("key,value").in("key", keys);
      if (cancelled) return;
      const out: Record<string, RiskMeta> = {};
      for (const id of ids) {
        const row = data?.find((r) => r.key === riskKey(id));
        out[id] = row ? { ...emptyRiskMeta(), ...(row.value as Partial<RiskMeta>) } : emptyRiskMeta();
      }
      setMap(out);
    };
    void load();
    const channel = supabase
      .channel(channelName.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data" }, () => { void load(); })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinKey]);
  return map;
}
