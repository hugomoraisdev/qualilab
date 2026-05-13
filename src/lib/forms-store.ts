// Formulários personalizados e respostas com aprovação — Lovable Cloud.

import { createCloudStore } from "./cloud-store";

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

const formsStore = createCloudStore<CustomForm[]>(KEY_FORMS, []);
const responsesStore = createCloudStore<FormResponse[]>(KEY_RESPONSES, []);

export function listForms(): CustomForm[] {
  return formsStore.get();
}

export function getForm(id: string): CustomForm | undefined {
  return formsStore.get().find((f) => f.id === id);
}

export function saveForm(form: CustomForm) {
  const all = formsStore.get().filter((f) => f.id !== form.id);
  all.unshift(form);
  void formsStore.set(all);
}

export function deleteForm(id: string) {
  void formsStore.set(formsStore.get().filter((f) => f.id !== id));
}

export function listResponses(formId?: string): FormResponse[] {
  const all = responsesStore.get();
  return formId ? all.filter((r) => r.formId === formId) : all;
}

export function saveResponse(resp: FormResponse) {
  const all = [resp, ...responsesStore.get()];
  void responsesStore.set(all);
}

export function updateResponse(id: string, patch: Partial<FormResponse>) {
  const all = responsesStore.get().map((r) => (r.id === id ? { ...r, ...patch } : r));
  void responsesStore.set(all);
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
