// Store de ocorrências / NCs — Fase 2B (tabela dedicada).
import { createTableStore } from "./table-store";

export interface OccurrenceRow {
  id: string;
  type: string;
  origin: string;
  description: string;
  date: string | null;
  responsible: string | null;
  severity: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export const occurrencesStore = createTableStore<OccurrenceRow>("occurrences", "id", true);

export const listOccurrences = () => occurrencesStore.list();
export const getOccurrence = (id: string) => occurrencesStore.list().find((o) => o.id === id);
export const saveOccurrence = (o: OccurrenceRow) => occurrencesStore.upsert(o);
export const deleteOccurrence = (id: string) => occurrencesStore.remove(id);
