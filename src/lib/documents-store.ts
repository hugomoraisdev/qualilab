// Store de documentos — Fase 2B (tabela dedicada).
import { createTableStore } from "./table-store";

export interface DocumentRow {
  id: string;
  code: string;
  title: string;
  category: string;
  version: string;
  status: string;
  validity: string | null;
  responsible: string | null;
  responsible_id?: string | null;
  file_url?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export const documentsStore = createTableStore<DocumentRow>("documents", "code", true, (doc) => ({
  id: doc.id,
  code: doc.code,
  title: doc.title,
  category: doc.category,
  version: doc.version,
  status: doc.status,
  validity: doc.validity,
  responsible_id: doc.responsible_id ?? null,
  file_url: doc.file_url ?? null,
  description: doc.description ?? null,
  created_at: doc.created_at,
  updated_at: doc.updated_at,
  deleted_at: doc.deleted_at ?? null,
}));

export const listDocuments = () => documentsStore.list();
export const getDocument = (id: string) => documentsStore.list().find((d) => d.id === id);
export const saveDocument = (doc: DocumentRow) => documentsStore.upsert(doc);
export const deleteDocument = (id: string) => documentsStore.remove(id);
