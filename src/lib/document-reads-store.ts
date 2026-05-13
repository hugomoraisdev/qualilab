// Confirmações de leitura — Fase 2B (tabela document_reads dedicada com Realtime).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DocumentRead {
  id?: string;
  document_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  confirmed_at: string;
}

const cache = new Map<string, DocumentRead[]>(); // key = document_id
let realtimeBound = false;

function notify(documentId: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(`storage:document_reads:${documentId}`));
  }
}

async function hydrate(documentId: string) {
  const { data, error } = await (supabase as any)
    .from("document_reads")
    .select("*")
    .eq("document_id", documentId)
    .order("confirmed_at", { ascending: false });
  if (!error) {
    cache.set(documentId, (data ?? []) as DocumentRead[]);
    notify(documentId);
  }
}

function subscribeRealtime() {
  if (realtimeBound || typeof window === "undefined") return;
  realtimeBound = true;
  supabase
    .channel("tbl:document_reads")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "document_reads" },
      (payload) => {
        const row = (payload.new ?? payload.old) as DocumentRead;
        if (row?.document_id) hydrate(row.document_id);
      },
    )
    .subscribe();
}

export function listReads(documentId: string): DocumentRead[] {
  if (!cache.has(documentId)) {
    cache.set(documentId, []);
    hydrate(documentId);
    subscribeRealtime();
  }
  return cache.get(documentId) ?? [];
}

export function hasConfirmed(documentId: string, userEmail: string): boolean {
  return listReads(documentId).some((r) => r.user_email === userEmail);
}

export async function confirmRead(entry: {
  documentId: string;
  userId: string;
  userEmail: string;
  userName: string;
}) {
  const { error } = await (supabase as any).from("document_reads").upsert(
    {
      document_id: entry.documentId,
      user_id: entry.userId,
      user_email: entry.userEmail,
      user_name: entry.userName,
      confirmed_at: new Date().toISOString(),
    },
    { onConflict: "document_id,user_id" },
  );
  if (error) console.error("[document-reads] confirmRead:", error.message);
  await hydrate(entry.documentId);
}

/** Hook React — re-renderiza ao receber novas confirmações (local ou via Realtime). */
export function useDocumentReads(documentId: string): DocumentRead[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    const evt = `storage:document_reads:${documentId}`;
    window.addEventListener(evt, handler);
    listReads(documentId); // dispara hidratação se necessário
    return () => window.removeEventListener(evt, handler);
  }, [documentId]);
  return listReads(documentId);
}
