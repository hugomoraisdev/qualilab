// Unidades / setores da organização + atribuição de unidade por usuário.
// Persistido em app_data (sem migração de schema).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LabUnit {
  id: string;
  name: string;
  code?: string;
  active: boolean;
}

const UNITS_KEY = "lab-units:all";
const ASSIGN_KEY = "lab-units:assignments"; // { [user_id]: unit_id }
const MODULE_KEY = "lab-units:module-restrictions"; // { [unit_id]: string[] de módulos permitidos; vazio = todos }

type AssignMap = Record<string, string | null>;
type ModuleMap = Record<string, string[]>;

async function readKey<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase.from("app_data").select("value").eq("key", key).maybeSingle();
  return ((data?.value as unknown as T) ?? fallback);
}
async function writeKey<T>(key: string, value: T, evt: string) {
  const { error } = await supabase.from("app_data").upsert({ key, value: value as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(evt));
}

export const readUnits = () => readKey<LabUnit[]>(UNITS_KEY, []);
export const writeUnits = (u: LabUnit[]) => writeKey(UNITS_KEY, u, "storage:lab-units");

export const readAssignments = () => readKey<AssignMap>(ASSIGN_KEY, {});
export const writeAssignments = (m: AssignMap) => writeKey(ASSIGN_KEY, m, "storage:lab-units-assign");

export const readModuleRestrictions = () => readKey<ModuleMap>(MODULE_KEY, {});
export const writeModuleRestrictions = (m: ModuleMap) =>
  writeKey(MODULE_KEY, m, "storage:lab-units-modules");

export async function setUserUnit(userId: string, unitId: string | null) {
  const map = await readAssignments();
  if (unitId) map[userId] = unitId;
  else delete map[userId];
  await writeAssignments(map);
}

export function useLabUnits() {
  const [units, setUnits] = useState<LabUnit[]>([]);
  const [assign, setAssign] = useState<AssignMap>({});
  const [modules, setModules] = useState<ModuleMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [u, a, m] = await Promise.all([readUnits(), readAssignments(), readModuleRestrictions()]);
      if (!mounted) return;
      setUnits(u);
      setAssign(a);
      setModules(m);
      setLoading(false);
    };
    load();
    const fns = [
      ["storage:lab-units", load],
      ["storage:lab-units-assign", load],
      ["storage:lab-units-modules", load],
    ] as const;
    fns.forEach(([k, h]) => window.addEventListener(k, h as EventListener));
    return () => {
      mounted = false;
      fns.forEach(([k, h]) => window.removeEventListener(k, h as EventListener));
    };
  }, []);

  return {
    units,
    assignments: assign,
    moduleRestrictions: modules,
    loading,
    getUnitOf: (userId: string) => assign[userId] ?? null,
    getAllowedModules: (unitId: string | null) =>
      unitId ? modules[unitId] ?? [] : [],
  };
}
