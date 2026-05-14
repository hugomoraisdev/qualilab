// Metadados estendidos da ocorrência (prazo, vínculos a risco/fornecedor,
// anexos, campos personalizados, 5W2H, verificação de eficácia e histórico
// de eventos). Persistido em `app_data` para evitar migração de schema,
// seguindo o mesmo padrão do `audit-meta-store` e `document-meta-store`.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FiveW2HData {
  what: string;       // O que será feito
  why: string;        // Por que será feito
  where: string;      // Onde será feito
  when: string;       // Quando será feito (ISO date)
  who: string;        // Quem fará
  how: string;        // Como será feito
  how_much: string;   // Quanto custará
}

export const emptyFiveW2H = (): FiveW2HData => ({
  what: "", why: "", where: "", when: "", who: "", how: "", how_much: "",
});

export interface OccurrenceAttachment {
  id: string;
  name: string;
  url: string;
  description?: string | null;
  uploaded_at: string;
}

export interface OccurrenceEffectiveness {
  status: "pendente" | "eficaz" | "nao_eficaz" | "parcial";
  verified_at: string | null;
  verified_by: string | null;
  notes: string | null;
}

export interface OccurrenceHistoryEvent {
  id: string;
  at: string;
  actor: string | null;
  action: string;
  detail?: string | null;
}

export interface OccurrenceCustomField {
  id: string;
  label: string;
  value: string;
}

export interface OccurrenceMeta {
  deadline: string | null;
  linked_risk_id: string | null;
  linked_supplier_id: string | null;
  attachments: OccurrenceAttachment[];
  custom_fields: OccurrenceCustomField[];
  five_w2h: FiveW2HData | null;
  effectiveness: OccurrenceEffectiveness;
  history: OccurrenceHistoryEvent[];
}

export const emptyOccurrenceMeta = (): OccurrenceMeta => ({
  deadline: null,
  linked_risk_id: null,
  linked_supplier_id: null,
  attachments: [],
  custom_fields: [],
  five_w2h: null,
  effectiveness: { status: "pendente", verified_at: null, verified_by: null, notes: null },
  history: [],
});

const occKey = (id: string) => `occurrence-meta:${id}`;

export async function readOccurrenceMeta(id: string): Promise<OccurrenceMeta> {
  const { data } = await supabase.from("app_data").select("value").eq("key", occKey(id)).maybeSingle();
  if (!data) return emptyOccurrenceMeta();
  return { ...emptyOccurrenceMeta(), ...(data.value as Partial<OccurrenceMeta>) };
}

export async function writeOccurrenceMeta(id: string, meta: OccurrenceMeta): Promise<void> {
  const { error } = await supabase.from("app_data").upsert({ key: occKey(id), value: meta as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(`storage:occ-meta:${id}`));
}

export async function updateOccurrenceMeta(
  id: string,
  updater: (prev: OccurrenceMeta) => OccurrenceMeta,
  historyEntry?: { action: string; detail?: string; actor?: string | null },
) {
  const prev = await readOccurrenceMeta(id);
  let next = updater(prev);
  if (historyEntry) {
    const ev: OccurrenceHistoryEvent = {
      id: `h-${Date.now().toString(36)}`,
      at: new Date().toISOString(),
      actor: historyEntry.actor ?? null,
      action: historyEntry.action,
      detail: historyEntry.detail ?? null,
    };
    next = { ...next, history: [ev, ...next.history].slice(0, 200) };
  }
  await writeOccurrenceMeta(id, next);
  return next;
}

export function useOccurrenceMeta(id: string | undefined): {
  meta: OccurrenceMeta;
  loading: boolean;
  refresh: () => void;
} {
  const [meta, setMeta] = useState<OccurrenceMeta>(emptyOccurrenceMeta());
  const [loading, setLoading] = useState(!!id);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const m = await readOccurrenceMeta(id);
    setMeta(m);
    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    void load();
    const handler = () => { void load(); };
    window.addEventListener(`storage:occ-meta:${id}`, handler);
    const channel = supabase
      .channel(`occ-meta:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data", filter: `key=eq.${occKey(id)}` }, () => { void load(); })
      .subscribe();
    return () => {
      window.removeEventListener(`storage:occ-meta:${id}`, handler);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { meta, loading, refresh: load };
}

/** Carrega meta de várias ocorrências de uma vez (p/ notificações e listas). */
export function useAllOccurrenceMeta(ids: string[]): Record<string, OccurrenceMeta> {
  const [map, setMap] = useState<Record<string, OccurrenceMeta>>({});
  const joinKey = ids.join("|");
  useEffect(() => {
    if (ids.length === 0) { setMap({}); return; }
    let cancelled = false;
    const keys = ids.map(occKey);
    const load = async () => {
      const { data } = await supabase.from("app_data").select("key,value").in("key", keys);
      if (cancelled) return;
      const out: Record<string, OccurrenceMeta> = {};
      for (const id of ids) {
        const row = data?.find((r) => r.key === occKey(id));
        out[id] = row ? { ...emptyOccurrenceMeta(), ...(row.value as Partial<OccurrenceMeta>) } : emptyOccurrenceMeta();
      }
      setMap(out);
    };
    void load();
    const channel = supabase
      .channel("occ-meta-bulk")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data" }, () => { void load(); })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinKey]);
  return map;
}

export const effectivenessLabel: Record<OccurrenceEffectiveness["status"], string> = {
  pendente: "Pendente",
  eficaz: "Eficaz",
  nao_eficaz: "Não eficaz",
  parcial: "Parcialmente eficaz",
};
