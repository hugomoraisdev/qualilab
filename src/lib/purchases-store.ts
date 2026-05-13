// Store de compras — Fase 2B (tabela dedicada).
import { createTableStore } from "./table-store";

export interface PurchaseRow {
  id: string;
  code: string | null;
  supplier_id: string | null;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number | null;
  total: number | null;
  requested_at: string;
  expected_at: string | null;
  received_at: string | null;
  status: string;
  requester_id: string | null;
  notes: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const purchasesStore = createTableStore<PurchaseRow>("purchases", "requested_at", false);

export const listPurchases = () => purchasesStore.list();
export const getPurchase = (id: string) => purchasesStore.list().find((p) => p.id === id);
export const savePurchase = (p: PurchaseRow) => purchasesStore.upsert(p);
export const deletePurchase = (id: string) => purchasesStore.remove(id);
