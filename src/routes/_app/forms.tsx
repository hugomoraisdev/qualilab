import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { forms as seedForms } from "@/lib/mock-data";
import { listForms, type CustomForm } from "@/lib/forms-store";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/forms")({ component: FormsPage });

function FormsPage() {
  const navigate = useNavigate();
  const [custom, setCustom] = useState<CustomForm[]>([]);

  useEffect(() => {
    const refresh = () => setCustom(listForms());
    refresh();
    const handler = () => refresh();
    window.addEventListener("storage:qualilab_custom_forms", handler);
    return () => window.removeEventListener("storage:qualilab_custom_forms", handler);
  }, []);

  const allRows = [
    ...custom.map((f) => ({
      id: f.id,
      name: f.title,
      responsible: f.responsible,
      periodicity: "Personalizado",
      fields: f.fields.length,
      responses: 0,
      lastResponse: "—",
      _custom: true,
    })),
    ...seedForms.map((f) => ({ ...f, _custom: false })),
  ];

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
        data={allRows}
        searchKeys={["id", "name", "responsible", "periodicity"]}
        hideNew
        exportName="formularios"
        onRowClick={(r) => navigate({ to: "/forms/$id", params: { id: r.id } })}
        columns={[
          { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          {
            key: "name", header: "Formulário",
            render: (r) => (
              <span className="font-medium inline-flex items-center gap-2">
                {r.name}
                {r._custom && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-primary/10 text-primary rounded px-1.5 py-0.5"><Sparkles className="size-2.5" /> criado</span>}
              </span>
            ),
          },
          { key: "responsible", header: "Responsável" },
          { key: "periodicity", header: "Periodicidade" },
          { key: "fields", header: "Campos" },
          { key: "responses", header: "Respostas" },
          { key: "lastResponse", header: "Última resposta" },
        ]}
      />

      {custom.length === 0 && (
        <div className="mt-4 text-xs text-muted-foreground">
          Dica: clique em <Link to="/forms/new" className="text-primary underline">Novo formulário</Link> para construir um formulário personalizado com campos arbitrários (texto, número, data, seleção…).
        </div>
      )}
    </>
  );
}
