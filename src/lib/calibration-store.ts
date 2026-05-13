// Store de calibrações com múltiplos pontos por equipamento — Lovable Cloud.

import { createCloudStore } from "./cloud-store";

export interface CalibrationPoint {
  id: string;
  label: string;
  nominal: number;
  measured: number;
  uncertainty: number;
  maxError: number;
  unit: string;
}

export interface CalibrationRecord {
  id: string;
  equipmentCode: string;
  equipmentName: string;
  date: string;
  validity: string;
  lab: string;
  certificate: string;
  responsible: string;
  points: CalibrationPoint[];
  createdAt: string;
}

const KEY = "qualilab_calibrations_v2";
const store = createCloudStore<CalibrationRecord[]>(KEY, []);

export function listCalibrations(): CalibrationRecord[] { return store.get(); }
export function saveCalibration(rec: CalibrationRecord) {
  const all = store.get().filter((r) => r.id !== rec.id);
  all.unshift(rec);
  void store.set(all);
}
export function deleteCalibration(id: string) {
  void store.set(store.get().filter((r) => r.id !== id));
}

export function evaluatePoint(p: CalibrationPoint) {
  const error = p.measured - p.nominal;
  const total = Math.abs(error) + Math.abs(p.uncertainty);
  const approved = total <= p.maxError;
  return { error, total, approved };
}

export function evaluateRecord(rec: CalibrationRecord): "Aprovada" | "Reprovada" | "Sem pontos" {
  if (!rec.points.length) return "Sem pontos";
  return rec.points.every((p) => evaluatePoint(p).approved) ? "Aprovada" : "Reprovada";
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
