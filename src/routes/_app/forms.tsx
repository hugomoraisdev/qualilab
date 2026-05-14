import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { useTableStore } from "@/lib/table-store";
import { formsStore, responsesStore } from "@/lib/forms-store";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/forms")({ component: FormsPage });

function FormsPage() {
  useAuditAccess("forms");
  const navigate = useNavigate();
  const forms = useTableStore(formsStore).filter((f) => !f.deleted_at);
  const responses = useTableStore(responsesStore);

  const rows = forms.map((f) => {
    const respsForForm = responses.filter((r) => r.form_id === f.id);
    const last = respsForForm.sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0];
    return {
      id: f.id,
      title: f.title,
      responsible: f.requires_approval ? `Aprovação: ${f.approvers.join(", ") || "—"}` : "Sem aprovação",
      fieldsCount: f.fields.length,
      responses: respsForForm.length,
      lastResponse: last ? new Date(last.submitted_at).toLocaleDateString("pt-BR") : "—",
    };
  });

  return (
    <>
      <PageHeader
        title="Formulários"
        description="Construtor de formulários personalizados, vinculáveis a processos e equipamentos"
        actions={
          <Button onClick={() => navigate({ to: "/forms/new" })}>
            <Plus className="size-4" /> Novo formulário
          </Button>
        }
      />

      <DataTable
        data={rows}
        searchKeys={["id", "title", "responsible"]}
        hideNew
        exportName="formularios"
        onRowClick={(r) => navigate({ to: "/forms/$id", params: { id: r.id } })}
        columns={[
          { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "title", header: "Formulário", render: (r) => <span className="font-medium">{r.title}</span> },
          { key: "responsible", header: "Aprovação" },
          { key: "fieldsCount", header: "Campos" },
          { key: "responses", header: "Respostas" },
          { key: "lastResponse", header: "Última resposta" },
        ]}
      />

      {forms.length === 0 && (
        <div className="mt-4 text-xs text-muted-foreground">
          Dica: clique em <Link to="/forms/new" className="text-primary underline">Novo formulário</Link> para construir um formulário personalizado.
        </div>
      )}
    </>
  );
}
