// Store de calibrações com múltiplos pontos por equipamento (POC).
// Persistido em localStorage. Cada calibração possui N pontos individuais.

export interface CalibrationPoint {
  id: string;
  label: string;          // ex: "0% da escala"
  nominal: number;        // valor de referência
  measured: number;       // valor encontrado
  uncertainty: number;    // incerteza
  maxError: number;       // limite máximo permitido
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

function read(): CalibrationRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(all: CalibrationRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event(`storage:${KEY}`));
}

export function listCalibrations(): CalibrationRecord[] { return read(); }
export function saveCalibration(rec: CalibrationRecord) {
  const all = read().filter((r) => r.id !== rec.id);
  all.unshift(rec);
  write(all);
}
export function deleteCalibration(id: string) {
  write(read().filter((r) => r.id !== id));
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
