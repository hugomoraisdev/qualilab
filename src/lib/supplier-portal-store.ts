// Submissões públicas de documentos de fornecedores (portal /suppliers/portal).
import { supabase } from "@/integrations/supabase/client";
import { createTableStore } from "./table-store";

export type SubmissionStatus = "recebido" | "em_analise" | "aprovado" | "reprovado";

export interface SupplierPortalSubmissionRow {
  id: string;
  protocol: string;
  supplier_code: string;
  supplier_name: string | null;
  contact_email: string | null;
  document_type: string;
  description: string | null;
  file_url: string | null;
  status: SubmissionStatus;
  origin: "portal" | "interno";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  linked_supplier_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export const supplierPortalStore = createTableStore<SupplierPortalSubmissionRow>(
  "supplier_portal_submissions",
  "created_at",
  false,
);

export const listSubmissions = () => supplierPortalStore.list();
export const listSubmissionsByCode = (code: string) =>
  supplierPortalStore.list().filter((s) => s.supplier_code?.trim().toLowerCase() === code.trim().toLowerCase());

export const countPendingSubmissions = () =>
  supplierPortalStore.list().filter((s) => s.status === "recebido").length;

export async function nextSubmissionProtocol(): Promise<string> {
  const { data, error } = await (supabase as any).rpc("next_supplier_doc_protocol");
  if (error || !data) {
    const yr = new Date().getFullYear();
    const cnt = listSubmissions().filter((t) => t.protocol?.includes(String(yr))).length + 1;
    return `DOC-${yr}-${String(cnt).padStart(3, "0")}`;
  }
  return data as string;
}

export const DOCUMENT_TYPES = [
  "Certidão",
  "Certificado",
  "Apólice",
  "Ficha técnica",
  "Outro",
] as const;

export function statusLabel(s: SubmissionStatus): string {
  switch (s) {
    case "recebido": return "Recebido";
    case "em_analise": return "Em análise";
    case "aprovado": return "Aprovado";
    case "reprovado": return "Reprovado";
  }
}

export function statusTone(s: SubmissionStatus): "muted" | "warning" | "success" | "destructive" {
  switch (s) {
    case "recebido": return "warning";
    case "em_analise": return "muted";
    case "aprovado": return "success";
    case "reprovado": return "destructive";
  }
}
