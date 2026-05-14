// Metadados estendidos do equipamento — limites de calibração configuráveis,
// destinatários de notificação, campos personalizados e histórico.
// Persistido em `app_data` (sem migração de schema), seguindo o padrão de supplier-meta.
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EquipmentCalibrationLimit {
  maxError: number;
  unit: string;
}

export interface EquipmentCustomField {
  id: string;
  label: string;
  value: string;
}

export interface EquipmentHistoryEvent {
  id: string;
  at: string;
  actor: string | null;
  action: string;
  detail?: string | null;
}

export interface EquipmentMeta {
  calibration_limit: EquipmentCalibrationLimit | null; // override do limite global
  notification_recipients: string[];                    // e-mails
  custom_fields: EquipmentCustomField[];
  history: EquipmentHistoryEvent[];
}

export const emptyEquipmentMeta = (): EquipmentMeta => ({
  calibration_limit: null,
  notification_recipients: [],
  custom_fields: [],
  history: [],
});

const eqKey = (id: string) => `equipment-meta:${id}`;

export async function readEquipmentMeta(id: string): Promise<EquipmentMeta> {
  const { data } = await supabase.from("app_data").select("value").eq("key", eqKey(id)).maybeSingle();
  if (!data) return emptyEquipmentMeta();
  return { ...emptyEquipmentMeta(), ...(data.value as Partial<EquipmentMeta>) };
}

export async function writeEquipmentMeta(id: string, meta: EquipmentMeta): Promise<void> {
  const { error } = await supabase.from("app_data").upsert({ key: eqKey(id), value: meta as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(`storage:equipment-meta:${id}`));
}

export async function updateEquipmentMeta(
  id: string,
  updater: (prev: EquipmentMeta) => EquipmentMeta,
  historyEntry?: { action: string; detail?: string; actor?: string | null },
) {
  const prev = await readEquipmentMeta(id);
  let next = updater(prev);
  if (historyEntry) {
    const ev: EquipmentHistoryEvent = {
      id: `h-${Date.now().toString(36)}`,
      at: new Date().toISOString(),
      actor: historyEntry.actor ?? null,
      action: historyEntry.action,
      detail: historyEntry.detail ?? null,
    };
    next = { ...next, history: [ev, ...next.history].slice(0, 200) };
  }
  await writeEquipmentMeta(id, next);
  return next;
}

export function useEquipmentMeta(id: string | undefined) {
  const [meta, setMeta] = useState<EquipmentMeta>(emptyEquipmentMeta());
  const [loading, setLoading] = useState(!!id);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setMeta(await readEquipmentMeta(id));
    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    void load();
    const handler = () => { void load(); };
    window.addEventListener(`storage:equipment-meta:${id}`, handler);
    const channel = supabase
      .channel(`equipment-meta:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data", filter: `key=eq.${eqKey(id)}` }, () => { void load(); })
      .subscribe();
    return () => {
      window.removeEventListener(`storage:equipment-meta:${id}`, handler);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { meta, loading, refresh: load };
}

export function useAllEquipmentMeta(ids: string[]): Record<string, EquipmentMeta> {
  const [map, setMap] = useState<Record<string, EquipmentMeta>>({});
  const joinKey = ids.join("|");
  const channelName = useRef(`equipment-meta-bulk:${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    if (ids.length === 0) { setMap({}); return; }
    let cancelled = false;
    const keys = ids.map(eqKey);
    const load = async () => {
      const { data } = await supabase.from("app_data").select("key,value").in("key", keys);
      if (cancelled) return;
      const out: Record<string, EquipmentMeta> = {};
      for (const id of ids) {
        const row = data?.find((r) => r.key === eqKey(id));
        out[id] = row ? { ...emptyEquipmentMeta(), ...(row.value as Partial<EquipmentMeta>) } : emptyEquipmentMeta();
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
