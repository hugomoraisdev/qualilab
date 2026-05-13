// Store de fornecedores — Fase 2B (tabela dedicada).
import { createTableStore } from "./table-store";

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
