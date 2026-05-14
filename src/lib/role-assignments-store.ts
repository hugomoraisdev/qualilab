// Atribuição de função a cada colaborador. Mapa user_id -> job_role_id
// armazenado em uma chave única do app_data.
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "role-assignments";
const EVT = "storage:role-assignments";

export type RoleAssignmentMap = Record<string, string>;

export async function readAssignments(): Promise<RoleAssignmentMap> {
  const { data } = await supabase.from("app_data").select("value").eq("key", KEY).maybeSingle();
  if (!data?.value) return {};
  return ((data.value as { map?: RoleAssignmentMap }).map) ?? {};
}

export async function writeAssignments(map: RoleAssignmentMap): Promise<void> {
  const { error } = await supabase.from("app_data").upsert({ key: KEY, value: { map } as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
}

export async function setAssignment(userId: string, roleId: string | null): Promise<RoleAssignmentMap> {
  const map = await readAssignments();
  if (!roleId) delete map[userId]; else map[userId] = roleId;
  await writeAssignments(map);
  return map;
}

export function useAssignments(): { map: RoleAssignmentMap; loading: boolean; refresh: () => void } {
  const [map, setMap] = useState<RoleAssignmentMap>({});
  const [loading, setLoading] = useState(true);
  const channelName = useRef(`role-assignments:${Math.random().toString(36).slice(2)}`);
  const load = async () => { setLoading(true); setMap(await readAssignments()); setLoading(false); };
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
