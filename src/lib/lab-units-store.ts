// Unidades / setores (tabela real `lab_units`) + atribuição via `profiles.lab_unit_id`.
// Restrições por módulo continuam em `app_data` (sem schema dedicado).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LabUnit {
  id: string;
  name: string;
  code?: string | null;
  active: boolean;
}

const MODULE_KEY = "lab-units:module-restrictions"; // { [unit_id]: string[] permitidos }
type ModuleMap = Record<string, string[]>;

// `lab_units` e `profiles.lab_unit_id` ainda não estão refletidos em types.ts —
// usamos cast para `any` apenas nas queries afetadas.
const sb = supabase as any;

export async function listUnits(): Promise<LabUnit[]> {
  const { data, error } = await sb.from("lab_units").select("id,name,code,active").eq("active", true).order("name");
  if (error) {
    console.warn("[lab-units] list:", error.message);
    return [];
  }
  return (data ?? []) as LabUnit[];
}

export async function createUnit(input: { name: string; code?: string }) {
  const { error } = await sb.from("lab_units").insert({ name: input.name, code: input.code || null });
  if (error) throw error;
}
export async function updateUnit(id: string, patch: Partial<LabUnit>) {
  const { error } = await sb.from("lab_units").update(patch).eq("id", id);
  if (error) throw error;
}
export async function deleteUnit(id: string) {
  const { error } = await sb.from("lab_units").delete().eq("id", id);
  if (error) throw error;
}

export async function assignUserUnit(userId: string, unitId: string | null) {
  const { error } = await sb.from("profiles").update({ lab_unit_id: unitId }).eq("id", userId);
  if (error) throw error;
}

export async function readModuleRestrictions(): Promise<ModuleMap> {
  const { data } = await supabase.from("app_data").select("value").eq("key", MODULE_KEY).maybeSingle();
  return ((data?.value as unknown as ModuleMap) ?? {});
}
export async function writeModuleRestrictions(map: ModuleMap) {
  const { error } = await supabase.from("app_data").upsert({ key: MODULE_KEY, value: map as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("storage:lab-units-modules"));
}

/** Hook genérico para o app: unidades + restrições + unidade do usuário corrente. */
export function useLabUnits() {
  const [units, setUnits] = useState<LabUnit[]>([]);
  const [modules, setModules] = useState<ModuleMap>({});
  const [currentUnitId, setCurrentUnitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const session = (await supabase.auth.getSession()).data.session;
      const [u, m] = await Promise.all([listUnits(), readModuleRestrictions()]);
      let myUnit: string | null = null;
      if (session?.user) {
        const { data } = await sb.from("profiles").select("lab_unit_id").eq("id", session.user.id).maybeSingle();
        myUnit = (data?.lab_unit_id as string | null) ?? null;
      }
      if (!mounted) return;
      setUnits(u);
      setModules(m);
      setCurrentUnitId(myUnit);
      setLoading(false);
    };
    load();
    const onMods = () => load();
    window.addEventListener("storage:lab-units-modules", onMods);
    return () => {
      mounted = false;
      window.removeEventListener("storage:lab-units-modules", onMods);
    };
  }, []);

  return {
    units,
    moduleRestrictions: modules,
    currentUnitId,
    loading,
    /** módulos permitidos para uma unidade ([] = todos) */
    getAllowedModules: (unitId: string | null) => (unitId ? modules[unitId] ?? [] : []),
  };
}
