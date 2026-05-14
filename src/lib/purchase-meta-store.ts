// Metadados estendidos da compra — campos personalizados e inspeção de
// recebimento. Persistido em `app_data`.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PurchaseCustomField {
  id: string;
  label: string;
  value: string;
}

export interface PurchaseReceivingInspection {
  status: "pendente" | "aprovado" | "aprovado_restricao" | "reprovado";
  inspected_at: string | null;
  inspector_name: string | null;
  observations: string | null;
  attachments?: { name: string; url: string }[];
}

export interface PurchaseMeta {
  custom_fields: PurchaseCustomField[];
  receiving_inspection: PurchaseReceivingInspection;
}

export const emptyPurchaseMeta = (): PurchaseMeta => ({
  custom_fields: [],
  receiving_inspection: {
    status: "pendente",
    inspected_at: null,
    inspector_name: null,
    observations: null,
  },
});

const pKey = (id: string) => `purchase-meta:${id}`;

export async function readPurchaseMeta(id: string): Promise<PurchaseMeta> {
  const { data } = await supabase.from("app_data").select("value").eq("key", pKey(id)).maybeSingle();
  if (!data) return emptyPurchaseMeta();
  return { ...emptyPurchaseMeta(), ...(data.value as Partial<PurchaseMeta>) };
}

export async function writePurchaseMeta(id: string, meta: PurchaseMeta): Promise<void> {
  const { error } = await supabase.from("app_data").upsert({ key: pKey(id), value: meta as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(`storage:purchase-meta:${id}`));
}

export function usePurchaseMeta(id: string | undefined) {
  const [meta, setMeta] = useState<PurchaseMeta>(emptyPurchaseMeta());
  const [loading, setLoading] = useState(!!id);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setMeta(await readPurchaseMeta(id));
    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    void load();
    const handler = () => { void load(); };
    window.addEventListener(`storage:purchase-meta:${id}`, handler);
    const channel = supabase
      .channel(`purchase-meta:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data", filter: `key=eq.${pKey(id)}` }, () => { void load(); })
      .subscribe();
    return () => {
      window.removeEventListener(`storage:purchase-meta:${id}`, handler);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { meta, loading, refresh: load };
}

export const inspectionStatusLabel: Record<PurchaseReceivingInspection["status"], string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  aprovado_restricao: "Aprovado c/ restrição",
  reprovado: "Reprovado",
};

export const inspectionStatusTone = (
  s: PurchaseReceivingInspection["status"],
): "success" | "warning" | "danger" | "muted" =>
  s === "aprovado" ? "success" : s === "aprovado_restricao" ? "warning" : s === "reprovado" ? "danger" : "muted";
