// Metadados estendidos por achado de auditoria (evidências e link de plano de
// ação) e templates de checklist reutilizáveis. Persistido em `app_data`,
// seguindo o mesmo padrão do `document-meta-store`.
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AuditFindingMeta {
  evidence_urls: string[];
  evidence_notes: string | null;
  action_plan_id: string | null;
  responsible: string | null;
  deadline: string | null;
}

export const emptyFindingMeta = (): AuditFindingMeta => ({
  evidence_urls: [],
  evidence_notes: null,
  action_plan_id: null,
  responsible: null,
  deadline: null,
});

const findingKey = (id: string) => `audit-finding-meta:${id}`;
const TEMPLATES_KEY = "audit-checklist-templates";

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  requirements: string[];
  created_at: string;
}

// ---- Findings meta ----

async function readFindingMeta(id: string): Promise<AuditFindingMeta> {
  const { data } = await supabase.from("app_data").select("value").eq("key", findingKey(id)).maybeSingle();
  if (!data) return emptyFindingMeta();
  return { ...emptyFindingMeta(), ...(data.value as Partial<AuditFindingMeta>) };
}

async function writeFindingMeta(id: string, meta: AuditFindingMeta): Promise<void> {
  const { error } = await supabase.from("app_data").upsert({ key: findingKey(id), value: meta as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(`storage:audit-finding-meta:${id}`));
}

export async function updateFindingMeta(id: string, updater: (prev: AuditFindingMeta) => AuditFindingMeta) {
  const prev = await readFindingMeta(id);
  const next = updater(prev);
  await writeFindingMeta(id, next);
  return next;
}

export function useAllFindingMeta(findingIds: string[]): Record<string, AuditFindingMeta> {
  const [map, setMap] = useState<Record<string, AuditFindingMeta>>({});
  const joinKey = findingIds.join("|");
  const channelName = useRef(`audit-finding-meta-bulk:${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (findingIds.length === 0) { setMap({}); return; }
    let cancelled = false;
    const keys = findingIds.map(findingKey);
    const load = async () => {
      const { data } = await supabase.from("app_data").select("key,value").in("key", keys);
      if (cancelled) return;
      const out: Record<string, AuditFindingMeta> = {};
      for (const id of findingIds) {
        const row = data?.find((r) => r.key === findingKey(id));
        out[id] = row ? { ...emptyFindingMeta(), ...(row.value as Partial<AuditFindingMeta>) } : emptyFindingMeta();
      }
      setMap(out);
    };
    void load();
    const onChange = () => { void load(); };
    findingIds.forEach((id) => window.addEventListener(`storage:audit-finding-meta:${id}`, onChange));
    const channel = supabase
      .channel(channelName.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data" }, () => { void load(); })
      .subscribe();
    return () => {
      cancelled = true;
      findingIds.forEach((id) => window.removeEventListener(`storage:audit-finding-meta:${id}`, onChange));
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinKey]);

  return map;
}

// ---- Checklist templates ----

export async function listTemplates(): Promise<ChecklistTemplate[]> {
  const { data } = await supabase.from("app_data").select("value").eq("key", TEMPLATES_KEY).maybeSingle();
  if (!data) return [];
  const list = (data.value as { templates?: ChecklistTemplate[] })?.templates;
  return Array.isArray(list) ? list : [];
}

async function writeTemplates(templates: ChecklistTemplate[]) {
  const { error } = await supabase.from("app_data").upsert({ key: TEMPLATES_KEY, value: { templates } as never });
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("storage:audit-templates"));
}

export async function saveTemplate(t: ChecklistTemplate) {
  const all = await listTemplates();
  const idx = all.findIndex((x) => x.id === t.id);
  if (idx >= 0) all[idx] = t; else all.push(t);
  await writeTemplates(all);
}

export async function deleteTemplate(id: string) {
  const all = (await listTemplates()).filter((t) => t.id !== id);
  await writeTemplates(all);
}

export function useChecklistTemplates(): ChecklistTemplate[] {
  const [list, setList] = useState<ChecklistTemplate[]>([]);
  const channelName2 = useRef(`audit-templates:${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const t = await listTemplates();
      if (!cancelled) setList(t);
    };
    void load();
    const handler = () => { void load(); };
    window.addEventListener("storage:audit-templates", handler);
    const channel = supabase
      .channel(channelName2.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data", filter: `key=eq.${TEMPLATES_KEY}` }, () => { void load(); })
      .subscribe();
    return () => {
      cancelled = true;
      window.removeEventListener("storage:audit-templates", handler);
      supabase.removeChannel(channel);
    };
  }, []);
  return list;
}
