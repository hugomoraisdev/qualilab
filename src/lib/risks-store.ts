// Store de riscos — alinhado ao schema do banco.
// `level` e `classification` são calculados no servidor (generated/trigger).
import { createTableStore } from "./table-store";

export interface RiskRow {
  id: string;
  code: string | null;
  process: string;
  description: string;
  cause: string | null;
  consequence: string | null;
  probability: number;
  impact: number;
  level: number | null;
  classification: string | null;
  responsible_id: string | null;
  status: string;
  treatment: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export const risksStore = createTableStore<RiskRow>("risks", "id", true);

export const listRisks = () => risksStore.list();
export const getRisk = (id: string) => risksStore.list().find((r) => r.id === id);
/** Para upsert basta enviar id/process/description/probability/impact/etc — `level` e `classification` são derivados no servidor. */
export const saveRisk = (
  r: Omit<RiskRow, "level" | "classification"> & Partial<Pick<RiskRow, "level" | "classification">>,
) => risksStore.upsert(r as RiskRow);
export const deleteRisk = (id: string) => risksStore.remove(id);

export const RISK_STATUS_OPTIONS = [
  { value: "identificado", label: "Identificado" },
  { value: "em_tratamento", label: "Em tratamento" },
  { value: "mitigado", label: "Mitigado" },
  { value: "aceito", label: "Aceito" },
  { value: "transferido", label: "Transferido" },
  { value: "encerrado", label: "Encerrado" },
] as const;

export const statusLabel = (s: string) =>
  RISK_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;

export function classifyScore(score: number): { label: string; tone: "success" | "warning" | "danger" } {
  if (score >= 15) return { label: "Crítico", tone: "danger" };
  if (score >= 10) return { label: "Alto", tone: "danger" };
  if (score >= 6) return { label: "Médio", tone: "warning" };
  return { label: "Baixo", tone: "success" };
}
