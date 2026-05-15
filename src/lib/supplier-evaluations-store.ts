// Avaliações periódicas de fornecedores.
import { createTableStore } from "./table-store";

export interface SupplierEvaluationRow {
  id: string;
  supplier_id: string;
  evaluation_date: string;
  score: number;
  observations: string | null;
  review_notes: string | null;
  evaluator_id: string | null;
  evaluator_name: string | null;
  created_at?: string;
  updated_at?: string;
}

export const supplierEvaluationsStore = createTableStore<SupplierEvaluationRow>(
  "supplier_evaluations",
  "evaluation_date",
  false,
);

export const listEvaluationsForSupplier = (supplierId: string) =>
  supplierEvaluationsStore
    .list()
    .filter((e) => e.supplier_id === supplierId)
    .sort((a, b) => (a.evaluation_date < b.evaluation_date ? 1 : -1));
