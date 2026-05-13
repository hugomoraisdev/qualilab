import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { competenciesStore } from "@/lib/competencies-store";
import { profilesStore, profileName } from "@/lib/profiles-store";
import { useTableStore } from "@/lib/table-store";

export const Route = createFileRoute("/_app/competencies")({ component: CompPage });

function CompPage() {
  const competencies = useTableStore(competenciesStore);
  useTableStore(profilesStore); // garante re-render quando perfis carregarem

  // Matriz de competências (colaborador × skill)
  const collaborators = Array.from(new Set(competencies.map((c) => c.user_id)));
  const allSkills = Array.from(new Set(competencies.map((c) => c.skill)));

  return (
    <>
      <PageHeader title="Competências" description="Matriz de competências e treinamentos da equipe" />

      {competencies.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6 overflow-x-auto">
          <h3 className="text-sm font-semibold mb-3">Matriz de competências</h3>
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left py-1.5 pr-3">Colaborador</th>
                {allSkills.map((s) => (
                  <th key={s} className="px-2 py-1.5 text-left font-medium text-muted-foreground" style={{ minWidth: 140 }}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {collaborators.map((uid) => (
                <tr key={uid} className="border-t border-border">
                  <td className="py-2 pr-3 font-medium">{profileName(uid)}</td>
                  {allSkills.map((s) => {
                    const item = competencies.find((x) => x.user_id === uid && x.skill === s);
                    return (
                      <td key={s} className="px-2 py-2">
                        {item ? <StatusBadge>{item.status}</StatusBadge> : <span className="text-muted-foreground">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DataTable
        data={competencies}
        searchKeys={["area", "skill", "level", "status"]}
        newLabel="Nova competência"
        columns={[
          { key: "user_id", header: "Colaborador", render: (r) => <span className="font-medium">{profileName(r.user_id)}</span> },
          { key: "area", header: "Área" },
          { key: "skill", header: "Competência" },
          { key: "level", header: "Nível" },
          { key: "certified_at", header: "Certificado em", render: (r) => r.certified_at ?? "—" },
          { key: "expires_at", header: "Expira em", render: (r) => r.expires_at ?? "—" },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
