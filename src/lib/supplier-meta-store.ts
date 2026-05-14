// Metadados estendidos do fornecedor — classificação estratégica, documentos
// internos com validade, solicitações de documentos, inspeções, mensagens
// (comunicação estruturada), campos personalizados e histórico. Persistido
// em `app_data` para evitar migração de schema.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SupplierStrategicClassification = "critico" | "estrategico" | "operacional" | "nao_critico" | null;

export interface SupplierDocument {
  id: string;
  type: string;          // ex: "Contrato Social", "ISO 9001"
  number?: string | null;
  issued_at?: string | null;
  validity?: string | null;
  url?: string | null;
  notes?: string | null;
  status: "vigente" | "vencido" | "pendente";
  uploaded_at: string;
}

export interface SupplierDocumentRequest {
  id: string;
  document_type: string;
  description?: string | null;
  requested_at: string;
  due_date?: string | null;
  status: "pendente" | "atendido" | "cancelado";
  email_sent_at?: string | null;
  fulfilled_at?: string | null;
  fulfilled_by_submission_id?: string | null;
}

export interface SupplierInspection {
  id: string;
  inspection_date: string;
  type: string;          // "Recebimento", "Auditoria in loco", "Qualidade", ...
  result: "aprovado" | "aprovado_restricao" | "reprovado";
  inspector_name?: string | null;
  observations?: string | null;
  attachments?: { name: string; url: string }[];
}

export interface SupplierMessage {
  id: string;
  at: string;
  author_name: string;
  author_role: "interno" | "fornecedor";
  body: string;
}

export interface SupplierCustomField {
  id: string;
  label: string;
  value: string;
}

export interface SupplierHistoryEvent {
  id: string;
  at: string;
  actor: string | null;
  action: string;
  detail?: string | null;
}

export interface SupplierMeta {
  classification: SupplierStrategicClassification;
  documents: SupplierDocument[];
  requested_documents: SupplierDocumentRequest[];
  inspections: SupplierInspection[];
  messages: SupplierMessage[];
  custom_fields: SupplierCustomField[];
  history: SupplierHistoryEvent[];
}

export const emptySupplierMeta = (): SupplierMeta => ({
  classification: null,
  documents: [],
  requested_documents: [],
  inspections: [],
  messages: [],
  custom_fields: [],
  history: [],
});

const supKey = (id: string) => `supplier-meta:${id}`;

export async function readSupplierMeta(id: string): Promise<SupplierMeta> {
  const { data } = await supabase.from("app_data").select("value").eq("key", supKey(id)).maybeSingle();
  if (!data) return emptySupplierMeta();
  return { ...emptySupplierMeta(), ...(data.value as Partial<SupplierMeta>) };
}

export async function writeSupplierMeta(id: string, meta: SupplierMeta): Promise<void> {
  const { error } = await supabase.from("app_data").upsert({ key: supKey(id), value: meta as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(`storage:supplier-meta:${id}`));
}

export async function updateSupplierMeta(
  id: string,
  updater: (prev: SupplierMeta) => SupplierMeta,
  historyEntry?: { action: string; detail?: string; actor?: string | null },
) {
  const prev = await readSupplierMeta(id);
  let next = updater(prev);
  if (historyEntry) {
    const ev: SupplierHistoryEvent = {
      id: `h-${Date.now().toString(36)}`,
      at: new Date().toISOString(),
      actor: historyEntry.actor ?? null,
      action: historyEntry.action,
      detail: historyEntry.detail ?? null,
    };
    next = { ...next, history: [ev, ...next.history].slice(0, 200) };
  }
  await writeSupplierMeta(id, next);
  return next;
}

export function useSupplierMeta(id: string | undefined): {
  meta: SupplierMeta;
  loading: boolean;
  refresh: () => void;
} {
  const [meta, setMeta] = useState<SupplierMeta>(emptySupplierMeta());
  const [loading, setLoading] = useState(!!id);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const m = await readSupplierMeta(id);
    setMeta(m);
    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    void load();
    const handler = () => { void load(); };
    window.addEventListener(`storage:supplier-meta:${id}`, handler);
    const channel = supabase
      .channel(`supplier-meta:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data", filter: `key=eq.${supKey(id)}` }, () => { void load(); })
      .subscribe();
    return () => {
      window.removeEventListener(`storage:supplier-meta:${id}`, handler);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { meta, loading, refresh: load };
}

export function useAllSupplierMeta(ids: string[]): Record<string, SupplierMeta> {
  const [map, setMap] = useState<Record<string, SupplierMeta>>({});
  const joinKey = ids.join("|");
  useEffect(() => {
    if (ids.length === 0) { setMap({}); return; }
    let cancelled = false;
    const keys = ids.map(supKey);
    const load = async () => {
      const { data } = await supabase.from("app_data").select("key,value").in("key", keys);
      if (cancelled) return;
      const out: Record<string, SupplierMeta> = {};
      for (const id of ids) {
        const row = data?.find((r) => r.key === supKey(id));
        out[id] = row ? { ...emptySupplierMeta(), ...(row.value as Partial<SupplierMeta>) } : emptySupplierMeta();
      }
      setMap(out);
    };
    void load();
    const channel = supabase
      .channel("supplier-meta-bulk")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data" }, () => { void load(); })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinKey]);
  return map;
}

export const classificationLabel: Record<NonNullable<SupplierStrategicClassification>, string> = {
  critico: "Crítico",
  estrategico: "Estratégico",
  operacional: "Operacional",
  nao_critico: "Não crítico",
};

export const classificationTone = (
  c: SupplierStrategicClassification,
): "destructive" | "warning" | "info" | "muted" =>
  c === "critico" ? "destructive" : c === "estrategico" ? "warning" : c === "operacional" ? "info" : "muted";

export function deriveDocumentStatus(d: Pick<SupplierDocument, "validity">): SupplierDocument["status"] {
  if (!d.validity) return "vigente";
  const today = new Date(); today.setHours(0,0,0,0);
  const v = new Date(d.validity + "T00:00:00");
  return v.getTime() < today.getTime() ? "vencido" : "vigente";
}
