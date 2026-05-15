// Metadados estendidos por documento — workflow de aprovação, comentários,
// log de acesso, lista de distribuição (cópias controladas), pasta/setor/processo
// e campos personalizáveis.
//
// Persistido em `app_data` (chave `doc-meta:<documentId>`), reaproveitando a
// mesma tabela usada pelo controle de versões. Cada documento possui um único
// blob JSON contendo todos os metadados estendidos.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Stage = "elaboracao" | "revisao" | "aprovacao" | "aprovado" | "obsoleto";

export interface StageAssignment {
  user_id: string | null;
  user_name: string | null;
  deadline: string | null;       // ISO date
  signed_at: string | null;      // ISO timestamp
  signed_by_name: string | null;
}

export interface DocumentWorkflow {
  stage: Stage;
  elaboration: StageAssignment;
  review: StageAssignment;
  approval: StageAssignment;
}

export interface DocumentComment {
  id: string;
  author_id: string | null;
  author_name: string;
  text: string;
  stage: Stage;
  created_at: string;
}

export interface DocumentAccessEntry {
  id: string;
  user_id: string | null;
  user_name: string;
  action: "view" | "download" | "read" | "print";
  version: string;
  at: string;
}

export interface DistributionCopy {
  id: string;
  recipient: string;
  copy_number: string;
  sent_at: string;
  returned_at: string | null;
  status: "ativa" | "devolvida" | "obsoleta";
  notes: string | null;
}

export interface DocumentMeta {
  workflow: DocumentWorkflow;
  comments: DocumentComment[];
  access_log: DocumentAccessEntry[];
  distribution: DistributionCopy[];
  folder: string | null;
  sector: string | null;
  process: string | null;
  custom_fields: Record<string, string>;
  obsolete: boolean;
}

const emptyAssignment = (): StageAssignment => ({
  user_id: null, user_name: null, deadline: null, signed_at: null, signed_by_name: null,
});

export const emptyMeta = (): DocumentMeta => ({
  workflow: {
    stage: "elaboracao",
    elaboration: emptyAssignment(),
    review: emptyAssignment(),
    approval: emptyAssignment(),
  },
  comments: [],
  access_log: [],
  distribution: [],
  folder: null,
  sector: null,
  process: null,
  custom_fields: {},
  obsolete: false,
});

const keyFor = (id: string) => `doc-meta:${id}`;

async function readMeta(documentId: string): Promise<DocumentMeta> {
  const { data, error } = await supabase
    .from("app_data")
    .select("value")
    .eq("key", keyFor(documentId))
    .maybeSingle();
  if (error) {
    console.warn("[doc-meta] read:", error.message);
    return emptyMeta();
  }
  if (!data) return emptyMeta();
  // mescla com defaults para tolerar registros parciais antigos
  return { ...emptyMeta(), ...(data.value as Partial<DocumentMeta>) } as DocumentMeta;
}

async function writeMeta(documentId: string, meta: DocumentMeta): Promise<void> {
  const { error } = await supabase
    .from("app_data")
    .upsert({ key: keyFor(documentId), value: meta as never });
  if (error) {
    console.error("[doc-meta] write:", error.message);
    throw error;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(`storage:doc-meta:${documentId}`));
  }
}

export async function getDocumentMeta(documentId: string): Promise<DocumentMeta> {
  return readMeta(documentId);
}

export async function updateDocumentMeta(
  documentId: string,
  updater: (prev: DocumentMeta) => DocumentMeta,
): Promise<DocumentMeta> {
  const prev = await readMeta(documentId);
  const next = updater(prev);
  await writeMeta(documentId, next);
  return next;
}

export async function logDocumentAccess(params: {
  documentId: string;
  userId: string | null;
  userName: string;
  action: DocumentAccessEntry["action"];
  version: string;
}): Promise<void> {
  await updateDocumentMeta(params.documentId, (prev) => ({
    ...prev,
    access_log: [
      {
        id: crypto.randomUUID(),
        user_id: params.userId,
        user_name: params.userName,
        action: params.action,
        version: params.version,
        at: new Date().toISOString(),
      },
      ...prev.access_log,
    ].slice(0, 500),
  }));
}

export async function addDocumentComment(params: {
  documentId: string;
  authorId: string | null;
  authorName: string;
  text: string;
  stage: Stage;
}): Promise<void> {
  await updateDocumentMeta(params.documentId, (prev) => ({
    ...prev,
    comments: [
      ...prev.comments,
      {
        id: crypto.randomUUID(),
        author_id: params.authorId,
        author_name: params.authorName,
        text: params.text,
        stage: params.stage,
        created_at: new Date().toISOString(),
      },
    ],
  }));
}

export async function setStageAssignment(
  documentId: string,
  stage: "elaboration" | "review" | "approval",
  patch: Partial<StageAssignment>,
): Promise<void> {
  await updateDocumentMeta(documentId, (prev) => ({
    ...prev,
    workflow: { ...prev.workflow, [stage]: { ...prev.workflow[stage], ...patch } },
  }));
}

export async function signStage(
  documentId: string,
  stage: "elaboration" | "review" | "approval",
  signedByName: string,
): Promise<void> {
  await updateDocumentMeta(documentId, (prev) => {
    const updated = {
      ...prev.workflow[stage],
      signed_at: new Date().toISOString(),
      signed_by_name: signedByName,
    };
    const wf = { ...prev.workflow, [stage]: updated };
    // avança automaticamente
    if (stage === "elaboration" && prev.workflow.stage === "elaboracao") wf.stage = "revisao";
    else if (stage === "review" && prev.workflow.stage === "revisao") wf.stage = "aprovacao";
    else if (stage === "approval" && prev.workflow.stage === "aprovacao") wf.stage = "aprovado";
    return { ...prev, workflow: wf };
  });
}

export async function addDistributionCopy(
  documentId: string,
  entry: Omit<DistributionCopy, "id">,
): Promise<void> {
  await updateDocumentMeta(documentId, (prev) => ({
    ...prev,
    distribution: [...prev.distribution, { ...entry, id: crypto.randomUUID() }],
  }));
}

export async function setDocumentObsolete(documentId: string, obsolete: boolean): Promise<void> {
  await updateDocumentMeta(documentId, (prev) => ({
    ...prev,
    obsolete,
    workflow: obsolete ? { ...prev.workflow, stage: "obsoleto" } : prev.workflow,
  }));
}

export async function setDocumentTaxonomy(
  documentId: string,
  patch: { folder?: string | null; sector?: string | null; process?: string | null },
): Promise<void> {
  await updateDocumentMeta(documentId, (prev) => ({ ...prev, ...patch }));
}

export async function setCustomField(
  documentId: string,
  key: string,
  value: string,
): Promise<void> {
  await updateDocumentMeta(documentId, (prev) => ({
    ...prev,
    custom_fields: { ...prev.custom_fields, [key]: value },
  }));
}

export async function removeCustomField(documentId: string, key: string): Promise<void> {
  await updateDocumentMeta(documentId, (prev) => {
    const cf = { ...prev.custom_fields };
    delete cf[key];
    return { ...prev, custom_fields: cf };
  });
}

/** Hook reativo. */
export function useDocumentMeta(documentId: string | undefined): DocumentMeta {
  const [meta, setMeta] = useState<DocumentMeta>(emptyMeta);

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    const refresh = async () => {
      const m = await readMeta(documentId);
      if (!cancelled) setMeta(m);
    };
    void refresh();

    const handler = () => { void refresh(); };
    window.addEventListener(`storage:doc-meta:${documentId}`, handler);
    const channel = supabase
      .channel(`doc-meta:${documentId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_data", filter: `key=eq.${keyFor(documentId)}` },
        () => { void refresh(); },
      )
      .subscribe();
    return () => {
      cancelled = true;
      window.removeEventListener(`storage:doc-meta:${documentId}`, handler);
      supabase.removeChannel(channel);
    };
  }, [documentId]);

  return meta;
}

/** Hook agregador para listar metadados de muitos documentos (usado em alertas / lista mestra). */
export function useAllDocumentMeta(documentIds: string[]): Record<string, DocumentMeta> {
  const [map, setMap] = useState<Record<string, DocumentMeta>>({});

  useEffect(() => {
    if (documentIds.length === 0) {
      setMap({});
      return;
    }
    let cancelled = false;
    const keys = documentIds.map(keyFor);
    const load = async () => {
      const { data, error } = await supabase
        .from("app_data")
        .select("key,value")
        .in("key", keys);
      if (cancelled) return;
      if (error) {
        console.warn("[doc-meta] bulk:", error.message);
        return;
      }
      const out: Record<string, DocumentMeta> = {};
      for (const id of documentIds) {
        const row = data?.find((r) => r.key === keyFor(id));
        out[id] = row ? { ...emptyMeta(), ...(row.value as Partial<DocumentMeta>) } : emptyMeta();
      }
      setMap(out);
    };
    void load();
    const onChange = () => { void load(); };
    documentIds.forEach((id) => window.addEventListener(`storage:doc-meta:${id}`, onChange));
    return () => {
      cancelled = true;
      documentIds.forEach((id) => window.removeEventListener(`storage:doc-meta:${id}`, onChange));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentIds.join("|")]);

  return map;
}

export const stageLabel: Record<Stage, string> = {
  elaboracao: "Elaboração",
  revisao: "Revisão",
  aprovacao: "Aprovação",
  aprovado: "Aprovado",
  obsoleto: "Obsoleto",
};
