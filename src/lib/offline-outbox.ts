// Outbox local para gravações offline.
// Persistência em IndexedDB; reenvia em ordem ao reconectar.
import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "qualilab-offline";
const STORE = "outbox";
const DB_VERSION = 1;

export type OutboxOp = {
  id?: number;
  createdAt: number;
  table: string;
  action: "insert" | "update" | "delete" | "upsert";
  payload?: Record<string, unknown> | Record<string, unknown>[];
  match?: Record<string, unknown>; // para update/delete
  label?: string; // texto amigável
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | Promise<T>): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const r = fn(store);
    if (r instanceof IDBRequest) {
      r.onsuccess = () => resolve(r.result as T);
      r.onerror = () => reject(r.error);
    } else {
      Promise.resolve(r).then(resolve, reject);
    }
  });
}

export async function enqueue(op: Omit<OutboxOp, "id" | "createdAt">): Promise<void> {
  await tx<IDBValidKey>("readwrite", (s) => s.add({ ...op, createdAt: Date.now() }));
  notifyChange();
}

export async function listOutbox(): Promise<OutboxOp[]> {
  return tx<OutboxOp[]>("readonly", (s) => s.getAll() as IDBRequest<OutboxOp[]>);
}

export async function clearOne(id: number): Promise<void> {
  await tx<undefined>("readwrite", (s) => s.delete(id) as IDBRequest<undefined>);
  notifyChange();
}

export async function countOutbox(): Promise<number> {
  return tx<number>("readonly", (s) => s.count() as IDBRequest<number>);
}

async function applyOp(op: OutboxOp): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = (supabase as any).from(op.table);
  if (op.action === "insert") {
    const { error } = await q.insert(op.payload);
    if (error) throw error;
  } else if (op.action === "upsert") {
    const { error } = await q.upsert(op.payload);
    if (error) throw error;
  } else if (op.action === "update") {
    let r = q.update(op.payload);
    for (const [k, v] of Object.entries(op.match ?? {})) r = r.eq(k, v);
    const { error } = await r;
    if (error) throw error;
  } else if (op.action === "delete") {
    let r = q.delete();
    for (const [k, v] of Object.entries(op.match ?? {})) r = r.eq(k, v);
    const { error } = await r;
    if (error) throw error;
  }
}

let flushing = false;
export async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  if (flushing || !navigator.onLine) return { sent: 0, failed: 0 };
  flushing = true;
  let sent = 0;
  let failed = 0;
  try {
    const ops = (await listOutbox()).sort((a, b) => a.createdAt - b.createdAt);
    for (const op of ops) {
      try {
        await applyOp(op);
        if (op.id != null) await clearOne(op.id);
        sent++;
      } catch (e) {
        console.warn("[outbox] falha ao reenviar, mantendo na fila:", e);
        failed++;
        break; // mantém ordem; tenta de novo depois
      }
    }
  } finally {
    flushing = false;
  }
  return { sent, failed };
}

// Pub/sub simples para a UI reagir
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
function notifyChange() {
  listeners.forEach((l) => {
    try { l(); } catch { /* noop */ }
  });
}

// Auto-sync quando voltar a conexão
if (typeof window !== "undefined") {
  window.addEventListener("online", () => { void flushOutbox().then(notifyChange); });
}
