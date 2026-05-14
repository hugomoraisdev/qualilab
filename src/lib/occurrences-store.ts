// Store de ocorrências / NCs — Fase 2B (tabela dedicada).
// Inclui colunas reais da tabela `occurrences` no banco. Campos extras
// (deadline, vínculos a risco/fornecedor, anexos, 5W2H, eficácia, histórico
// e campos personalizados) ficam em `app_data` via `occurrence-meta-store`.
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
  code: string | null;
  type: string;
  origin: string;
  description: string;
  occurred_at: string;
  responsible_id: string | null;
  severity: string;
  status: string;
  immediate_action: string | null;
  root_cause: string | null;
  root_cause_tool?: RootCauseTool | null;
  root_cause_data?: RootCauseData | null;
  linked_audit_id: string | null;
  linked_document_id: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const occurrencesStore = createTableStore<OccurrenceRow>("occurrences", "occurred_at", false);

export const listOccurrences = () => occurrencesStore.list();
export const getOccurrence = (id: string) => occurrencesStore.list().find((o) => o.id === id);
export const saveOccurrence = (o: OccurrenceRow) => occurrencesStore.upsert(o);
export const deleteOccurrence = (id: string) => occurrencesStore.remove(id);

export const SEVERITY_OPTIONS = ["baixa", "media", "alta", "critica"];
export const STATUS_OPTIONS = ["aberta", "em_analise", "em_tratamento", "concluida", "cancelada"];
export const TYPE_OPTIONS = ["nao_conformidade", "reclamacao", "desvio", "oportunidade_melhoria", "incidente"];
export const ORIGIN_OPTIONS = ["interno", "cliente", "fornecedor", "auditoria_interna", "auditoria_externa", "processo", "outro"];

export const typeLabel = (t: string) => ({
  nao_conformidade: "Não conformidade",
  reclamacao: "Reclamação",
  desvio: "Desvio",
  oportunidade_melhoria: "Oportunidade de melhoria",
  incidente: "Incidente",
}[t] ?? t);

export const statusLabel = (s: string) => ({
  aberta: "Aberta",
  em_analise: "Em análise",
  em_tratamento: "Em tratamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
}[s] ?? s);

export const originLabel = (o: string) => ({
  interno: "Interno",
  cliente: "Cliente",
  fornecedor: "Fornecedor",
  auditoria_interna: "Auditoria interna",
  auditoria_externa: "Auditoria externa",
  processo: "Processo",
  outro: "Outro",
}[o] ?? o);
