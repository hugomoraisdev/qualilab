// Helper genérico — espelha CloudStore mas para tabelas dedicadas (Fase 2B).
// Hidrata via SELECT *, mantém cache em memória, sincroniza via Realtime.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export class TableStore<T extends { id: string }> {
  private cache: T[] = [];
  private hydrated = false;
  private channel: RealtimeChannel | null = null;
  readonly ready: Promise<void>;

  constructor(
    public readonly table: string,
    public readonly orderBy: string = "created_at",
    public readonly ascending: boolean = false,
  ) {
    this.ready = this.hydrate();
  }

  private async hydrate() {
    try {
      // cast: tabelas novas podem ainda não estar nos types gerados
      const { data, error } = await (supabase as any)
        .from(this.table)
        .select("*")
        .order(this.orderBy, { ascending: this.ascending });
      if (error) console.warn(`[table-store] hydrate ${this.table}:`, error.message);
      else this.cache = (data ?? []) as T[];
    } catch (err) {
      console.warn(`[table-store] hydrate ${this.table}:`, err);
    } finally {
      this.hydrated = true;
      this.notify();
      this.subscribeRealtime();
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
          this.notify();
        },
      )
      .subscribe();
  }

  list(): T[] { return this.cache; }
  isHydrated() { return this.hydrated; }

  async upsert(row: T): Promise<void> {
    this.cache = [row, ...this.cache.filter((r) => r.id !== row.id)];
    this.notify();
    const { error } = await (supabase as any).from(this.table).upsert(row);
    if (error) console.error(`[table-store] upsert ${this.table}:`, error.message);
  }

  async remove(id: string): Promise<void> {
    this.cache = this.cache.filter((r) => r.id !== id);
    this.notify();
    const { error } = await (supabase as any).from(this.table).delete().eq("id", id);
    if (error) console.error(`[table-store] delete ${this.table}:`, error.message);
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
