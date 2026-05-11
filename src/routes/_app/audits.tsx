import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { audits } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/audits")({ component: AuditsPage });

function AuditsPage() {
  return (
    <>
      <PageHeader title="Auditorias" description="Auditorias internas e externas com checklist e achados" />
      <DataTable
        data={audits}
        searchKeys={["id", "scope", "auditor", "area", "status", "type"]}
        newLabel="Nova auditoria"
        columns={[
          { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "type", header: "Tipo", render: (r) => <StatusBadge tone="info">{r.type}</StatusBadge> },
          { key: "scope", header: "Escopo", render: (r) => <span className="font-medium">{r.scope}</span> },
          { key: "area", header: "Área" },
          { key: "auditor", header: "Auditor" },
          { key: "planned", header: "Planejada" },
          { key: "performed", header: "Realizada" },
          { key: "findings", header: "Achados" },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
