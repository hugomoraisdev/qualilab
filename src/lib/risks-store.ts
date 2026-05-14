// Store de riscos — Fase 2B (tabela dedicada).
// `level` e `classification` são calculados no banco (generated column + trigger).
import { createTableStore } from "./table-store";
import { logAuditAction } from "./audit-log-store";

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
export const saveRisk = async (r: Omit<RiskRow, "level" | "classification"> & Partial<Pick<RiskRow, "level" | "classification">>) => {
  const result = await risksStore.upsert(r as RiskRow);
  void logAuditAction({ module: "Riscos", action: "Salvou", record_id: r.id, record_label: r.description });
  return result;
};
export const deleteRisk = async (id: string) => {
  const r = risksStore.list().find((x) => x.id === id);
  const result = await risksStore.remove(id);
  void logAuditAction({ module: "Riscos", action: "Excluiu", record_id: id, record_label: r?.description });
  return result;
};
