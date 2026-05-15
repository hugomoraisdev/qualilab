import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AlertCategory =
  | "calibracao"
  | "competencia"
  | "risco"
  | "fornecedor"
  | "documento"
  | "acao";

export interface AlertRecipientsConfig {
  calibracao: string[]; // user IDs que recebem alertas de calibração (adicionados aos responsáveis)
  competencia: string[]; // user IDs que recebem alertas de competências vencidas
  risco: string[]; // user IDs que recebem alertas de risco
  fornecedor: string[]; // user IDs que recebem alertas de fornecedor (substitui "todos os gestores")
  documento: string[]; // user IDs que recebem alertas de etapas de documento
  acao: string[]; // user IDs que recebem alertas de ações próximas do prazo
}

const APP_DATA_KEY = "alert-recipients";

export function emptyAlertRecipientsConfig(): AlertRecipientsConfig {
  return { calibracao: [], competencia: [], risco: [], fornecedor: [], documento: [], acao: [] };
}

export async function readAlertRecipients(): Promise<AlertRecipientsConfig> {
  const { data } = await supabase
    .from("app_data")
    .select("value")
    .eq("key", APP_DATA_KEY)
    .maybeSingle();
  if (!data) return emptyAlertRecipientsConfig();
  return { ...emptyAlertRecipientsConfig(), ...(data.value as Partial<AlertRecipientsConfig>) };
}

export async function writeAlertRecipients(config: AlertRecipientsConfig): Promise<void> {
  const { error } = await supabase
    .from("app_data")
    .upsert({ key: APP_DATA_KEY, value: config as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("storage:alert-recipients"));
}

export function useAlertRecipients() {
  const [config, setConfig] = useState<AlertRecipientsConfig>(emptyAlertRecipientsConfig());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setConfig(await readAlertRecipients());
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const handler = () => {
      void load();
    };
    window.addEventListener("storage:alert-recipients", handler);
    const channel = supabase
      .channel("alert-recipients-watch")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_data",
          filter: `key=eq.${APP_DATA_KEY}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      window.removeEventListener("storage:alert-recipients", handler);
      supabase.removeChannel(channel);
    };
  }, []);

  return { config, loading, refresh: load };
}
