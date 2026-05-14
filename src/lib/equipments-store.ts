// Store de equipamentos — Fase 2B (tabela dedicada).
import { createTableStore } from "./table-store";

export interface EquipmentRow {
  id: string;
  code: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  location: string | null;
  category: string | null;
  status: string;
  acquisition_date: string | null;
  responsible_id: string | null;
  next_calibration_date: string | null;
  notes: string | null;
  notification_recipients?: string[] | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const equipmentsStore = createTableStore<EquipmentRow>("equipments", "code", true);

export const listEquipments = () => equipmentsStore.list();
export const getEquipment = (id: string) => equipmentsStore.list().find((e) => e.id === id);
export const getEquipmentByCode = (code: string) =>
  equipmentsStore.list().find((e) => e.code === code);
export const saveEquipment = (e: EquipmentRow) => equipmentsStore.upsert(e);
export const deleteEquipment = (id: string) => equipmentsStore.remove(id);
