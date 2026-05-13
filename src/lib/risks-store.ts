// Store de riscos — Fase 2B (tabela dedicada).
// `level` e `classification` são calculados no banco (generated column + trigger).
import { createTableStore } from "./table-store";

export interface RiskRow {
  id: string;
  process: string;
  description: string;
  cause: string | null;
  consequence: string | null;
  probability: number;
  impact: number;
  level: number;
  classification: string;
  responsible: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export const risksStore = createTableStore<RiskRow>("risks", "id", true);

export const listRisks = () => risksStore.list();
export const getRisk = (id: string) => risksStore.list().find((r) => r.id === id);
/** Para upsert basta enviar id/process/description/probability/impact/etc — `level` e `classification` são derivados no servidor. */
export const saveRisk = (r: Omit<RiskRow, "level" | "classification"> & Partial<Pick<RiskRow, "level" | "classification">>) =>
  risksStore.upsert(r as RiskRow);
export const deleteRisk = (id: string) => risksStore.remove(id);
