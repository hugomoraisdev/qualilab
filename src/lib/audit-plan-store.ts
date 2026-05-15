// Metadados estendidos do planejamento de auditoria — objetivo, critério,
// participantes, checklist vinculado, plano/roteiro, documentos de referência
// e observações. Persistido em `app_data` (chave `audit-plan:<auditId>`).
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ParticipantRole = "auditado" | "observador" | "responsavel_area" | "apoio_tecnico";

export interface AuditParticipant {
  id: string;
  kind: "internal" | "external";
  user_id: string | null;
  name: string;
  email: string | null;
  role: ParticipantRole;
}

export interface AuditPlanMeta {
  objective: string;
  criterion: string;
  participants: AuditParticipant[];
  checklist_template_id: string | null;
  checklist_required: boolean;
  document_ref_ids: string[];
  start_time: string | null; // HH:MM
  end_time: string | null; // HH:MM
  scope_areas: string;
  followers: string;
  roteiro_notes: string;
  observations: string;
}

export const emptyAuditPlan = (): AuditPlanMeta => ({
  objective: "",
  criterion: "",
  participants: [],
  checklist_template_id: null,
  checklist_required: false,
  document_ref_ids: [],
  start_time: null,
  end_time: null,
  scope_areas: "",
  followers: "",
  roteiro_notes: "",
  observations: "",
});

const planKey = (id: string) => `audit-plan:${id}`;

export async function readAuditPlan(id: string): Promise<AuditPlanMeta> {
  const { data } = await supabase.from("app_data").select("value").eq("key", planKey(id)).maybeSingle();
  if (!data) return emptyAuditPlan();
  return { ...emptyAuditPlan(), ...(data.value as Partial<AuditPlanMeta>) };
}

export async function writeAuditPlan(id: string, plan: AuditPlanMeta): Promise<void> {
  const { error } = await supabase.from("app_data").upsert({ key: planKey(id), value: plan as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(`storage:audit-plan:${id}`));
}

export async function updateAuditPlan(id: string, updater: (prev: AuditPlanMeta) => AuditPlanMeta) {
  const prev = await readAuditPlan(id);
  const next = updater(prev);
  await writeAuditPlan(id, next);
  return next;
}

export function useAuditPlan(id: string | undefined): AuditPlanMeta {
  const [plan, setPlan] = useState<AuditPlanMeta>(emptyAuditPlan());
  const channelName = useRef(`audit-plan:${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      const p = await readAuditPlan(id);
      if (!cancelled) setPlan(p);
    };
    void load();
    const handler = () => { void load(); };
    window.addEventListener(`storage:audit-plan:${id}`, handler);
    const channel = supabase
      .channel(channelName.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data", filter: `key=eq.${planKey(id)}` }, () => { void load(); })
      .subscribe();
    return () => {
      cancelled = true;
      window.removeEventListener(`storage:audit-plan:${id}`, handler);
      supabase.removeChannel(channel);
    };
  }, [id]);
  return plan;
}
