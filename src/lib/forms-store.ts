// Store em memória + localStorage para a POC — suporta criação de formulários
// pelo usuário e respostas com fluxo de aprovação.

export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "checkbox" | "radio";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface FormResponse {
  id: string;
  formId: string;
  values: Record<string, any>;
  submittedBy: string;
  submittedAt: string;
  approvalStatus: "n/a" | "pending" | "approved" | "rejected";
  approver?: string;
  approvedAt?: string;
}

export interface CustomForm {
  id: string;
  title: string;
  description: string;
  responsible: string;
  fields: FormField[];
  requiresApproval: boolean;
  approvers: string[];
  createdAt: string;
  status: "draft" | "active";
}

const KEY_FORMS = "qualilab_custom_forms";
const KEY_RESPONSES = "qualilab_form_responses";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(`storage:${key}`));
}

export function listForms(): CustomForm[] {
  return read<CustomForm[]>(KEY_FORMS, []);
}

export function getForm(id: string): CustomForm | undefined {
  return listForms().find((f) => f.id === id);
}

export function saveForm(form: CustomForm) {
  const all = listForms().filter((f) => f.id !== form.id);
  all.unshift(form);
  write(KEY_FORMS, all);
}

export function deleteForm(id: string) {
  write(KEY_FORMS, listForms().filter((f) => f.id !== id));
}

export function listResponses(formId?: string): FormResponse[] {
  const all = read<FormResponse[]>(KEY_RESPONSES, []);
  return formId ? all.filter((r) => r.formId === formId) : all;
}

export function saveResponse(resp: FormResponse) {
  const all = listResponses();
  all.unshift(resp);
  write(KEY_RESPONSES, all);
}

export function updateResponse(id: string, patch: Partial<FormResponse>) {
  const all = listResponses().map((r) => (r.id === id ? { ...r, ...patch } : r));
  write(KEY_RESPONSES, all);
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
