import { createTableStore } from "./table-store";
import { logAuditAction } from "./audit-log-store";

export type RootCauseTool = "5_whys" | "ishikawa" | "5w2h" | "brainstorm";

export interface FiveWhysData {
  whys: string[];
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
export interface FiveW2HData {
  what: string;
  why: string;
  where: string;
  when: string;
  who: string;
  how: string;
  howMuch: string;
}
export interface BrainstormData {
  ideas: string[];
  selected: string;
}
export type RootCauseData = FiveWhysData | IshikawaData | FiveW2HData | BrainstormData;

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

export const saveOccurrence = async (o: OccurrenceRow) => {
  const result = await occurrencesStore.upsert(o);
  void logAuditAction({ module: "Ocorrências", action: "Salvou", record_id: o.id, record_label: o.description });
  return result;
};

export const deleteOccurrence = async (id: string) => {
  const o = occurrencesStore.list().find((x) => x.id === id);
  const result = await occurrencesStore.remove(id);
  void logAuditAction({ module: "Ocorrências", action: "Excluiu", record_id: id, record_label: o?.description });
  return result;
};
