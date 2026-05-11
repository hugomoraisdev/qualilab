import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { competencies } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/competencies")({ component: CompPage });

function CompPage() {
  // Matriz de competências (colaborador × competência)
  const collaborators = Array.from(new Set(competencies.map(c => c.collaborator)));
  const allComps = Array.from(new Set(competencies.map(c => c.competence)));

  return (
    <>
      <PageHeader title="Competências" description="Matriz de competências e treinamentos da equipe" />

      <div className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6 overflow-x-auto">
        <h3 className="text-sm font-semibold mb-3">Matriz de competências</h3>
        <table className="w-full text-xs">
          <thead>
            <tr><th className="text-left py-1.5 pr-3">Colaborador</th>
              {allComps.map(c => <th key={c} className="px-2 py-1.5 text-left font-medium text-muted-foreground" style={{minWidth:140}}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {collaborators.map(col => (
              <tr key={col} className="border-t border-border">
                <td className="py-2 pr-3 font-medium">{col}</td>
                {allComps.map(c => {
                  const item = competencies.find(x => x.collaborator === col && x.competence === c);
                  return <td key={c} className="px-2 py-2">{item ? <StatusBadge>{item.status}</StatusBadge> : <span className="text-muted-foreground">—</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DataTable
        data={competencies}
        searchKeys={["id", "collaborator", "role", "competence", "training", "status"]}
        newLabel="Nova competência"
        columns={[
          { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "collaborator", header: "Colaborador", render: (r) => <span className="font-medium">{r.collaborator}</span> },
          { key: "role", header: "Função" },
          { key: "competence", header: "Competência" },
          { key: "training", header: "Treinamento" },
          { key: "date", header: "Realizado" },
          { key: "validity", header: "Validade" },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
