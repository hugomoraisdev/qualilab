// Store de calibrações — Fase 2B (tabela dedicada).
// Mantém as helpers de avaliação (multipontos) usadas pelo formulário existente.

import { createTableStore } from "./table-store";

export interface CalibrationPoint {
  id: string;
  label: string;
  nominal: number;
  measured: number;
  uncertainty: number;
  maxError: number;
  unit: string;
}

export interface CalibrationRow {
  id: string;
  equipment_id: string;
  certificate_number: string | null;
  provider: string | null;
  performed_at: string;
  next_due_date: string | null;
  result: string;
  uncertainty: string | null;
  points: CalibrationPoint[];
  certificate_url: string | null;
  notes: string | null;
  responsible_id: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const calibrationsStore = createTableStore<CalibrationRow>(
  "calibrations",
  "performed_at",
  false,
);

export const listCalibrations = () => calibrationsStore.list();
export const getCalibration = (id: string) =>
  calibrationsStore.list().find((c) => c.id === id);
export const saveCalibration = (c: CalibrationRow) => calibrationsStore.upsert(c);
export const deleteCalibration = (id: string) => calibrationsStore.remove(id);

export function evaluatePoint(p: CalibrationPoint) {
  const error = p.measured - p.nominal;
  const total = Math.abs(error) + Math.abs(p.uncertainty);
  const approved = total <= p.maxError;
  return { error, total, approved };
}

export function evaluateRecord(rec: { points: CalibrationPoint[] }):
  | "Aprovada"
  | "Reprovada"
  | "Sem pontos" {
  if (!rec.points.length) return "Sem pontos";
  return rec.points.every((p) => evaluatePoint(p).approved) ? "Aprovada" : "Reprovada";
}

export function newCalibrationId() {
  return crypto.randomUUID();
}
