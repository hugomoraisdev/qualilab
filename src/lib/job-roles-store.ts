// Catálogo de cargos/funções e requisitos de competência por função.
// Persistido em uma única chave `app_data` para evitar migração de schema.
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface JobRoleRequirement {
  id: string;
  area: string;
  skill: string;
  min_level: "basico" | "intermediario" | "avancado";
}

export interface JobRole {
  id: string;
  name: string;
  description: string | null;
  department: string | null;
  requirements: JobRoleRequirement[];
}

const KEY = "job-roles";
const EVT = "storage:job-roles";

export async function readJobRoles(): Promise<JobRole[]> {
  const { data } = await supabase.from("app_data").select("value").eq("key", KEY).maybeSingle();
  if (!data?.value) return [];
  const v = data.value as { roles?: JobRole[] };
  return v.roles ?? [];
}

export async function writeJobRoles(roles: JobRole[]): Promise<void> {
  const { error } = await supabase.from("app_data").upsert({ key: KEY, value: { roles } as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
}

export async function upsertJobRole(role: JobRole): Promise<JobRole[]> {
  const list = await readJobRoles();
  const idx = list.findIndex((r) => r.id === role.id);
  const next = idx >= 0 ? list.map((r) => (r.id === role.id ? role : r)) : [...list, role];
  await writeJobRoles(next);
  return next;
}

export async function deleteJobRole(id: string): Promise<JobRole[]> {
  const list = await readJobRoles();
  const next = list.filter((r) => r.id !== id);
  await writeJobRoles(next);
  return next;
}

export function useJobRoles(): { roles: JobRole[]; loading: boolean; refresh: () => void } {
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const channelName = useRef(`job-roles:${Math.random().toString(36).slice(2)}`);
  const load = async () => { setLoading(true); setRoles(await readJobRoles()); setLoading(false); };
  useEffect(() => {
    void load();
    const handler = () => { void load(); };
    window.addEventListener(EVT, handler);
    const channel = supabase
      .channel(channelName.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data", filter: `key=eq.${KEY}` }, () => { void load(); })
      .subscribe();
    return () => { window.removeEventListener(EVT, handler); supabase.removeChannel(channel); };
  }, []);
  return { roles, loading, refresh: load };
}

export const LEVEL_RANK: Record<string, number> = {
  basico: 1, intermediario: 2, avancado: 3,
};
export const LEVEL_LABEL: Record<string, string> = {
  basico: "Básico", intermediario: "Intermediário", avancado: "Avançado",
};
