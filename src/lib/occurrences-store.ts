// Store de ocorrências / NCs — Fase 2B (tabela dedicada).
import { createTableStore } from "./table-store";

export type RootCauseTool = "5_whys" | "ishikawa" | "brainstorm";

/** Estruturas serializadas em occurrences.root_cause_data (jsonb). */
export interface FiveWhysData {
  whys: string[]; // 5 strings
  rootCause: string;
}
export interface IshikawaData {
  effect?: string;
  causes: {
    machine: string[];
    method: string[];
    material: string[];
    manpower: string[];
    environment: string[];
    measurement: string[];
  };
}
export interface BrainstormData {
  ideas: string[];
  selected: string;
}
export type RootCauseData = FiveWhysData | IshikawaData | BrainstormData;

export interface OccurrenceRow {
  id: string;
  type: string;
  origin: string;
  description: string;
  date: string | null;
  responsible: string | null;
  severity: string;
  status: string;
  root_cause_tool?: RootCauseTool | null;
  root_cause_data?: RootCauseData | null;
  created_at?: string;
  updated_at?: string;
}

export const occurrencesStore = createTableStore<OccurrenceRow>("occurrences", "id", true);

export const listOccurrences = () => occurrencesStore.list();
export const getOccurrence = (id: string) => occurrencesStore.list().find((o) => o.id === id);
export const saveOccurrence = (o: OccurrenceRow) => occurrencesStore.upsert(o);
export const deleteOccurrence = (id: string) => occurrencesStore.remove(id);
