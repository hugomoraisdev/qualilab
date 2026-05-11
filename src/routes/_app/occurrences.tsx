import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { occurrences } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/occurrences")({ component: OccPage });

function OccPage() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="Ocorrências e Não Conformidades" description="Tratamento de NCs, reclamações, desvios e oportunidades de melhoria" />
      <DataTable
        data={occurrences}
        searchKeys={["id", "type", "origin", "description", "responsible", "status"]}
        newLabel="Nova ocorrência"
        exportName="ocorrencias"
        onRowClick={(r) => navigate({ to: "/occurrences/$id", params: { id: r.id } })}
        columns={[
          { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "type", header: "Tipo" },
          { key: "origin", header: "Origem" },
          { key: "description", header: "Descrição", render: (r) => <span className="max-w-md truncate inline-block">{r.description}</span> },
          { key: "date", header: "Identificada em" },
          { key: "responsible", header: "Responsável" },
          { key: "severity", header: "Severidade", render: (r) => <StatusBadge>{r.severity}</StatusBadge> },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
