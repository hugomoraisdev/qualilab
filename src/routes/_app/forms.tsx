import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { forms } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/forms")({ component: FormsPage });

function FormsPage() {
  return (
    <>
      <PageHeader title="Formulários" description="Construtor de formulários personalizados, vinculáveis a processos e equipamentos" />
      <DataTable
        data={forms}
        searchKeys={["id", "name", "responsible", "periodicity"]}
        newLabel="Novo formulário"
        columns={[
          { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "name", header: "Formulário", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "responsible", header: "Responsável" },
          { key: "periodicity", header: "Periodicidade" },
          { key: "fields", header: "Campos" },
          { key: "responses", header: "Respostas" },
          { key: "lastResponse", header: "Última resposta" },
        ]}
      />
    </>
  );
}
