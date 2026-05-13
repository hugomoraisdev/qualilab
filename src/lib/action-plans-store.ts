// Store de planos de ação — Fase 2B (tabela dedicada).
import { createTableStore } from "./table-store";

export interface ActionPlanRow {
  id: string;
  origin: string | null;
  description: string;
  responsible: string | null;
  deadline: string | null;
  priority: string;
  status: string;
  progress: number;
  created_at?: string;
  updated_at?: string;
}

export const actionPlansStore = createTableStore<ActionPlanRow>("action_plans", "deadline", true);

export const listActionPlans = () => actionPlansStore.list();
export const getActionPlan = (id: string) => actionPlansStore.list().find((a) => a.id === id);
export const saveActionPlan = (a: ActionPlanRow) => actionPlansStore.upsert(a);
export const deleteActionPlan = (id: string) => actionPlansStore.remove(id);
