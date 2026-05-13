// Store de fornecedores — Fase 2B (tabela dedicada).
import { createTableStore } from "./table-store";

export type EvaluationStatus = "em_dia" | "a_vencer" | "vencida" | "sem_avaliacao";

export interface SupplierRow {
  id: string;
  code: string | null;
  name: string;
  cnpj: string | null;
  category: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  rating: number | null;
  status: string;
  qualified_until: string | null;
  notes: string | null;
  evaluation_frequency_days: number | null;
  last_evaluation_date: string | null;
  next_evaluation_date: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const suppliersStore = createTableStore<SupplierRow>("suppliers", "name", true);

export const listSuppliers = () => suppliersStore.list();
export const getSupplier = (id: string) => suppliersStore.list().find((s) => s.id === id);
export const saveSupplier = (s: SupplierRow) => suppliersStore.upsert(s);
export const deleteSupplier = (id: string) => suppliersStore.remove(id);

export function ratingToClassification(rating: number | null | undefined): string {
  const r = rating ?? 0;
  if (r >= 8) return "Aprovado";
  if (r >= 5) return "Aprovado com restrição";
  if (r > 0) return "Reprovado";
  return "Não avaliado";
}

/** Calcula o status da avaliação baseado em next_evaluation_date. */
export function getEvaluationStatus(s: Pick<SupplierRow, "next_evaluation_date">): EvaluationStatus {
  if (!s.next_evaluation_date) return "sem_avaliacao";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(s.next_evaluation_date + "T00:00:00");
  const diffDays = Math.floor((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "vencida";
  if (diffDays <= 30) return "a_vencer";
  return "em_dia";
}

export function evaluationStatusLabel(s: EvaluationStatus): string {
  switch (s) {
    case "em_dia": return "Em dia";
    case "a_vencer": return "A vencer";
    case "vencida": return "Vencida";
    default: return "Sem avaliação";
  }
}

export const FREQUENCY_OPTIONS: { label: string; days: number }[] = [
  { label: "Mensal", days: 30 },
  { label: "Trimestral", days: 90 },
  { label: "Semestral", days: 180 },
  { label: "Anual", days: 365 },
];

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
