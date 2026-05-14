// Auditorias e achados — Fase 2B (tabelas dedicadas).
import { createTableStore } from "./table-store";
import { logAuditAction } from "./audit-log-store";

export interface AuditRow {
  id: string;
  code: string | null;
  type: string;
  scope: string;
  area: string | null;
  auditor_id: string | null;
  auditor_name: string | null;
  planned_at: string | null;
  performed_at: string | null;
  status: string;
  findings_count: number;
  notes: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuditFindingRow {
  id: string;
  audit_id: string;
  requirement: string;
  result: string;
  severity: string | null;
  observation: string | null;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export const auditsStore = createTableStore<AuditRow>("audits", "created_at", false);
export const auditFindingsStore = createTableStore<AuditFindingRow>("audit_findings", "position", true);

export const listAudits = () => auditsStore.list();
export const getAudit = (id: string) => auditsStore.list().find((a) => a.id === id);
export const saveAudit = async (a: AuditRow) => {
  const result = await auditsStore.upsert(a);
  void logAuditAction({ module: "Auditorias", action: "Salvou", record_id: a.id, record_label: a.scope });
  return result;
};
export const deleteAudit = async (id: string) => {
  const a = auditsStore.list().find((x) => x.id === id);
  const result = await auditsStore.remove(id);
  void logAuditAction({ module: "Auditorias", action: "Excluiu", record_id: id, record_label: a?.scope });
  return result;
};

export const listFindings = (auditId?: string) => {
  const all = auditFindingsStore.list();
  return auditId ? all.filter((f) => f.audit_id === auditId) : all;
};
export const saveFinding = (f: AuditFindingRow) => auditFindingsStore.upsert(f);
export const deleteFinding = (id: string) => auditFindingsStore.remove(id);

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
