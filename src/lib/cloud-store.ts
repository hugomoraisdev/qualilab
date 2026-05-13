// Cloud-backed key-value store que substitui localStorage por Supabase + Realtime.
// Mantém um cache em memória, expõe leitura síncrona, escrita assíncrona,
// e dispara o mesmo evento window `storage:KEY` que o app já consome — assim
// nenhum consumidor precisa ser alterado.

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const TABLE = "app_data";

class CloudStore<T> {
  private cache: T;
  private hydrated = false;
  private channel: RealtimeChannel | null = null;
  private subscribers = new Set<() => void>();
  readonly ready: Promise<void>;

  constructor(public readonly key: string, public readonly initial: T) {
    this.cache = initial;
    this.ready = this.hydrate();
  }

  private async hydrate() {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("value")
        .eq("key", this.key)
        .maybeSingle();
      if (error) {
        console.warn(`[cloud-store] hydrate ${this.key} falhou:`, error.message);
      } else if (data) {
        this.cache = data.value as T;
      } else if (typeof window !== "undefined") {
        // primeira execução — semeia banco com initial
        await supabase.from(TABLE).upsert({
          key: this.key,
          value: this.initial as never,
        });
      }
    } catch (err) {
      console.warn(`[cloud-store] hydrate ${this.key}:`, err);
    } finally {
      this.hydrated = true;
      this.notify();
      this.subscribeRealtime();
    }
  }

  private subscribeRealtime() {
    if (typeof window === "undefined" || this.channel) return;
    this.channel = supabase
      .channel(`app_data:${this.key}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE, filter: `key=eq.${this.key}` },
        (payload) => {
          const value = (payload.new as { value?: T } | null)?.value;
          if (value !== undefined) {
            this.cache = value;
            this.notify();
          }
        },
      )
      .subscribe();
  }

  get(): T {
    return this.cache;
  }

  isHydrated() {
    return this.hydrated;
  }

  async set(value: T): Promise<void> {
    this.cache = value;
    this.notify();
    const { error } = await supabase
      .from(TABLE)
      .upsert({ key: this.key, value: value as never });
    if (error) {
      console.error(`[cloud-store] set ${this.key} falhou:`, error.message);
    }
  }

  /** Atualiza usando função pure — útil para mutações otimistas concorrentes. */
  async update(fn: (prev: T) => T): Promise<void> {
    return this.set(fn(this.cache));
  }

  subscribe(listener: () => void): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private notify() {
    this.subscribers.forEach((fn) => fn());
    if (typeof window !== "undefined") {
      // contrato existente do app — páginas já escutam este evento
      window.dispatchEvent(new Event(`storage:${this.key}`));
    }
  }
}

export function createCloudStore<T>(key: string, initial: T) {
  return new CloudStore<T>(key, initial);
}

export type { CloudStore };
