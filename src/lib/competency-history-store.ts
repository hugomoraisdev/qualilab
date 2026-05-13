// Histórico de competências — registrado automaticamente via trigger no Postgres.
import { createTableStore } from "./table-store";

export interface CompetencyHistoryRow {
  id: string;
  competency_id: string;
  user_id: string;
  action: "created" | "updated" | "deleted";
  area: string | null;
  skill: string | null;
  level: string | null;
  status: string | null;
  certified_at: string | null;
  expires_at: string | null;
  evidence: string | null;
  notes: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
}

export const competencyHistoryStore = createTableStore<CompetencyHistoryRow>(
  "competency_history",
  "changed_at",
  false,
);

export const listCompetencyHistory = (competencyId?: string) => {
  const all = competencyHistoryStore.list();
  return competencyId ? all.filter((h) => h.competency_id === competencyId) : all;
};

export const listUserHistory = (userId: string) =>
  competencyHistoryStore.list().filter((h) => h.user_id === userId);
