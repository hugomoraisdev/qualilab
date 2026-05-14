// Logs de auditoria — leitura da tabela audit_logs no Supabase.
import { createTableStore } from "./table-store";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  user_name: string | null;
  module: string;
  action: string;
  record_id: string | null;
  record_label: string | null;
  before_data: string | null;
  after_data: string | null;
  created_at?: string;
}

export const auditLogStore = createTableStore<AuditLogRow>("audit_logs", "created_at", false);

export const listAuditLogs = () => auditLogStore.list();

export async function logAuditAction(params: {
  module: string;
  action: string;
  record_id?: string;
  record_label?: string;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let userName: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      userName = profile?.name ?? user.email ?? null;
    }
    await auditLogStore.upsert({
      id: crypto.randomUUID(),
      user_id: user?.id ?? null,
      user_name: userName,
      module: params.module,
      action: params.action,
      record_id: params.record_id ?? null,
      record_label: params.record_label ?? null,
      before_data: null,
      after_data: null,
    });
  } catch {
    // log falha silenciosa — não bloqueia a operação principal
  }
}
