// Confirmações de leitura de documentos (POC) — persistido em localStorage.

export interface DocumentRead {
  documentId: string;
  userEmail: string;
  userName: string;
  confirmedAt: string;
}

const KEY = "qualilab_document_reads";

function read(): DocumentRead[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(all: DocumentRead[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event(`storage:${KEY}`));
}

export function listReads(documentId: string): DocumentRead[] {
  return read().filter((r) => r.documentId === documentId);
}

export function hasConfirmed(documentId: string, userEmail: string): boolean {
  return read().some((r) => r.documentId === documentId && r.userEmail === userEmail);
}

export function confirmRead(entry: DocumentRead) {
  if (hasConfirmed(entry.documentId, entry.userEmail)) return;
  const all = read();
  all.unshift(entry);
  write(all);
}
