import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";

interface AuditUser { id: string; name: string; email: string; }

let _currentUser: AuditUser | null = null;

export function setAuditUser(user: AuditUser | null) {
  _currentUser = user;
}

export function logAudit(params: {
  module: string;
  action: string;
  record_id?: string | null;
  record_label?: string | null;
  before?: unknown;
  after?: unknown;
}): void {
  const user = _currentUser;
  void (supabase as any).from("audit_logs").insert({
    actor_id: user?.id ?? null,
    actor_name: user?.name ?? null,
    actor_email: user?.email ?? null,
    module: params.module,
    action: params.action,
    record_id: params.record_id ?? null,
    record_label: params.record_label ?? null,
    before: params.before ?? null,
    after: params.after ?? null,
  });
}

export function useAuditAccess(module: string, label?: string) {
  const logged = useRef(false);
  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logAudit({ module, action: "viewed", record_label: label ?? module });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
