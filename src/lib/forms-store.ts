// Formulários personalizados e respostas — Fase 2B (tabelas dedicadas).
import { createTableStore } from "./table-store";

export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "checkbox" | "radio";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface FormRow {
  id: string;
  title: string;
  description: string | null;
  responsible_id: string | null;
  fields: FormField[];
  requires_approval: boolean;
  approvers: string[];
  status: string;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FormResponseRow {
  id: string;
  form_id: string;
  values: Record<string, any>;
  submitted_by: string | null;
  submitted_by_name: string | null;
  submitted_at: string;
  approval_status: "n/a" | "pending" | "approved" | "rejected";
  approver_id: string | null;
  approved_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export const formsStore = createTableStore<FormRow>("forms", "created_at", false);
export const responsesStore = createTableStore<FormResponseRow>("form_responses", "submitted_at", false);

export const listForms = () => formsStore.list();
export const getForm = (id: string) => formsStore.list().find((f) => f.id === id);
export const saveForm = (f: FormRow) => formsStore.upsert(f);
export const deleteForm = (id: string) => formsStore.remove(id);

export const listResponses = (formId?: string) => {
  const all = responsesStore.list();
  return formId ? all.filter((r) => r.form_id === formId) : all;
};
export const saveResponse = (r: FormResponseRow) => responsesStore.upsert(r);
export const updateResponse = (id: string, patch: Partial<FormResponseRow>) => {
  const cur = responsesStore.list().find((r) => r.id === id);
  if (!cur) return;
  responsesStore.upsert({ ...cur, ...patch });
};

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
