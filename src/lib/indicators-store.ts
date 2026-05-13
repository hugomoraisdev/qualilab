// Indicadores e resultados — Fase 2B (tabelas dedicadas).
import { createTableStore } from "./table-store";

export type IndicatorDirection = "maior" | "menor";
export type IndicatorFrequency = "mensal" | "trimestral" | "anual";

export interface IndicatorRow {
  id: string;
  code: string | null;
  name: string;
  area: string | null;
  frequency: IndicatorFrequency;
  target: number;
  direction: IndicatorDirection;
  unit: string;
  responsible_id: string | null;
  notes: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IndicatorResultRow {
  id: string;
  indicator_id: string;
  period: string;
  value: number;
  status: string | null;
  notes: string | null;
  created_at?: string;
}

export const indicatorsStore = createTableStore<IndicatorRow>("indicators", "created_at", false);
export const indicatorResultsStore = createTableStore<IndicatorResultRow>("indicator_results", "period", true);

export const listIndicators = () => indicatorsStore.list();
export const getIndicator = (id: string) => indicatorsStore.list().find((i) => i.id === id);
export const saveIndicator = (i: IndicatorRow) => indicatorsStore.upsert(i);
export const deleteIndicator = (id: string) => indicatorsStore.remove(id);

export const listResults = (indicatorId?: string) => {
  const all = indicatorResultsStore.list();
  return indicatorId ? all.filter((r) => r.indicator_id === indicatorId) : all;
};
export const saveResult = (r: IndicatorResultRow) => indicatorResultsStore.upsert(r);
export const deleteResult = (id: string) => indicatorResultsStore.remove(id);

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
