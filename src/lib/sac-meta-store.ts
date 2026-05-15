import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CustomFieldValue } from "./custom-fields-store";

export type SacCustomValues = Record<string, CustomFieldValue>;

const KEY = "sac-custom-values:all";
const EVENT = "storage:sac-custom-values";

interface SacMeta {
  ticket_id: string;
  custom_fields: SacCustomValues;
}

async function readAll(): Promise<SacMeta[]> {
  const { data } = await supabase.from("app_data").select("value").eq("key", KEY).maybeSingle();
  return (data?.value as SacMeta[] | null) ?? [];
}

async function writeAll(list: SacMeta[]) {
  const { error } = await supabase.from("app_data").upsert({ key: KEY, value: list as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export async function upsertSacMeta(ticketId: string, custom_fields: SacCustomValues) {
  const list = await readAll();
  const idx = list.findIndex((m) => m.ticket_id === ticketId);
  const entry: SacMeta = { ticket_id: ticketId, custom_fields };
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  await writeAll(list);
}

export function useSacMeta(ticketId: string): [SacCustomValues, (v: SacCustomValues) => void] {
  const [values, setValues] = useState<SacCustomValues>({});

  const load = useCallback(async () => {
    const list = await readAll();
    const found = list.find((m) => m.ticket_id === ticketId);
    setValues(found?.custom_fields ?? {});
  }, [ticketId]);

  useEffect(() => {
    void load();
    window.addEventListener(EVENT, load);
    return () => window.removeEventListener(EVENT, load);
  }, [load]);

  return [values, setValues];
}
