import { createTableStore } from "./table-store";
import { logAuditAction } from "./audit-log-store";

export interface DocumentRow {
  id: string;
  code: string;
  title: string;
  category: string;
  version: string;
  status: string;
  validity: string | null;
  responsible: string | null;
  attachment_url: string | null;
  created_at?: string;
  updated_at?: string;
}

// SQL para adicionar a coluna (executar no Supabase SQL Editor):
// ALTER TABLE documents ADD COLUMN IF NOT EXISTS attachment_url TEXT;
//
// Criar bucket público no Supabase Storage → "document-attachments"
// (Storage > New bucket > Name: document-attachments, Public: true)

export const documentsStore = createTableStore<DocumentRow>("documents", "code", true);

export const listDocuments = () => documentsStore.list();
export const getDocument = (id: string) => documentsStore.list().find((d) => d.id === id);

export const saveDocument = async (doc: DocumentRow) => {
  const result = await documentsStore.upsert(doc);
  void logAuditAction({ module: "Documentos", action: "Salvou", record_id: doc.id, record_label: doc.title });
  return result;
};

export const deleteDocument = async (id: string) => {
  const doc = documentsStore.list().find((d) => d.id === id);
  const result = await documentsStore.remove(id);
  void logAuditAction({ module: "Documentos", action: "Excluiu", record_id: id, record_label: doc?.title });
  return result;
};
