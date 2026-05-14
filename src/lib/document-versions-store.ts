// Versionamento de documentos do SGQ.
//
// Preserva snapshots completos de cada revisão anterior em `app_data`
// (chave `doc-versions:<documentId>`), permitindo consultar e baixar
// qualquer versão histórica mesmo após o documento atual ser revisado.
//
// Optei por reutilizar a tabela `app_data` (já presente no schema com
// RLS para usuários autenticados) em vez de criar uma nova tabela
// dedicada `document_versions`, mantendo o mesmo modelo de dados:
// uma coleção indexada por documento, com snapshot completo da revisão.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DocumentRow } from "./documents-store";

export interface DocumentVersion {
  id: string;                 // uuid da entrada de versão
  document_id: string;        // documento ao qual pertence
  version: string;            // ex.: "1.0", "1.1", "2.0"
  archived_at: string;        // ISO — quando virou versão antiga
  archived_by: string | null; // user id
  archived_by_name: string | null;
  reason: string | null;      // motivo da revisão
  status: string;             // status da revisão no momento do arquivamento
  file_url: string | null;    // arquivo PDF daquela versão
  file_name: string | null;   // nome amigável (ex.: PR-001-v1.0.pdf)
  snapshot: DocumentRow;      // foto completa do documento naquele momento
}

const keyFor = (documentId: string) => `doc-versions:${documentId}`;

async function readVersions(documentId: string): Promise<DocumentVersion[]> {
  const { data, error } = await supabase
    .from("app_data")
    .select("value")
    .eq("key", keyFor(documentId))
    .maybeSingle();
  if (error) {
    console.warn("[document-versions] read:", error.message);
    return [];
  }
  return ((data?.value as DocumentVersion[] | null) ?? []).slice().sort(
    (a, b) => (b.archived_at ?? "").localeCompare(a.archived_at ?? ""),
  );
}

async function writeVersions(documentId: string, versions: DocumentVersion[]): Promise<void> {
  const { error } = await supabase
    .from("app_data")
    .upsert({ key: keyFor(documentId), value: versions as never });
  if (error) {
    console.error("[document-versions] write:", error.message);
    throw error;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(`storage:doc-versions:${documentId}`));
  }
}

export async function listDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  return readVersions(documentId);
}

/**
 * Arquiva o documento atual como uma nova entrada em `document_versions`,
 * preservando todos os campos e o arquivo da revisão anterior.
 */
export async function archiveDocumentVersion(params: {
  current: DocumentRow;
  reason: string | null;
  archivedBy: string | null;
  archivedByName: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
}): Promise<DocumentVersion> {
  const { current, reason, archivedBy, archivedByName, fileUrl, fileName } = params;
  const entry: DocumentVersion = {
    id: crypto.randomUUID(),
    document_id: current.id,
    version: current.version,
    archived_at: new Date().toISOString(),
    archived_by: archivedBy,
    archived_by_name: archivedByName,
    reason,
    status: current.status,
    file_url: fileUrl ?? null,
    file_name: fileName ?? `${current.code}-v${current.version}.pdf`,
    snapshot: { ...current },
  };
  const existing = await readVersions(current.id);
  await writeVersions(current.id, [entry, ...existing]);
  return entry;
}

/** Hook React reativo — re-busca quando há mudanças. */
export function useDocumentVersions(documentId: string | undefined): DocumentVersion[] {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    const refresh = async () => {
      const v = await readVersions(documentId);
      if (!cancelled) setVersions(v);
    };
    void refresh();

    const handler = () => { void refresh(); };
    window.addEventListener(`storage:doc-versions:${documentId}`, handler);

    const channel = supabase
      .channel(`doc-versions:${documentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_data", filter: `key=eq.${keyFor(documentId)}` },
        () => { void refresh(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener(`storage:doc-versions:${documentId}`, handler);
      supabase.removeChannel(channel);
    };
  }, [documentId]);

  return versions;
}
