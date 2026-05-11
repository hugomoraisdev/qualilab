import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { actionPlans } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/action-plans")({ component: APPage });

function APPage() {
  return (
    <>
      <PageHeader title="Planos de Ação" description="Ações vinculadas a ocorrências, riscos, auditorias, fornecedores e calibrações" />
      <DataTable
        data={actionPlans}
        searchKeys={["id", "origin", "description", "responsible", "status", "priority"]}
        newLabel="Novo plano"
        columns={[
          { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "origin", header: "Origem", render: (r) => <span className="font-mono text-xs">{r.origin}</span> },
          { key: "description", header: "Ação", render: (r) => <span className="max-w-md truncate inline-block">{r.description}</span> },
          { key: "responsible", header: "Responsável" },
          { key: "deadline", header: "Prazo" },
          { key: "priority", header: "Prioridade", render: (r) => <StatusBadge>{r.priority}</StatusBadge> },
          { key: "progress", header: "Progresso", render: (r) => (
            <div className="flex items-center gap-2 min-w-[120px]">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${r.progress}%` }} /></div>
              <span className="text-xs font-mono">{r.progress}%</span>
            </div>
          )},
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
