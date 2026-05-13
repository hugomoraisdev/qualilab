// Confirmações de leitura de documentos — Lovable Cloud.

import { createCloudStore } from "./cloud-store";

export interface DocumentRead {
  documentId: string;
  userEmail: string;
  userName: string;
  confirmedAt: string;
}

const KEY = "qualilab_document_reads";
const store = createCloudStore<DocumentRead[]>(KEY, []);

export function listReads(documentId: string): DocumentRead[] {
  return store.get().filter((r) => r.documentId === documentId);
}

export function hasConfirmed(documentId: string, userEmail: string): boolean {
  return store.get().some((r) => r.documentId === documentId && r.userEmail === userEmail);
}

export function confirmRead(entry: DocumentRead) {
  if (hasConfirmed(entry.documentId, entry.userEmail)) return;
  const all = store.get();
  all.unshift(entry);
  void store.set(all);
}
