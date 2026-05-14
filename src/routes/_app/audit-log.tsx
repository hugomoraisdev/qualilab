import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { auditLogStore } from "@/lib/audit-log-store";
import { useTableStore } from "@/lib/table-store";

export const Route = createFileRoute("/_app/audit-log")({ component: AuditLogPage });

function AuditLogPage() {
  const logs = useTableStore(auditLogStore);

  const rows = logs.map((l) => ({
    id: l.id,
    datetime: l.created_at
      ? new Date(l.created_at).toLocaleString("pt-BR")
      : "—",
    user: l.user_name ?? "—",
    module: l.module,
    action: l.action,
    record: l.record_label ?? l.record_id ?? "—",
    before: l.before_data ?? "—",
    after: l.after_data ?? "—",
  }));

  return (
    <>
      <PageHeader title="Log de Auditoria" description="Rastreabilidade de todas as ações realizadas no sistema" />
      <DataTable
        data={rows}
        searchKeys={["user", "action", "module", "record"]}
        newLabel="Exportar log"
        columns={[
          { key: "datetime", header: "Data e hora", render: (r) => <span className="font-mono text-xs">{r.datetime}</span> },
          { key: "user", header: "Usuário" },
          { key: "module", header: "Módulo" },
          { key: "action", header: "Ação", render: (r) => <span className="font-medium">{r.action}</span> },
          { key: "record", header: "Registro", render: (r) => <span className="font-mono text-xs">{r.record}</span> },
          { key: "before", header: "Anterior", render: (r) => <span className="text-xs text-muted-foreground">{r.before}</span> },
          { key: "after", header: "Novo", render: (r) => <span className="text-xs">{r.after}</span> },
        ]}
      />
    </>
  );
}
