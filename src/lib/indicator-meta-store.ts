// Metadados estendidos de indicadores — tipo (desempenho/qualidade) e processo.
// Persistido como documento único em `app_data` (sem migração de schema).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type IndicatorKind = "desempenho" | "qualidade";

export interface IndicatorExtra {
  kind: IndicatorKind;
  process: string | null;
}

export type IndicatorMetaMap = Record<string, IndicatorExtra>;

const KEY = "indicator-meta:all";

export const emptyExtra = (): IndicatorExtra => ({ kind: "desempenho", process: null });

export async function readIndicatorMeta(): Promise<IndicatorMetaMap> {
  const { data } = await supabase.from("app_data").select("value").eq("key", KEY).maybeSingle();
  return ((data?.value as unknown as IndicatorMetaMap) ?? {});
}

export async function writeIndicatorMeta(map: IndicatorMetaMap) {
  const { error } = await supabase.from("app_data").upsert({ key: KEY, value: map as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("storage:indicator-meta"));
}

export async function setIndicatorExtra(id: string, extra: Partial<IndicatorExtra>) {
  const map = await readIndicatorMeta();
  map[id] = { ...emptyExtra(), ...(map[id] ?? {}), ...extra };
  await writeIndicatorMeta(map);
  return map;
}

export function useIndicatorMeta() {
  const [map, setMap] = useState<IndicatorMetaMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const m = await readIndicatorMeta();
      if (!mounted) return;
      setMap(m);
      setLoading(false);
    };
    load();
    const onStorage = () => load();
    window.addEventListener("storage:indicator-meta", onStorage);
    return () => {
      mounted = false;
      window.removeEventListener("storage:indicator-meta", onStorage);
    };
  }, []);

  return { map, loading, getExtra: (id: string) => map[id] ?? emptyExtra() };
}
