// Helper genérico — espelha CloudStore mas para tabelas dedicadas (Fase 2B).
// Hidrata via SELECT *, mantém cache em memória, sincroniza via Realtime.
//
// Suporte offline (Fase Auditorias):
// - Cache espelhado em localStorage por tabela (`tbl-cache:<table>`) para
//   navegação imediata quando o usuário entra sem rede.
// - Mutações (upsert/delete) que falham ou ocorrem offline são persistidas
//   numa fila (`tbl-queue:<table>`) e re-enviadas automaticamente quando o
//   navegador volta a ficar online ou quando o store é re-hidratado.

import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { logAudit } from "@/lib/audit";

type QueueOp<T> =
  | { kind: "upsert"; row: T; ts: number }
  | { kind: "delete"; id: string; ts: number };

const onlineListeners = new Set<() => void>();
function notifyOnline() { onlineListeners.forEach((fn) => fn()); }
if (typeof window !== "undefined") {
  window.addEventListener("online", notifyOnline);
  window.addEventListener("offline", notifyOnline);
}

export class TableStore<T extends { id: string }> {
  private cache: T[] = [];
  private hydrated = false;
  private channel: RealtimeChannel | null = null;
  private queue: QueueOp<T>[] = [];
  private flushing = false;
  readonly ready: Promise<void>;

  constructor(
    public readonly table: string,
    public readonly orderBy: string = "created_at",
    public readonly ascending: boolean = false,
  ) {
    // hidrata cache imediato do localStorage para uso offline
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(`tbl-cache:${this.table}`);
        if (raw) this.cache = JSON.parse(raw) as T[];
        const q = window.localStorage.getItem(`tbl-queue:${this.table}`);
        if (q) this.queue = JSON.parse(q) as QueueOp<T>[];
      } catch { /* ignore */ }
      window.addEventListener("online", () => this.flushQueue());
    }
    this.ready = this.hydrate();
  }

  private persistCache() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`tbl-cache:${this.table}`, JSON.stringify(this.cache));
    } catch { /* quota — ignore */ }
  }

  private persistQueue() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`tbl-queue:${this.table}`, JSON.stringify(this.queue));
    } catch { /* ignore */ }
  }

  private async hydrate() {
    try {
      const { data, error } = await (supabase as any)
        .from(this.table)
        .select("*")
        .order(this.orderBy, { ascending: this.ascending });
      if (error) {
        console.warn(`[table-store] hydrate ${this.table}:`, error.message);
      } else {
        // mantém mutações pendentes aplicadas em cima dos dados do servidor
        let merged = (data ?? []) as T[];
        for (const op of this.queue) {
          if (op.kind === "upsert") {
            merged = [op.row, ...merged.filter((r) => r.id !== op.row.id)];
          } else {
            merged = merged.filter((r) => r.id !== op.id);
          }
        }
        this.cache = merged;
        this.persistCache();
      }
    } catch (err) {
      console.warn(`[table-store] hydrate ${this.table}:`, err);
    } finally {
      this.hydrated = true;
      this.notify();
      this.subscribeRealtime();
      // tenta drenar fila ao subir
      void this.flushQueue();
    }
  }

  private subscribeRealtime() {
    if (typeof window === "undefined" || this.channel) return;
    this.channel = supabase
      .channel(`tbl:${this.table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: this.table },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as T;
            this.cache = [row, ...this.cache.filter((r) => r.id !== row.id)];
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as T;
            this.cache = this.cache.map((r) => (r.id === row.id ? row : r));
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as Partial<T>;
            this.cache = this.cache.filter((r) => r.id !== (old as T).id);
          }
          this.persistCache();
          this.notify();
        },
      )
      .subscribe();
  }

  list(): T[] { return this.cache; }
  isHydrated() { return this.hydrated; }
  pendingCount(): number { return this.queue.length; }

  private isOffline(): boolean {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  }

  private enqueue(op: QueueOp<T>) {
    // dedup: para upsert/delete do mesmo id, mantém a operação mais recente
    this.queue = this.queue.filter((q) => {
      const qid = q.kind === "upsert" ? q.row.id : q.id;
      const oid = op.kind === "upsert" ? op.row.id : op.id;
      return qid !== oid;
    });
    this.queue.push(op);
    this.persistQueue();
    this.notify();
  }

  async upsert(row: T): Promise<void> {
    const isCreate = !this.cache.some((r) => r.id === row.id);
    this.cache = [row, ...this.cache.filter((r) => r.id !== row.id)];
    this.persistCache();
    this.notify();
    const r = row as Record<string, unknown>;
    const label = String(r.name ?? r.title ?? r.description ?? r.code ?? row.id ?? "");
    logAudit({ module: this.table, action: isCreate ? "created" : "updated", record_id: row.id, record_label: label || null });
    if (this.isOffline()) {
      this.enqueue({ kind: "upsert", row, ts: Date.now() });
      return;
    }
    const { error } = await (supabase as any).from(this.table).upsert(row);
    if (error) {
      console.warn(`[table-store] upsert ${this.table}:`, error.message);
    }
  }

  async remove(id: string): Promise<void> {
    const existing = this.cache.find((r) => r.id === id) as Record<string, unknown> | undefined;
    const label = existing ? String(existing.name ?? existing.title ?? existing.description ?? existing.code ?? id) : id;
    this.cache = this.cache.filter((r) => r.id !== id);
    this.persistCache();
    this.notify();
    logAudit({ module: this.table, action: "deleted", record_id: id, record_label: label });
    if (this.isOffline()) {
      this.enqueue({ kind: "delete", id, ts: Date.now() });
      return;
    }
    const { error } = await (supabase as any).from(this.table).delete().eq("id", id);
    if (error) {
      console.warn(`[table-store] delete ${this.table}:`, error.message);
    }
  }

  async flushQueue(): Promise<void> {
    if (this.flushing || this.queue.length === 0 || this.isOffline()) return;
    this.flushing = true;
    try {
      const pending = [...this.queue];
      for (const op of pending) {
        try {
          if (op.kind === "upsert") {
            const { error } = await (supabase as any).from(this.table).upsert(op.row);
            if (error) throw new Error(error.message);
          } else {
            const { error } = await (supabase as any).from(this.table).delete().eq("id", op.id);
            if (error) throw new Error(error.message);
          }
          this.queue = this.queue.filter((q) => q !== op);
          this.persistQueue();
          this.notify();
        } catch (err) {
          console.warn(`[table-store] flush ${this.table} descartando item:`, err);
          this.queue = this.queue.filter((q) => q !== op);
          this.persistQueue();
          this.notify();
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  private notify() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(`storage:${this.table}`));
    }
  }
}

export function createTableStore<T extends { id: string }>(
  table: string,
  orderBy?: string,
  ascending?: boolean,
) {
  return new TableStore<T>(table, orderBy, ascending);
}

/** Hook React: re-renderiza quando o store recebe atualizações (insert/update/delete/realtime). */
export function useTableStore<T extends { id: string }>(store: TableStore<T>): T[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener(`storage:${store.table}`, handler);
    return () => window.removeEventListener(`storage:${store.table}`, handler);
  }, [store]);
  return store.list();
}

/** Hook: status de conectividade + nº de mutações pendentes (somando vários stores). */
export function useOfflineStatus(stores: TableStore<any>[] = []) {
  const subscribe = (cb: () => void) => {
    onlineListeners.add(cb);
    const offs = stores.map((s) => {
      const handler = () => cb();
      window.addEventListener(`storage:${s.table}`, handler);
      return () => window.removeEventListener(`storage:${s.table}`, handler);
    });
    return () => {
      onlineListeners.delete(cb);
      offs.forEach((fn) => fn());
    };
  };
  const getSnapshot = () => {
    const online = typeof navigator === "undefined" ? true : navigator.onLine;
    const pending = stores.reduce((acc, s) => acc + s.pendingCount(), 0);
    return `${online ? "1" : "0"}:${pending}`;
  };
  const getServerSnapshot = () => "1:0";
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [onlineStr, pendingStr] = snap.split(":");
  return { online: onlineStr === "1", pending: Number(pendingStr) };
}
