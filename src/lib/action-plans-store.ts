// Store de planos de ação — Fase 2B (tabela dedicada).
import { createTableStore } from "./table-store";

export interface ActionPlanRow {
  id: string;
  code: string | null;
  origin_type: string;
  origin_id: string | null;
  description: string;
  responsible_id: string | null;
  deadline: string | null;
  priority: string;
  status: string;
  progress: number;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export const actionPlansStore = createTableStore<ActionPlanRow>("action_plans", "deadline", true);

export const listActionPlans = () => actionPlansStore.list();
export const getActionPlan = (id: string) => actionPlansStore.list().find((a) => a.id === id);
export const saveActionPlan = (a: ActionPlanRow) => actionPlansStore.upsert(a);
export const deleteActionPlan = (id: string) => actionPlansStore.remove(id);

export const ORIGIN_TYPE_LABEL: Record<string, string> = {
  occurrence: "Ocorrência",
  audit: "Auditoria",
  audit_finding: "Achado de auditoria",
  risk: "Risco",
  supplier: "Fornecedor",
  calibration: "Calibração",
  meeting: "Reunião",
  manual: "Manual",
  indicator: "Indicador",
  sac: "Atendimento ao cliente",
};
