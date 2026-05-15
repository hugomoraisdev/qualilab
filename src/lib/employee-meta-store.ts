import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EmployeeMeta {
  registration: string | null;
  department: string | null;
  position: string | null;
  admission_date: string | null;
  situation: "ativo" | "inativo" | "afastado" | "desligado";
}

export const emptyEmployeeMeta = (): EmployeeMeta => ({
  registration: null,
  department: null,
  position: null,
  admission_date: null,
  situation: "ativo",
});

export type EmployeeExtrasMap = Record<string, EmployeeMeta>;

const APP_KEY = "employee-extras";

export async function readEmployeeExtras(): Promise<EmployeeExtrasMap> {
  const { data } = await supabase.from("app_data").select("value").eq("key", APP_KEY).maybeSingle();
  return (data?.value as EmployeeExtrasMap) ?? {};
}

export async function writeEmployeeExtras(map: EmployeeExtrasMap): Promise<void> {
  await supabase.from("app_data").upsert({ key: APP_KEY, value: map as never });
  if (typeof window !== "undefined") window.dispatchEvent(new Event("storage:employee-extras"));
}

export async function setEmployeeMeta(userId: string, meta: EmployeeMeta): Promise<void> {
  const current = await readEmployeeExtras();
  await writeEmployeeExtras({ ...current, [userId]: meta });
}

export function useEmployeeExtras(): { map: EmployeeExtrasMap; refresh: () => void } {
  const [map, setMap] = useState<EmployeeExtrasMap>({});

  const load = async () => {
    const m = await readEmployeeExtras();
    setMap(m);
  };

  useEffect(() => {
    void load();
    const handler = () => void load();
    window.addEventListener("storage:employee-extras", handler);
    const channel = supabase
      .channel("employee-extras-ch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_data", filter: `key=eq.${APP_KEY}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      window.removeEventListener("storage:employee-extras", handler);
      supabase.removeChannel(channel);
    };
  }, []);

  return { map, refresh: load };
}
