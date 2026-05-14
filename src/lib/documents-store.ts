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
  file_url?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const documentsStore = createTableStore<DocumentRow>("documents", "code", true);

export const listDocuments = () => documentsStore.list();
export const getDocument = (id: string) => documentsStore.list().find((d) => d.id === id);
export const saveDocument = (doc: DocumentRow) => documentsStore.upsert(doc);
export const deleteDocument = (id: string) => documentsStore.remove(id);
