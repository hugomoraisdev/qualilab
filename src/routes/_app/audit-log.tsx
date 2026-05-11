import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { auditLogs } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/audit-log")({ component: AuditLogPage });

function AuditLogPage() {
  return (
    <>
      <PageHeader title="Log de Auditoria" description="Rastreabilidade de todas as ações realizadas no sistema" />
      <DataTable
        data={auditLogs}
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
