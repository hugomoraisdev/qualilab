// Metadados de formulários e respostas (vínculos com módulos e prazos)
// armazenados em `app_data` para evitar migração.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const LINKABLE_MODULES = [
  { value: "documents", label: "Documentos" },
  { value: "occurrences", label: "Ocorrências / NC" },
  { value: "risks", label: "Riscos" },
  { value: "audits", label: "Auditorias" },
  { value: "suppliers", label: "Fornecedores" },
  { value: "calibrations", label: "Calibrações" },
  { value: "equipments", label: "Equipamentos" },
  { value: "processes", label: "Processos" },
] as const;
export type LinkableModule = (typeof LINKABLE_MODULES)[number]["value"];

export interface FormMeta {
  form_id: string;
  linked_modules: LinkableModule[];
  deadline_days: number | null; // SLA em dias após envio
}

export interface ResponseMeta {
  response_id: string;
  linked_module: LinkableModule | null;
  linked_record_id: string | null;
  linked_record_label: string | null;
  deadline_at: string | null;
}

const FORM_KEY = "form-meta:all";
const RESP_KEY = "form-response-meta:all";

async function read<T>(key: string): Promise<T[]> {
  const { data } = await supabase.from("app_data").select("value").eq("key", key).maybeSingle();
  return ((data?.value as unknown as T[]) ?? []);
}
async function write<T>(key: string, list: T[], event: string) {
  const { error } = await supabase.from("app_data").upsert({ key, value: list as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(event));
}

export const readFormMeta = () => read<FormMeta>(FORM_KEY);
export const readResponseMeta = () => read<ResponseMeta>(RESP_KEY);

export async function upsertFormMeta(m: FormMeta) {
  const list = await readFormMeta();
  const idx = list.findIndex((x) => x.form_id === m.form_id);
  if (idx >= 0) list[idx] = m; else list.push(m);
  await write(FORM_KEY, list, "storage:form-meta");
}

export async function upsertResponseMeta(m: ResponseMeta) {
  const list = await readResponseMeta();
  const idx = list.findIndex((x) => x.response_id === m.response_id);
  if (idx >= 0) list[idx] = m; else list.push(m);
  await write(RESP_KEY, list, "storage:response-meta");
}

export function useFormMeta(formId?: string) {
  const [list, setList] = useState<FormMeta[]>([]);
  const load = async () => setList(await readFormMeta());
  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener("storage:form-meta", h);
    return () => window.removeEventListener("storage:form-meta", h);
  }, []);
  return {
    list,
    get: (id: string) => list.find((m) => m.form_id === id),
    current: formId ? list.find((m) => m.form_id === formId) : undefined,
    reload: load,
  };
}

export function useResponseMeta(formId?: string) {
  const [list, setList] = useState<ResponseMeta[]>([]);
  const [respFormMap, setMap] = useState<Record<string, ResponseMeta>>({});
  const load = async () => {
    const l = await readResponseMeta();
    setList(l);
    setMap(Object.fromEntries(l.map((m) => [m.response_id, m])));
  };
  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener("storage:response-meta", h);
    return () => window.removeEventListener("storage:response-meta", h);
  }, [formId]);
  return { list, byId: respFormMap, reload: load };
}
