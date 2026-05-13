// Store de competências — Fase 2B (tabela dedicada).
import { createTableStore } from "./table-store";

export interface CompetencyRow {
  id: string;
  user_id: string;
  area: string;
  skill: string;
  level: string;
  evidence: string | null;
  certified_at: string | null;
  expires_at: string | null;
  status: string;
  notes: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const competenciesStore = createTableStore<CompetencyRow>("competencies", "area", true);

export const listCompetencies = () => competenciesStore.list();
export const getCompetency = (id: string) => competenciesStore.list().find((c) => c.id === id);
export const saveCompetency = (c: CompetencyRow) => competenciesStore.upsert(c);
export const deleteCompetency = (id: string) => competenciesStore.remove(id);
