// Engine de campos personalizados — começando pelo módulo Documentos.
// Definições gravadas em `app_data` com chave `custom-fields:<scope>`.
//
// Os VALORES por documento continuam em `document_meta.custom_fields`
// (ver document-meta-store), agora aceitando string | string[] | boolean | number.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CustomFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "checkbox"
  | "attachment"
  | "user"
  | "sector"
  | "process"
  | "unit"
  | "status";

export interface CustomFieldDef {
  id: string;
  /** Rótulo apresentado ao usuário. */
  name: string;
  /** Chave estável usada como índice em `custom_fields`. */
  key: string;
  type: CustomFieldType;
  required: boolean;
  order: number;
  active: boolean;
  /** Opções aplicáveis aos tipos `select` e `multiselect`. */
  options?: string[];
  /** Restrição de visibilidade por papel (admin, gestor, tecnico, auditor, consulta). */
  visibleRoles?: string[];
  description?: string;
}

export type CustomFieldValue = string | string[] | boolean | number | null;

export type CustomFieldScope = "documents" | "sac";

const keyFor = (scope: CustomFieldScope) => `custom-fields:${scope}`;

export async function listCustomFields(scope: CustomFieldScope): Promise<CustomFieldDef[]> {
  const { data, error } = await supabase
    .from("app_data")
    .select("value")
    .eq("key", keyFor(scope))
    .maybeSingle();
  if (error) {
    console.warn("[custom-fields] read:", error.message);
    return [];
  }
  if (!data) return [];
  const arr = (data.value as CustomFieldDef[] | null) ?? [];
  return [...arr].sort((a, b) => a.order - b.order);
}

async function writeAll(scope: CustomFieldScope, fields: CustomFieldDef[]) {
  const { error } = await supabase
    .from("app_data")
    .upsert({ key: keyFor(scope), value: fields as never });
  if (error) throw error;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(`storage:custom-fields:${scope}`));
  }
}

export async function saveCustomField(scope: CustomFieldScope, field: CustomFieldDef) {
  const all = await listCustomFields(scope);
  const next = all.some((f) => f.id === field.id)
    ? all.map((f) => (f.id === field.id ? field : f))
    : [...all, field];
  next.sort((a, b) => a.order - b.order);
  await writeAll(scope, next);
}

export async function deleteCustomField(scope: CustomFieldScope, id: string) {
  const all = await listCustomFields(scope);
  await writeAll(
    scope,
    all.filter((f) => f.id !== id),
  );
}

export async function reorderCustomFields(scope: CustomFieldScope, ids: string[]) {
  const all = await listCustomFields(scope);
  const next = all.map((f) => ({ ...f, order: ids.indexOf(f.id) }));
  next.sort((a, b) => a.order - b.order);
  await writeAll(scope, next);
}

/** Hook reativo. */
export function useCustomFields(scope: CustomFieldScope): CustomFieldDef[] {
  const [fields, setFields] = useState<CustomFieldDef[]>([]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const f = await listCustomFields(scope);
      if (!cancelled) setFields(f);
    };
    void refresh();

    const handler = () => {
      void refresh();
    };
    window.addEventListener(`storage:custom-fields:${scope}`, handler);
    const channel = supabase
      .channel(`cf:${scope}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_data", filter: `key=eq.${keyFor(scope)}` },
        () => {
          void refresh();
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      window.removeEventListener(`storage:custom-fields:${scope}`, handler);
      supabase.removeChannel(channel);
    };
  }, [scope]);

  return fields;
}

/** Slugify simples para gerar `key` a partir do `name`. */
export function slugifyFieldKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}
