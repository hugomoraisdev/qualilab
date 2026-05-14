// Metadados extras das competências/treinamentos: anexo de certificado,
// provedor do treinamento, carga horária e data do curso.
// Persistido em uma única chave do app_data (mapa por competency_id).
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CompetencyExtra {
  certificate_url?: string | null;
  training_provider?: string | null;
  training_date?: string | null;
  hours?: number | null;
  training_type?: "treinamento" | "qualificacao" | "capacitacao" | "reciclagem" | null;
}

const KEY = "competency-extras";
const EVT = "storage:competency-extras";

export type ExtrasMap = Record<string, CompetencyExtra>;

export async function readExtras(): Promise<ExtrasMap> {
  const { data } = await supabase.from("app_data").select("value").eq("key", KEY).maybeSingle();
  if (!data?.value) return {};
  return ((data.value as { map?: ExtrasMap }).map) ?? {};
}

export async function writeExtras(map: ExtrasMap): Promise<void> {
  const { error } = await supabase.from("app_data").upsert({ key: KEY, value: { map } as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
}

export async function setExtra(competencyId: string, extra: CompetencyExtra): Promise<ExtrasMap> {
  const map = await readExtras();
  map[competencyId] = { ...map[competencyId], ...extra };
  await writeExtras(map);
  return map;
}

export function useExtras(): { map: ExtrasMap; loading: boolean; refresh: () => void } {
  const [map, setMap] = useState<ExtrasMap>({});
  const [loading, setLoading] = useState(true);
  const channelName = useRef(`competency-extras:${Math.random().toString(36).slice(2)}`);
  const load = async () => { setLoading(true); setMap(await readExtras()); setLoading(false); };
  useEffect(() => {
    void load();
    const h = () => { void load(); };
    window.addEventListener(EVT, h);
    const channel = supabase
      .channel(channelName.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data", filter: `key=eq.${KEY}` }, () => { void load(); })
      .subscribe();
    return () => { window.removeEventListener(EVT, h); supabase.removeChannel(channel); };
  }, []);
  return { map, loading, refresh: load };
}
